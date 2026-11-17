-- SPMM Wardha: safe additive member finance overview migration.
-- Preserves the existing financial_records_approved_member_read policy.
-- Does not create/drop tables, alter existing records, or modify unrelated policies.

begin;

insert into public.site_settings(key, value)
values ('member_financial_overview', jsonb_build_object('enabled', false))
on conflict (key) do nothing;

create or replace function public.get_member_financial_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_approved() then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1
    from public.site_settings s
    where s.key = 'member_financial_overview'
      and coalesce((s.value->>'enabled')::boolean, false) = true
  ) then
    return null;
  end if;

  select jsonb_build_object(
    'income', coalesce((
      select sum(amount)
      from public.financial_records
      where txn_type = 'income'
    ), 0),
    'expenses', coalesce((
      select sum(amount)
      from public.financial_records
      where txn_type = 'expense'
    ), 0),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', category_name,
        'income', category_income,
        'expenses', category_expenses
      ))
      from (
        select
          coalesce(nullif(category, ''), nullif(programme_name, ''), 'Other') as category_name,
          coalesce(sum(amount) filter (where txn_type = 'income'), 0) as category_income,
          coalesce(sum(amount) filter (where txn_type = 'expense'), 0) as category_expenses
        from public.financial_records
        group by 1
      ) grouped_categories
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_member_financial_overview() from public;
grant execute on function public.get_member_financial_overview() to authenticated;

commit;
