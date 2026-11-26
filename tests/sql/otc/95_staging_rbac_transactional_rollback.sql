-- Staging only: rollback-only RBAC acceptance on actual Supabase schema.
-- Synthetic users and OTC source moves exist only inside this transaction.
-- This is PostgreSQL role/GUC simulation, NOT a real hosted JWT test.
begin;
insert into auth.users(id,aud,role) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated'),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated'),
 ('33333333-3333-4333-8333-333333333333','authenticated','authenticated'),
 ('44444444-4444-4444-8444-444444444444','authenticated','authenticated');
insert into public.app_user_roles(user_id,display_name,role,company_id,salesperson_id,is_active) values
 ('11111111-1111-4111-8111-111111111111','Test Rep 1','sales_rep',1,91991,true),
 ('22222222-2222-4222-8222-222222222222','Test Rep 2','sales_rep',2,91992,true),
 ('33333333-3333-4333-8333-333333333333','Test Manager','manager',null,null,true),
 ('44444444-4444-4444-8444-444444444444','Test Inactive','manager',null,null,false);
insert into public.otc_delivery_lines
 (odoo_move_id,odoo_picking_id,company_id,product_id,delivery_date,delivered_qty,link_confidence)
 values (91999001,91999001,1,9199,now(),1,'direct'),
        (91999002,91999002,2,9199,now(),1,'direct');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare c1 bigint; c2 bigint;
begin
 select count(*) into c1 from public.otc_delivery_lines where odoo_move_id=91999001;
 select count(*) into c2 from public.otc_delivery_lines where odoo_move_id=91999002;
 if c1<>1 or c2<>0 then raise exception 'Rep 1 escaped company scope: own % other %',c1,c2;end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare c1 bigint; c2 bigint;
begin
 select count(*) into c1 from public.otc_delivery_lines where odoo_move_id=91999001;
 select count(*) into c2 from public.otc_delivery_lines where odoo_move_id=91999002;
 if c1<>0 or c2<>1 then raise exception 'Rep 2 escaped company scope: own % other %',c2,c1;end if;
end $$;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$
declare n bigint;
begin
 select count(*) into n from public.otc_delivery_lines where odoo_move_id in (91999001,91999002);
 if n<>2 then raise exception 'Manager did not retain authorized two-company read: %',n;end if;
end $$;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
do $$
declare denied boolean:=false; n bigint;
begin
 begin
  select count(*) into n from public.otc_delivery_lines where odoo_move_id in (91999001,91999002);
  denied:=(n=0);
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Inactive staff read customer OTC records';end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.role','anon',true);
do $$
declare denied boolean:=false; n bigint;
begin
 begin select count(*) into n from public.otc_delivery_lines;
  denied:=(n=0);
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous caller read OTC lines';end if;
end $$;
reset role;
rollback;
