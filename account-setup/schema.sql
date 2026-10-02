-- Deployment proposal; not applied. Use apply_migration against the approved new project.
begin;
create table public.outings_saved_places (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null check (length(listing_id) between 1 and 160),
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.outings_saved_places enable row level security;
revoke all on public.outings_saved_places from anon, authenticated;
grant select, insert, delete on public.outings_saved_places to authenticated;
create policy "Read own saved outings" on public.outings_saved_places
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Save own outings" on public.outings_saved_places
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Remove own outings" on public.outings_saved_places
  for delete to authenticated using ((select auth.uid()) = user_id);
commit;
