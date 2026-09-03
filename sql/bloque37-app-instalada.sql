-- Marca real de app descargada: se guarda cuando la abren desde el ícono.
-- El panel lee perfiles.app_instalada_en (no una tabla aparte).

alter table public.perfiles add column if not exists app_instalada_en timestamptz;

create or replace function public.marcar_app_instalada()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return json_build_object('ok', false);
  end if;
  update public.perfiles
     set app_instalada_en = coalesce(app_instalada_en, now())
   where id = v_uid;
  return json_build_object('ok', true);
end;
$$;

grant execute on function public.marcar_app_instalada() to authenticated;

do $$
declare r record;
begin
  for r in
    select oid::regprocedure as sig
      from pg_proc
     where proname = 'admin_instalaciones'
       and pg_function_is_visible(oid)
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

create function public.admin_instalaciones()
returns table (usuario_id uuid, instalada_en timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.app_instalada_en
    from public.perfiles p
   where public.soy_admin()
     and p.app_instalada_en is not null;
$$;

grant execute on function public.admin_instalaciones() to authenticated;

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
  suspendido_motivo text,
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
         c.telefono,
         p.suspendido_motivo,
         p.app_instalada_en
    from public.perfiles p
    left join auth.users u on u.id = p.id
    left join public.contacto c on c.id = p.id
   where public.soy_admin()
   order by p.creado_en desc nulls last
   limit 500;
$$;

grant execute on function public.admin_listar_usuarios() to authenticated;
