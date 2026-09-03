-- PASO 3 de 3 — el panel ve el campo, y un inactivo no publica pedidos.

drop function if exists public.admin_listar_usuarios() cascade;

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
  uso_activado_en  timestamptz
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
         p.uso_activado, p.uso_activado_en
    from public.perfiles p
    left join auth.users u on u.id = p.id
   where public.soy_admin()
   order by p.creado_en desc nulls last
   limit 500;
$$;

grant execute on function public.admin_listar_usuarios() to authenticated;

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
  update public.perfiles set plan = v_plan where id = p_usuario;
  if not found then raise exception 'Ese usuario no existe'; end if;
  update public.interes_plan
     set estado = 'activado', cerrado_en = now()
   where usuario_id = p_usuario and estado = 'pendiente';
  return json_build_object('ok', true, 'plan', v_plan);
end;
$$;

create or replace function public.frenar_pedido_inactivo()
returns trigger
language plpgsql
as $$
begin
  if not coalesce((select uso_activado from public.perfiles where id = new.cliente_id), false) then
    raise exception 'La cuenta todavia no esta activada';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_frenar_pedido_inactivo on public.pedidos;
create trigger trg_frenar_pedido_inactivo
  before insert on public.pedidos
  for each row execute procedure public.frenar_pedido_inactivo();
