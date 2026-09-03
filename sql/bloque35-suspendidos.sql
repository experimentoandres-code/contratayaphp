-- Suspendidos: se ven con nombre y datos, no como eliminados.
-- Al suspender no se borra la identidad. Se puede levantar.

alter table public.perfiles add column if not exists suspendido_motivo text;

create or replace function public.proteger_identidad_al_suspender()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.suspendido, false) = true
     and coalesce(old.suspendido, false) = false then
    if new.nombre is null or new.nombre ilike '%eliminad%' then
      new.nombre := old.nombre;
    end if;
    if new.foto_url is null then
      new.foto_url := old.foto_url;
    end if;
    new.eliminado_en := old.eliminado_en;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_identidad_al_suspender on public.perfiles;
create trigger trg_proteger_identidad_al_suspender
  before update on public.perfiles
  for each row execute procedure public.proteger_identidad_al_suspender();

update public.perfiles
   set eliminado_en = null
 where coalesce(suspendido, false) = true
   and eliminado_en is not null;

create or replace function public.levantar_suspension(p_usuario uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.soy_admin() then
    raise exception 'Solo el administrador puede levantar una suspension';
  end if;
  update public.perfiles
     set suspendido = false,
         suspendido_motivo = null
   where id = p_usuario;
  if not found then raise exception 'Ese usuario no existe'; end if;
  return json_build_object('ok', true);
end;
$$;

grant execute on function public.levantar_suspension(uuid) to authenticated;

do $$
declare r record;
begin
  for r in
    select oid::regprocedure as sig
      from pg_proc
     where proname = 'usuarios_suspendidos'
       and pg_function_is_visible(oid)
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

create function public.usuarios_suspendidos()
returns table (
  id uuid,
  nombre text,
  foto_url text,
  rol text,
  localidad text,
  rubro text,
  plan text,
  correo text,
  whatsapp text,
  motivo text,
  denuncias bigint,
  creado_en timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.soy_admin() then
    raise exception 'Solo el administrador';
  end if;

  return query
  select p.id,
         p.nombre,
         p.foto_url,
         p.rol,
         p.localidad,
         p.rubro,
         p.plan,
         u.email,
         c.telefono,
         p.suspendido_motivo,
         0::bigint,
         p.creado_en
    from public.perfiles p
    left join auth.users u on u.id = p.id
    left join public.contacto c on c.id = p.id
   where coalesce(p.suspendido, false) = true
   order by p.creado_en desc;
end;
$$;

grant execute on function public.usuarios_suspendidos() to authenticated;

drop function if exists public.admin_listar_usuarios() cascade;

create function public.admin_listar_usuarios()
returns table (
  id uuid,
  nombre text,
  foto_url text,
  rol text,
  localidad text,
  rubro text,
  plan text,
  puntaje_pro numeric,
  puntaje_cliente numeric,
  verificacion text[],
  creado_en timestamptz,
  trabajos int,
  contrataciones int,
  suspendido boolean,
  eliminado_en timestamptz,
  correo text,
  uso_activado boolean,
  uso_activado_en timestamptz,
  whatsapp text,
  suspendido_motivo text
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
         c.telefono,
         p.suspendido_motivo
    from public.perfiles p
    left join auth.users u on u.id = p.id
    left join public.contacto c on c.id = p.id
   where public.soy_admin()
   order by p.creado_en desc nulls last
   limit 500;
$$;

grant execute on function public.admin_listar_usuarios() to authenticated;
