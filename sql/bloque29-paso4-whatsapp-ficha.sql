-- PASO 4 — el WhatsApp del usuario queda en la ficha del panel.
-- Vive en contacto.telefono, no en perfiles.

create or replace function public.guardar_mi_whatsapp(p_telefono text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tel text;
begin
  if v_uid is null then raise exception 'Sin sesion'; end if;
  v_tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  if length(v_tel) < 10 or length(v_tel) > 15 then
    raise exception 'Ese numero no parece un WhatsApp';
  end if;
  if v_tel like '00%' then v_tel := substr(v_tel, 3); end if;
  if v_tel not like '54%' then v_tel := '54' || v_tel; end if;

  insert into public.contacto (id, telefono) values (v_uid, v_tel)
  on conflict (id) do update set telefono = excluded.telefono;

  return json_build_object('ok', true, 'whatsapp', v_tel);
end;
$$;

grant execute on function public.guardar_mi_whatsapp(text) to authenticated;

create or replace function public.admin_guardar_whatsapp(p_usuario uuid, p_telefono text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tel text;
begin
  if not public.soy_admin() then
    raise exception 'Solo el administrador';
  end if;
  v_tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  if v_tel = '' then
    update public.contacto set telefono = null where id = p_usuario;
    return json_build_object('ok', true, 'whatsapp', null);
  end if;
  if length(v_tel) < 10 or length(v_tel) > 15 then
    raise exception 'Ese numero no parece un WhatsApp';
  end if;
  if v_tel like '00%' then v_tel := substr(v_tel, 3); end if;
  if v_tel not like '54%' then v_tel := '54' || v_tel; end if;

  insert into public.contacto (id, telefono) values (p_usuario, v_tel)
  on conflict (id) do update set telefono = excluded.telefono;

  return json_build_object('ok', true, 'whatsapp', v_tel);
end;
$$;

grant execute on function public.admin_guardar_whatsapp(uuid, text) to authenticated;

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
  whatsapp text
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
         c.telefono
    from public.perfiles p
    left join auth.users u on u.id = p.id
    left join public.contacto c on c.id = p.id
   where public.soy_admin()
   order by p.creado_en desc nulls last
   limit 500;
$$;

grant execute on function public.admin_listar_usuarios() to authenticated;
