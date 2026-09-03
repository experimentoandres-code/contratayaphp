-- PASO extra — avisos en el mismo celular, otra cuenta.
-- El endpoint del push es del teléfono. Si ya lo tenía otra cuenta,
-- hay que pasarlo a la que está usando ahora.

create or replace function public.guardar_suscripcion_push(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_navegador text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sin sesion'; end if;
  if coalesce(p_endpoint, '') = '' then raise exception 'Falta endpoint'; end if;

  update public.suscripciones_push
     set usuario_id = v_uid,
         p256dh     = p_p256dh,
         auth       = p_auth,
         navegador  = p_navegador,
         fallos     = 0
   where endpoint = p_endpoint;

  if not found then
    insert into public.suscripciones_push
      (usuario_id, endpoint, p256dh, auth, navegador, fallos)
    values (v_uid, p_endpoint, p_p256dh, p_auth, p_navegador, 0);
  end if;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.guardar_suscripcion_push(text, text, text, text) to authenticated;
