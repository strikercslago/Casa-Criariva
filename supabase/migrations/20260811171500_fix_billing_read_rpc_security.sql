alter function public.list_monthly_fees(date, text, text, integer, integer) security definer;
alter function public.get_billing_month_summary(date) security definer;
alter function public.get_monthly_fee_detail(uuid) security definer;
alter function public.get_student_billing_snapshot(uuid, date, integer, integer) security definer;

comment on function public.list_monthly_fees(date, text, text, integer, integer) is
  'Paged, aggregated monthly fee list with derived status, balance and financial guardian. SECURITY DEFINER keeps the internal projection private while validating owner access via current_user_is_owner().';
comment on function public.get_billing_month_summary(date) is
  'Aggregates expected, received, pending and overdue amounts for active monthly fees in one reference month. SECURITY DEFINER keeps the internal projection private while validating owner access.';
comment on function public.get_monthly_fee_detail(uuid) is
  'Returns one monthly fee with derived balance and full payment history, including reversed payments. SECURITY DEFINER keeps the internal projection private while validating owner access.';
comment on function public.get_student_billing_snapshot(uuid, date, integer, integer) is
  'Loads a compact Student 360 financial snapshot and paged recent monthly fees without loading full payment history. SECURITY DEFINER keeps the internal projection private while validating owner access.';
