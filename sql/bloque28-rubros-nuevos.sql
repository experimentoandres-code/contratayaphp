-- Rubros que la app ya muestra y no están en public.rubros (FK de perfiles/pedidos).
-- Sin esto, elegir Fumigación, Casero, o los 5 extra viejos, falla al guardar.
-- Pegar en el SQL editor de Supabase.

insert into public.rubros (id, nombre, glifo, orden) values
  ('mantenimiento', 'Mantenimiento',                    '⊕', 16),
  ('limpieza',      'Limpieza de casas / Hoteles',      '◇', 17),
  ('fletes',        'Fletes y mudanzas',                '▸', 18),
  ('electronica',   'Técnico electrónico',              '◎', 19),
  ('cerrajero',     'Cerrajero',                         '⬧', 20),
  ('fumigacion',    'Fumigación',                        '※', 21),
  ('casero',        'Casero (cuidado de propiedades)',  '⌂', 22)
on conflict (id) do update
  set nombre = excluded.nombre,
      glifo  = excluded.glifo,
      orden  = excluded.orden;
