-- Two-step verification rules and tax details (Phase 2b).
-- Sensitive changes need an authenticator-app code entered in the last 30 days.

create function public.has_second_factor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified'
  )
$$;

/** This session passed 2FA, and an app code was entered in the last 30 days. */
create function public.has_recent_second_factor()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as method
    where method ->> 'method' = 'totp'
      and (method ->> 'timestamp')::bigint > extract(epoch from now() - interval '30 days')
  )
$$;

-- the policy is part of setup, so it only needs a recent code once 2FA is on
drop policy "Owners add payment policies" on public.payment_policies;

create policy "Owners add payment policies" on public.payment_policies
  for insert to authenticated
  with check (
    public.is_stylist_owner(stylist_id)
    and (not public.has_second_factor() or public.has_recent_second_factor())
  );

-- written only by the save-tax-details Edge Function, which encrypts the NI number
create table public.stylist_tax_details (
  stylist_id uuid primary key references public.stylists (id) on delete cascade,
  kind text not null check (kind in ('sole', 'ltd')),
  first_name text,
  middle_name text,
  last_name text,
  legal_name text,
  date_of_birth date,
  ni_ciphertext text,
  -- e.g. "QQ •• •• 56 C": what Studio shows instead of the number
  ni_hint text,
  company_name text,
  company_number text check (company_number is null or company_number ~ '^([0-9]{8}|[A-Z]{2}[0-9]{6})$'),
  is_address_same boolean not null default false,
  line1 text,
  line2 text,
  city text,
  postcode text,
  updated_at timestamptz not null default now(),
  check (
    (kind = 'sole' and legal_name is not null and date_of_birth is not null and ni_ciphertext is not null)
    or (kind = 'ltd' and company_name is not null and company_number is not null)
  )
);

alter table public.stylist_tax_details enable row level security;

create policy "Owners read their tax details" on public.stylist_tax_details
  for select to authenticated using (public.is_stylist_owner(stylist_id));

-- everything but the encrypted NI number
grant select (
  stylist_id, kind, first_name, middle_name, last_name, legal_name, date_of_birth, ni_hint,
  company_name, company_number, is_address_same, line1, line2, city, postcode, updated_at
) on public.stylist_tax_details to authenticated;
grant select, insert, update, delete on public.stylist_tax_details to service_role;

revoke execute on function public.has_second_factor(), public.has_recent_second_factor() from public, anon;
grant execute on function public.has_second_factor(), public.has_recent_second_factor() to authenticated;
