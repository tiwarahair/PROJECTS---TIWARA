-- Stripe's dispute fees as Stripe now counts them (it can give a fee back when the dispute is won), and what was
-- already taken from the stylist beyond that, which goes back to them with their share
drop function public.save_dispute_fees(uuid, integer);

create function public.save_dispute_fees(target uuid, fees integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  debt public.stylist_debts;
begin
  if fees > 0 then
    insert into public.stylist_debts (stylist_id, dispute_id, amount_pence)
    select stylist_id, id, fees from public.disputes where id = target and stylist_id is not null
    on conflict (dispute_id) do update set amount_pence = excluded.amount_pence
    returning * into debt;
  else
    update public.stylist_debts set amount_pence = 0 where dispute_id = target returning * into debt;
  end if;

  return greatest(0, coalesce(debt.recovered_pence - debt.amount_pence, 0));
end;
$$;

-- a won dispute, and the fee taken beyond Stripe's, settled together so a retry can't send either twice
create function public.settle_won_dispute(target uuid, returned integer, fee_returned integer, transfer text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.settle_dispute(target, true, returned, transfer);

  update public.stylist_debts set recovered_pence = recovered_pence - fee_returned
  where dispute_id = target and fee_returned > 0 and recovered_pence - amount_pence >= fee_returned;
end;
$$;

revoke execute on function
  public.save_dispute_fees(uuid, integer),
  public.settle_won_dispute(uuid, integer, integer, text)
  from public, anon, authenticated;

grant execute on function
  public.save_dispute_fees(uuid, integer),
  public.settle_won_dispute(uuid, integer, integer, text)
  to service_role;
