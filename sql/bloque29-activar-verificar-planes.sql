-- CONTRATÁ YA · BLOQUE 29
-- Activación + verificación juntas (WhatsApp → panel).
-- Galería y redes para el plan Pro.
-- Pegar entero en el SQL editor de Supabase.

-- 1) Columnas nuevas
alter table public.perfiles
  add column if not exists uso_activado boolean,
  add column if not exists uso_activado_en timestamptz,
  add column if not exists galeria text[] not null default '{}',
  add column if not exists instagram text,
  add column if not exists facebook text;

-- Los que ya están: siguen adentro. Los que se anoten de ahora: false.
update public.perfiles
   set uso_activado = true
 where uso_activado is null;

alter table public.perfiles
  alter column uso_activado set default false,
  alter column uso_activado set not null;

-- 2) El usuario no se puede autoactivar ni auto-verificarse.
--    El admin sí (soy_admin), igual que al marcar el sello o el plan.
create or replace function public.proteger_campos_perfil()
returns trigger
language plpgsql
as $$
begin
  if auth.role() is distinct from 'service_role'
     and coalesce(current_setting('app.recalculo_puntaje', true), 'off') <> 'on'
     and not public.soy_admin() then
    new.plan             := old.plan;
    new.verificacion     := old.verificacion;
    new.puntaje_pro      := old.puntaje_pro;
    new.puntaje_cliente  := old.puntaje_cliente;
    new.resenas_pro      := old.resenas_pro;
    new.resenas_cliente  := old.resenas_cliente;
    new.trabajos         := old.trabajos;
    new.contrataciones   := old.contrataciones;
    new.uso_activado     := old.uso_activado;
    new.uso_activado_en  := old.uso_activado_en;
  end if;
  return new;
end;
$$;

-- 3) Un clic del admin: entra a la app y queda verificada.
create or replace function public.admin_activar_uso(p_usuario uuid, p_poner boolean default true)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ver text[];
begin
  if not public.soy_admin() then
    raise exception 'Sólo el administrador puede activar cuentas';
  end if;

  select coalesce(verificacion, '{}') into v_ver
    from public.perfiles where id = p_usuario;
  if not found then raise exception 'Ese usuario no existe'; end if;

  if p_poner then
    if not ('identidad' = any (v_ver)) then
      v_ver := array_append(v_ver, 'identidad');
    end if;
    if not ('telefono' = any (v_ver)) then
      v_ver := array_append(v_ver, 'telefono');
    end if;
    update public.perfiles
       set uso_activado    = true,
           uso_activado_en = coalesce(uso_activado_en, now()),
           verificacion    = v_ver
     where id = p_usuario;
  else
    update public.perfiles
       set uso_activado = false
     where id = p_usuario;
  end if;

  return json_build_object('ok', true, 'uso_activado', p_poner);
end;
$$;

grant execute on function public.admin_activar_uso(uuid, boolean) to authenticated;

-- 4) Listado del panel: incluye el nuevo campo.
drop function if exists public.admin_listar_usuarios();
create function public.admin_listar_usuarios()
returns table (
  id               uuid,
  nombre           text,
  foto_url         text,
  rol              text,
  localidad        text,
  rubro            text,
  plan             text,
  puntaje_pro      numeric,
  puntaje_cliente  numeric,
  verificacion     text[],
  creado_en        timestamptz,
  trabajos         int,
  contrataciones   int,
  suspendido       boolean,
  eliminado_en     timestamptz,
  correo           text,
  uso_activado     boolean,
  uso_activado_en  timestamptz,
  app_instalada_en timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nombre, p.foto_url, p.rol, p.localidad, p.rubro, p.plan,
         p.puntaje_pro, p.puntaje_cliente, p.verificacion, p.creado_en,
         p.trabajos, p.contrataciones, p.suspendido, p.eliminado_en,
         u.email,
         p.uso_activado, p.uso_activado_en,
         p.app_instalada_en
    from public.perfiles p
    left join auth.users u on u.id = p.id
   where public.soy_admin()
   order by p.creado_en desc nulls last
   limit 500;
$$;

grant execute on function public.admin_listar_usuarios() to authenticated;

-- 5) Plan Pro: sólo gratis o pro (el viejo "verificado" pasa a gratis).
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
    raise exception 'Sólo el administrador puede activar planes';
  end if;

  if v_plan = 'verificado' then v_plan := 'gratis'; end if;
  if v_plan not in ('gratis', 'pro') then
    raise exception 'Ese plan no existe';
  end if;

  update public.perfiles set plan = v_plan where id = p_usuario;
  if not found then raise exception 'Ese usuario no existe'; end if;

  update public.interes_plan
     set estado = 'activado', cerrado_en = now()
   where usuario_id = p_usuario and estado = 'pendiente';

  return json_build_object('ok', true, 'plan', v_plan);
end;
$$;

-- 6) Sin cuenta activa no publica pedidos.
create or replace function public.frenar_pedido_inactivo()
returns trigger
language plpgsql
as $$
begin
  if not coalesce((select uso_activado from public.perfiles where id = new.cliente_id), false) then
    raise exception 'La cuenta todavía no está activada';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_frenar_pedido_inactivo on public.pedidos;
create trigger trg_frenar_pedido_inactivo
  before insert on public.pedidos
  for each row execute function public.frenar_pedido_inactivo();

notify pgrst, 'reload schema';
