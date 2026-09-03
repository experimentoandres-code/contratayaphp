-- Presupuestador Plan Pro: mano de obra por escrito en el match.
-- Aceptar el precio NO inicia el trabajo.

create table if not exists public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  trabajo_id uuid references public.trabajos(id) on delete set null,
  profesional_id uuid not null references public.perfiles(id),
  cliente_id uuid not null references public.perfiles(id),
  descripcion text not null,
  incluye text,
  no_incluye text,
  demora text,
  precio integer not null,
  validez_dias integer not null default 15,
  nota text,
  estado text not null default 'enviado',
  creado_en timestamptz not null default now(),
  aceptado_en timestamptz,
  constraint presupuestos_estado_chk check (estado in ('enviado', 'aceptado', 'reemplazado')),
  constraint presupuestos_precio_chk check (precio > 0 and precio < 100000000),
  constraint presupuestos_validez_chk check (validez_dias in (7, 15, 30))
);

create index if not exists presupuestos_match_idx on public.presupuestos (match_id, creado_en);

alter table public.presupuestos enable row level security;

drop policy if exists presupuestos_ver on public.presupuestos;
create policy presupuestos_ver on public.presupuestos
  for select to authenticated
  using (profesional_id = auth.uid() or cliente_id = auth.uid());

grant select on public.presupuestos to authenticated;

create or replace function public.enviar_presupuesto(
  p_match uuid,
  p_trabajo uuid,
  p_descripcion text,
  p_incluye text,
  p_no_incluye text,
  p_demora text,
  p_precio integer,
  p_validez integer,
  p_nota text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_m public.matches%rowtype;
  v_plan text;
  v_hasta timestamptz;
  v_id uuid;
  v_precio integer := coalesce(p_precio, 0);
  v_validez integer := coalesce(p_validez, 15);
  v_desc text := trim(coalesce(p_descripcion, ''));
begin
  if v_uid is null then raise exception 'Sin sesion'; end if;
  if v_desc = '' then raise exception 'Conta que se va a hacer'; end if;
  if char_length(v_desc) > 2000 then raise exception 'La descripcion es muy larga'; end if;
  if v_precio < 1 then raise exception 'Pone el precio de mano de obra'; end if;
  if v_validez not in (7, 15, 30) then v_validez := 15; end if;

  select * into v_m from public.matches where id = p_match;
  if not found then raise exception 'Ese match no existe'; end if;
  if v_m.profesional_id is distinct from v_uid then
    raise exception 'Solo el profesional puede mandar el presupuesto';
  end if;

  select plan, plan_hasta into v_plan, v_hasta
    from public.perfiles where id = v_uid;
  if coalesce(v_plan, '') <> 'pro' or (v_hasta is not null and v_hasta < now()) then
    raise exception 'El presupuestador es del plan Pro';
  end if;

  if p_trabajo is not null then
    update public.presupuestos
       set estado = 'reemplazado'
     where match_id = p_match
       and trabajo_id = p_trabajo
       and estado = 'enviado';
  else
    update public.presupuestos
       set estado = 'reemplazado'
     where match_id = p_match
       and trabajo_id is null
       and estado = 'enviado';
  end if;

  insert into public.presupuestos (
    match_id, trabajo_id, profesional_id, cliente_id,
    descripcion, incluye, no_incluye, demora, precio, validez_dias, nota, estado
  ) values (
    p_match, p_trabajo, v_m.profesional_id, v_m.cliente_id,
    v_desc,
    nullif(trim(coalesce(p_incluye, '')), ''),
    nullif(trim(coalesce(p_no_incluye, '')), ''),
    nullif(trim(coalesce(p_demora, '')), ''),
    v_precio, v_validez,
    nullif(trim(coalesce(p_nota, '')), ''),
    'enviado'
  ) returning id into v_id;

  insert into public.mensajes (match_id, trabajo_id, autor_id, texto)
  values (
    p_match, p_trabajo, v_uid,
    'Te envié un presupuesto de mano de obra. Para verlo, abrí Contratá Ya desde la app instalada. [[cy-pre]]' || v_id::text
  );

  return json_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.aceptar_presupuesto(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_p public.presupuestos%rowtype;
begin
  if v_uid is null then raise exception 'Sin sesion'; end if;

  select * into v_p from public.presupuestos where id = p_id for update;
  if not found then raise exception 'Ese presupuesto no existe'; end if;
  if v_p.cliente_id is distinct from v_uid then
    raise exception 'Solo el cliente puede aceptar el precio';
  end if;
  if v_p.estado = 'aceptado' then
    return json_build_object('ok', true, 'estado', 'aceptado');
  end if;
  if v_p.estado <> 'enviado' then
    raise exception 'Este presupuesto ya no se puede aceptar';
  end if;

  update public.presupuestos
     set estado = 'aceptado',
         aceptado_en = now()
   where id = p_id;

  begin
    insert into public.avisos (destino_id, tipo, titulo, cuerpo, ruta, actor_id, match_id)
    values (
      v_p.profesional_id,
      'mensaje',
      'Aceptaron tu presupuesto',
      'El cliente aceptó el precio de mano de obra. El trabajo se inicia cuando los dos lo confirmen.',
      'matches',
      v_uid,
      v_p.match_id
    );
  exception when others then
    insert into public.avisos (destino_id, tipo, titulo, cuerpo, ruta, actor_id)
    values (
      v_p.profesional_id,
      'mensaje',
      'Aceptaron tu presupuesto',
      'El cliente aceptó el precio de mano de obra. El trabajo se inicia cuando los dos lo confirmen.',
      'matches',
      v_uid
    );
  end;

  return json_build_object('ok', true, 'estado', 'aceptado');
end;
$$;

grant execute on function public.enviar_presupuesto(uuid, uuid, text, text, text, text, integer, integer, text) to authenticated;
grant execute on function public.aceptar_presupuesto(uuid) to authenticated;
