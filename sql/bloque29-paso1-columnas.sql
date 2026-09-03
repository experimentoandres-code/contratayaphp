-- PASO 1 de 3 — solo columnas. Copiá TODO esto y dale Run.

alter table public.perfiles add column if not exists uso_activado boolean;
alter table public.perfiles add column if not exists uso_activado_en timestamptz;
alter table public.perfiles add column if not exists galeria text[];
alter table public.perfiles add column if not exists instagram text;
alter table public.perfiles add column if not exists facebook text;

update public.perfiles set uso_activado = true where uso_activado is null;
update public.perfiles set galeria = '{}'::text[] where galeria is null;

alter table public.perfiles alter column uso_activado set default false;
alter table public.perfiles alter column uso_activado set not null;
alter table public.perfiles alter column galeria set default '{}'::text[];
alter table public.perfiles alter column galeria set not null;
