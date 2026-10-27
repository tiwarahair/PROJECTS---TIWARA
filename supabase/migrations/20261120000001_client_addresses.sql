-- A client's saved addresses (Account → Saved addresses); booking a mobile stylist starts from the default one.
create table public.client_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  line1 text not null check (char_length(line1) between 1 and 200),
  line2 text not null default '' check (char_length(line2) <= 200),
  town text not null check (char_length(town) between 1 and 100),
  postcode text not null check (char_length(postcode) between 5 and 8),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index client_addresses_client_idx on public.client_addresses (client_id, created_at);
create unique index client_addresses_default_idx on public.client_addresses (client_id) where is_default;

alter table public.client_addresses enable row level security;

create policy "Clients read their addresses" on public.client_addresses
  for select to authenticated using (client_id = (select auth.uid()));

grant select on public.client_addresses to authenticated;

-- adds (no target) or edits one of the signed-in client's addresses; the first is the default, at most 10
create function public.save_client_address(address jsonb, target uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  client uuid := (select auth.uid());
  make_default boolean := coalesce((address ->> 'is_default')::boolean, false);
  saved_id uuid;
begin
  if client is null then
    raise exception 'not_signed_in';
  end if;

  if nullif(trim(address ->> 'line1'), '') is null or nullif(trim(address ->> 'town'), '') is null
    or char_length(trim(coalesce(address ->> 'postcode', ''))) not between 5 and 8
    or char_length(coalesce(address ->> 'line1', '') || coalesce(address ->> 'line2', '')) > 200 then
    raise exception 'invalid_address';
  end if;

  -- one save at a time per client, so the count and the single default hold
  perform 1 from public.profiles where id = client for update;

  if target is null then
    if (select count(*) from public.client_addresses where client_id = client) >= 10 then
      raise exception 'too_many_addresses';
    end if;

    make_default := make_default or not exists (select 1 from public.client_addresses where client_id = client);
  elsif not exists (select 1 from public.client_addresses where id = target and client_id = client) then
    raise exception 'address_not_found';
  end if;

  if make_default then
    update public.client_addresses
    set is_default = false
    where client_id = client and is_default and id is distinct from target;
  end if;

  if target is null then
    insert into public.client_addresses (client_id, label, line1, line2, town, postcode, lat, lng, is_default)
    values (
      client,
      coalesce(nullif(trim(address ->> 'label'), ''), 'Address'),
      trim(address ->> 'line1'),
      coalesce(trim(address ->> 'line2'), ''),
      trim(address ->> 'town'),
      upper(trim(address ->> 'postcode')),
      (address ->> 'lat')::double precision,
      (address ->> 'lng')::double precision,
      make_default
    )
    returning id into saved_id;
  else
    update public.client_addresses
    set label = coalesce(nullif(trim(address ->> 'label'), ''), 'Address'),
      line1 = trim(address ->> 'line1'),
      line2 = coalesce(trim(address ->> 'line2'), ''),
      town = trim(address ->> 'town'),
      postcode = upper(trim(address ->> 'postcode')),
      lat = (address ->> 'lat')::double precision,
      lng = (address ->> 'lng')::double precision,
      is_default = is_default or make_default
    where id = target
    returning id into saved_id;
  end if;

  return saved_id;
end;
$$;

-- removing the default makes the newest remaining address the default
create function public.delete_client_address(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  client uuid := (select auth.uid());
  was_default boolean;
begin
  perform 1 from public.profiles where id = client for update;

  delete from public.client_addresses
  where id = target and client_id = client
  returning is_default into was_default;

  if was_default then
    update public.client_addresses
    set is_default = true
    where id = (
      select id from public.client_addresses
      where client_id = client
      order by created_at desc
      limit 1
    );
  end if;
end;
$$;

revoke execute on function
  public.save_client_address(jsonb, uuid),
  public.delete_client_address(uuid)
  from public, anon, authenticated;

grant execute on function
  public.save_client_address(jsonb, uuid),
  public.delete_client_address(uuid)
  to authenticated;
