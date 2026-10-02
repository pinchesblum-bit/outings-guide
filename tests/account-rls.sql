begin;
insert into auth.users (id) values
 ('ad5ec48a-cd61-41a0-b55e-390a1c1f0001'),
 ('ad5ec48a-cd61-41a0-b55e-390a1c1f0002');
set local role authenticated;
select set_config('request.jwt.claim.sub','ad5ec48a-cd61-41a0-b55e-390a1c1f0001',true);
insert into public.outings_saved_places (user_id,listing_id) values ('ad5ec48a-cd61-41a0-b55e-390a1c1f0001','__rls_test_a');
do $$ begin
 if (select count(*) from public.outings_saved_places) <> 1 then raise exception 'User A read failed'; end if;
 begin
  insert into public.outings_saved_places(user_id,listing_id) values ('ad5ec48a-cd61-41a0-b55e-390a1c1f0002','__rls_forgery');
  raise exception 'Forged ownership accepted';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','ad5ec48a-cd61-41a0-b55e-390a1c1f0002',true);
do $$ declare changed_rows integer; begin
 if exists(select 1 from public.outings_saved_places) then raise exception 'User B can read User A'; end if;
 delete from public.outings_saved_places where user_id='ad5ec48a-cd61-41a0-b55e-390a1c1f0001';
 get diagnostics changed_rows = row_count;
 if changed_rows <> 0 then raise exception 'User B can delete User A'; end if;
end $$;
insert into public.outings_saved_places(user_id,listing_id) values ('ad5ec48a-cd61-41a0-b55e-390a1c1f0002','__rls_test_b');
do $$ declare changed_rows integer; begin
 if (select count(*) from public.outings_saved_places) <> 1 then raise exception 'User B read failed'; end if;
 delete from public.outings_saved_places where listing_id='__rls_test_b';
 get diagnostics changed_rows = row_count;
 if changed_rows <> 1 then raise exception 'User B cannot delete own row'; end if;
end $$;
select set_config('request.jwt.claim.sub','ad5ec48a-cd61-41a0-b55e-390a1c1f0001',true);
do $$ declare changed_rows integer; begin
 if (select count(*) from public.outings_saved_places) <> 1 then raise exception 'User A row not intact'; end if;
 begin
  update public.outings_saved_places set user_id='ad5ec48a-cd61-41a0-b55e-390a1c1f0002';
  raise exception 'Ownership update accepted';
 exception when insufficient_privilege then null; end;
 delete from public.outings_saved_places where listing_id='__rls_test_a';
 get diagnostics changed_rows = row_count;
 if changed_rows <> 1 then raise exception 'User A cannot delete own row'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin
  perform * from public.outings_saved_places;
  raise exception 'Anonymous read accepted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.outings_saved_places(user_id,listing_id) values ('ad5ec48a-cd61-41a0-b55e-390a1c1f0001','__rls_anon');
  raise exception 'Anonymous write accepted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: two authenticated identities isolated; forged ownership, owner changes, and anonymous access rejected; all fixtures rolled back' as result;
