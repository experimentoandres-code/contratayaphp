-- Última conexión durable + el panel puede leer presupuestos.
-- El latido (cada 25 s) queda en perfiles.visto_en. El panel lo usa
-- para "en la app ahora" (menos de 90 s) y para la última conexión de todos.

alter table public.perfiles
  add column if not exists visto_en timestamptz;

do $$
begin
  update public.perfiles p
     set visto_en = x.visto_en
    from public.presencia x
   where x.usuario_id = p.id
     and (p.visto_en is null or x.visto_en > p.visto_en);
exception
  when undefined_table then null;
  when undefined_column then null;
end $$;

do $$
declare r record;
begin
  for r in
    select oid::regprocedure as sig
      from pg_proc
     where proname in ('latir_presencia', 'admin_presencia')
       and pg_function_is_visible(oid)
  loop
    execute 'drop function if exists ' || r.sig || ' cascade';
  end loop;
end $$;

create function public.latir_presencia()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return; end if;
  update public.perfiles
     set visto_en = now()
   where id = auth.uid();
  begin
    insert into public.presencia (usuario_id, visto_en)
    values (auth.uid(), now())
    on conflict (usuario_id) do update set visto_en = excluded.visto_en;
  exception
    when undefined_table then null;
    when undefined_column then null;
  end;
end;
$$;

create function public.admin_presencia()
returns table (usuario_id uuid, visto_en timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.visto_en
    from public.perfiles p
   where public.soy_admin()
     and p.visto_en is not null;
$$;

grant execute on function public.latir_presencia() to authenticated;
grant execute on function public.admin_presencia() to authenticated;

drop policy if exists presupuestos_admin on public.presupuestos;
create policy presupuestos_admin on public.presupuestos
  for select to authenticated
  using (public.soy_admin());

drop policy if exists calificaciones_admin on public.calificaciones;
create policy calificaciones_admin on public.calificaciones
  for select to authenticated
  using (public.soy_admin());
