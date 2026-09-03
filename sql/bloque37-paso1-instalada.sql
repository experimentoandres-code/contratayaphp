-- PASO 1 — no toca el listado de usuarios. Solo la marca de app descargada.

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

drop function if exists public.admin_instalaciones() cascade;

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
