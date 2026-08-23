-- ==============================================================================
-- Contract Test: Customer Action Center Dynamic Freshness Default & Grain
-- ==============================================================================

-- 1. Test Dynamic As-Of Date default when p_as_of_date is NULL
-- Expected: Evaluates against max available order date rather than CURRENT_DATE.
SELECT customer_id, customer_name, company_name, last_order_date, days_since_last_order, action_type, priority
FROM public.analytics_customer_action_center(
  p_as_of_date => NULL,
  p_company_name => NULL,
  p_limit => 5
);

-- 2. Test Single Company Scope
SELECT customer_id, customer_name, company_name, last_order_date, days_since_last_order, action_type, priority
FROM public.analytics_customer_action_center(
  p_as_of_date => NULL,
  p_company_name => 'MAS',
  p_limit => 5
);
