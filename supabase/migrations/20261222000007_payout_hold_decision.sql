-- whether a new stylist's payment is held is decided once, when it's charged: the code charging it records the
-- payment here, and the payment row follows that, so a fifth booking finishing in between can't change the answer
create table public.payout_hold_intents (
  payment_intent_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.payout_hold_intents enable row level security;

create function public.hold_payout(intent text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.payout_hold_intents (payment_intent_id) values (intent) on conflict do nothing
$$;

create or replace function public.set_payment_held()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- a late-cancel or no-show fee is only charged once the waiver window has closed, so it isn't held
  new.held := new.method = 'card' and new.kind <> 'fee' and exists (
    select 1 from public.payout_hold_intents where payment_intent_id = new.stripe_payment_intent_id
  );

  return new;
end;
$$;

revoke execute on function public.hold_payout(text) from public, anon, authenticated;
grant execute on function public.hold_payout(text) to service_role;
