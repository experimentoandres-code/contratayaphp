-- Push 2 veces por día (9:00 y 18:00 Argentina, todos los días incluido domingo).
-- Listado de pedidos abiertos de TODAS las zonas, a TODOS los profesionales
-- (Gratis y Pro), no solo a los de esa localidad.

create or replace function public.avisar_pedidos_pendientes()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int := 0;
  v_cant int := 0;
  v_zonas text := '';
  v_cuerpo text;
begin
  select count(*),
         coalesce(string_agg(distinct ped.localidad, ', ' order by ped.localidad), '')
    into v_cant, v_zonas
    from public.pedidos ped
   where ped.estado = 'abierto';

  if v_cant < 1 then
    return json_build_object('ok', true, 'avisos', 0);
  end if;

  v_cuerpo := v_cant::text || ' pedido' || case when v_cant = 1 then '' else 's' end
    || ' sin tomar: ' || v_zonas || '. Entrá a Buscar.';

  insert into public.avisos (destino_id, tipo, titulo, cuerpo, ruta)
  select p.id,
         'pedidos_pendientes',
         'Hay pedidos esperándote',
         v_cuerpo,
         'buscar'
    from public.perfiles p
   where p.rol = 'pro'
     and coalesce(p.suspendido, false) = false
     and coalesce(p.uso_activado, true) = true
     and exists (
       select 1
         from public.suscripciones_push s
        where s.usuario_id = p.id
          and coalesce(s.fallos, 0) < 3
     )
     and not exists (
       select 1
         from public.avisos a
        where a.destino_id = p.id
          and a.tipo = 'pedidos_pendientes'
          and a.creado_en > now() - interval '6 hours'
     );

  get diagnostics v_n = row_count;
  return json_build_object('ok', true, 'avisos', v_n, 'pedidos', v_cant);
end;
$$;

do $$
begin
  perform cron.unschedule(j.jobid)
    from cron.job j
   where j.jobname in ('pedidos-pendientes-manana', 'pedidos-pendientes-tarde');
exception
  when undefined_table then null;
  when undefined_function then null;
end $$;

select cron.schedule(
  'pedidos-pendientes-manana',
  '0 12 * * *',
  $cmd$select public.avisar_pedidos_pendientes();$cmd$
);

select cron.schedule(
  'pedidos-pendientes-tarde',
  '0 21 * * *',
  $cmd$select public.avisar_pedidos_pendientes();$cmd$
);
