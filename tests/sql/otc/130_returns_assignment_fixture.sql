-- Ephemeral-only app-user company membership fixture; real Production schema has company_id.
alter table public.app_user_roles add column if not exists company_id bigint;
update public.app_user_roles set company_id=1 where user_id='00000000-0000-0000-0000-000000000001';
update public.app_user_roles set company_id=2 where user_id='00000000-0000-0000-0000-000000000002';
insert into public.app_user_roles(user_id,is_active,role,company_id) values
 ('00000000-0000-0000-0000-000000000005',true,'sales_rep',1),
 ('00000000-0000-0000-0000-000000000006',true,'sales_rep',2),
 ('00000000-0000-0000-0000-000000000007',false,'sales_rep',1);
