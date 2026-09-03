-- PASO 2 de 3 — el botón del panel. Copiá TODO esto y dale Run.

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
    raise exception 'Solo el administrador puede activar cuentas';
  end if;

  select coalesce(verificacion, '{}') into v_ver
    from public.perfiles where id = p_usuario;
  if not found then
    raise exception 'Ese usuario no existe';
  end if;

  if p_poner then
    if not ('identidad' = any (v_ver)) then
      v_ver := array_append(v_ver, 'identidad');
    end if;
    if not ('telefono' = any (v_ver)) then
      v_ver := array_append(v_ver, 'telefono');
    end if;
    update public.perfiles
       set uso_activado = true,
           uso_activado_en = coalesce(uso_activado_en, now()),
           verificacion = v_ver
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

create or replace function public.proteger_uso_activado()
returns trigger
language plpgsql
as $$
begin
  if auth.role() is distinct from 'service_role'
     and not public.soy_admin() then
    new.uso_activado := old.uso_activado;
    new.uso_activado_en := old.uso_activado_en;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_uso_activado on public.perfiles;
create trigger trg_proteger_uso_activado
  before update on public.perfiles
  for each row execute procedure public.proteger_uso_activado();
