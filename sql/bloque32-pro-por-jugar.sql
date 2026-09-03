-- Plan Pro 1 mes si un profesional llega a 10.000 en UNA partida de Jugá.
-- El usuario no se puede poner Pro solo: lo hace esta función.
-- A los 30 días vuelve a Gratis Verificado.

alter table public.perfiles add column if not exists plan_hasta timestamptz;
alter table public.perfiles add column if not exists pro_juego_en timestamptz;

create or replace function public.proteger_uso_activado()
returns trigger
language plpgsql
as $$
begin
  if auth.role() is distinct from 'service_role'
     and coalesce(current_setting('app.recalculo_puntaje', true), 'off') <> 'on'
     and not public.soy_admin() then
    new.uso_activado := old.uso_activado;
    new.uso_activado_en := old.uso_activado_en;
    new.plan := old.plan;
    new.plan_hasta := old.plan_hasta;
    new.pro_juego_en := old.pro_juego_en;
  end if;
  return new;
end;
$$;

create or replace function public.activar_plan(p_usuario uuid, p_plan text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := p_plan;
begin
  if not public.soy_admin() then
    raise exception 'Solo el administrador puede activar planes';
  end if;
  if v_plan = 'verificado' then v_plan := 'gratis'; end if;
  if v_plan not in ('gratis', 'pro') then
    raise exception 'Ese plan no existe';
  end if;
  perform set_config('app.recalculo_puntaje', 'on', true);
  update public.perfiles
     set plan = v_plan,
         plan_hasta = null
   where id = p_usuario;
  if not found then raise exception 'Ese usuario no existe'; end if;
  update public.interes_plan
     set estado = 'activado', cerrado_en = now()
   where usuario_id = p_usuario and estado = 'pendiente';
  return json_build_object('ok', true, 'plan', v_plan);
end;
$$;

create or replace function public.vencer_planes_juego()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_hasta timestamptz;
  v_juego timestamptz;
begin
  perform set_config('app.recalculo_puntaje', 'on', true);
  update public.perfiles
     set plan = 'gratis',
         plan_hasta = null
   where plan = 'pro'
     and plan_hasta is not null
     and plan_hasta < now();

  if v_uid is null then
    return json_build_object('ok', true);
  end if;

  select plan, plan_hasta, pro_juego_en
    into v_plan, v_hasta, v_juego
    from public.perfiles
   where id = v_uid;

  return json_build_object(
    'ok', true,
    'plan', coalesce(v_plan, 'gratis'),
    'plan_hasta', v_hasta,
    'pro_juego_en', v_juego
  );
end;
$$;

create or replace function public.pro_por_jugar(p_score integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p public.perfiles%rowtype;
  v_hasta timestamptz;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'motivo', 'sin_sesion');
  end if;
  if coalesce(p_score, 0) < 10000 then
    return json_build_object('ok', false, 'motivo', 'score');
  end if;

  perform set_config('app.recalculo_puntaje', 'on', true);

  update public.perfiles
     set plan = 'gratis',
         plan_hasta = null
   where plan = 'pro'
     and plan_hasta is not null
     and plan_hasta < now();

  select * into v_p from public.perfiles where id = v_uid for update;
  if not found then
    return json_build_object('ok', false, 'motivo', 'sin_perfil');
  end if;
  if coalesce(v_p.rubro, '') = '' then
    return json_build_object('ok', false, 'motivo', 'no_pro');
  end if;
  if v_p.pro_juego_en is not null then
    return json_build_object('ok', false, 'motivo', 'ya_usado');
  end if;
  if v_p.plan = 'pro' and (v_p.plan_hasta is null or v_p.plan_hasta > now()) then
    return json_build_object('ok', false, 'motivo', 'ya_pro');
  end if;

  v_hasta := now() + interval '1 month';
  update public.perfiles
     set plan = 'pro',
         plan_hasta = v_hasta,
         pro_juego_en = now()
   where id = v_uid;

  return json_build_object('ok', true, 'plan', 'pro', 'plan_hasta', v_hasta);
end;
$$;

grant execute on function public.vencer_planes_juego() to authenticated;
grant execute on function public.pro_por_jugar(integer) to authenticated;

create or replace function public.avisar_pedido_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rubro text;
begin
  select nombre into v_rubro from public.rubros where id = new.rubro;
  v_rubro := coalesce(v_rubro, new.rubro);

  insert into public.avisos (destino_id, tipo, titulo, cuerpo, ruta, actor_id)
  select p.id,
         'pedido',
         'Hay un pedido de ' || v_rubro || ' en ' || new.localidad,
         'Como Pro te avisamos al toque. Entrá a Buscar para verlo.',
         'buscar',
         new.cliente_id
    from public.perfiles p
   where p.rol = 'pro'
     and p.rubro = new.rubro
     and p.plan = 'pro'
     and (p.plan_hasta is null or p.plan_hasta > now())
     and p.id <> new.cliente_id
     and coalesce(p.suspendido, false) = false
     and coalesce(p.uso_activado, true) = true
     and (
       p.localidad = new.localidad
       or (p.zonas is not null and p.zonas @> array[new.localidad]::text[])
     );

  return new;
end;
$$;
