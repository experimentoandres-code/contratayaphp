-- Aviso al toque de pedido nuevo: sólo plan Pro, cuenta activa.
-- El Gratis sigue viendo el pedido en Buscar cuando abre la app.

create or replace function public.avisar_pedido_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rubro text;
begin
  select nombre into v_rubro from public.rubros where id = new.rubro;
  v_rubro := coalesce(v_rubro, new.rubro);

  insert into public.avisos (destino_id, tipo, titulo, cuerpo, ruta, actor_id)
  select p.id,
         'pedido',
         'Hay un pedido de ' || v_rubro || ' en ' || new.localidad,
         'Como Pro te avisamos al toque. Entrá a Buscar para verlo.',
         'buscar',
         new.cliente_id
    from public.perfiles p
   where p.rol = 'pro'
     and p.rubro = new.rubro
     and p.plan = 'pro'
     and p.id <> new.cliente_id
     and coalesce(p.suspendido, false) = false
     and coalesce(p.uso_activado, true) = true
     and (
       p.localidad = new.localidad
       or (p.zonas is not null and p.zonas @> array[new.localidad]::text[])
     );

  return new;
end;
$$;
