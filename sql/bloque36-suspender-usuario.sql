-- Suspender una cuenta desde el panel de Usuarios, sin pasar por una denuncia.

create or replace function public.admin_suspender_usuario(p_usuario uuid, p_motivo text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  if not public.soy_admin() then
    raise exception 'Solo el administrador puede suspender cuentas';
  end if;
  if p_usuario is null then
    raise exception 'Falta el usuario';
  end if;
  if p_usuario = auth.uid() then
    raise exception 'No podés suspenderte a vos';
  end if;

  update public.perfiles
     set suspendido = true,
         suspendido_motivo = v_motivo
   where id = p_usuario;

  if not found then raise exception 'Ese usuario no existe'; end if;

  return json_build_object('ok', true, 'suspendido', true);
end;
$$;

grant execute on function public.admin_suspender_usuario(uuid, text) to authenticated;
