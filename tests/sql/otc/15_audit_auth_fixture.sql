-- Minimal manager authorization stubs for the ephemeral SQL fixture only.
-- This file is never applied to Production.
create table if not exists public.app_user_roles (
 user_id uuid not null, is_active boolean not null, role text not null
);
create or replace function public.authorized_company_ids()
returns setof bigint language sql stable as $$
 select 1::bigint where auth.uid()='00000000-0000-0000-0000-000000000001'::uuid
$$;
insert into public.app_user_roles(user_id,is_active,role)
values('00000000-0000-0000-0000-000000000001',true,'manager');
