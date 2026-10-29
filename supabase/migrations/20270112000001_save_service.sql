-- Studio saves a service with its sizes, lengths, own options and add-on links in one transaction,
-- so a failed save leaves the menu as it was. Runs as the stylist, so the owner policies still apply.
create function public.save_service(service jsonb, variations jsonb, addon_links jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target uuid := (service ->> 'id')::uuid;
begin
  insert into public.services (
    id, stylist_id, service_type_id, service_group_id, category_id, name, description,
    price_pence, duration_min, extra_time_min, status, sizes_on, lengths_on, sort
  )
  select
    target, stylist_id, service_type_id, service_group_id, category_id, name, description,
    price_pence, duration_min, extra_time_min, status, sizes_on, lengths_on, sort
  from jsonb_populate_record(null::public.services, service)
  on conflict (id) do update set
    stylist_id = excluded.stylist_id,
    service_type_id = excluded.service_type_id,
    service_group_id = excluded.service_group_id,
    category_id = excluded.category_id,
    name = excluded.name,
    description = excluded.description,
    price_pence = excluded.price_pence,
    duration_min = excluded.duration_min,
    extra_time_min = excluded.extra_time_min,
    status = excluded.status,
    sizes_on = excluded.sizes_on,
    lengths_on = excluded.lengths_on,
    sort = excluded.sort;

  delete from public.service_variations where service_id = target;
  delete from public.service_addons where service_id = target;

  insert into public.service_variations (
    service_id, kind, group_name, label, offered, price_delta_pence, minutes_delta, sort
  )
  select
    target, kind, group_name, label, coalesce(offered, true),
    coalesce(price_delta_pence, 0), coalesce(minutes_delta, 0), sort
  from jsonb_populate_recordset(null::public.service_variations, coalesce(variations, '[]'));

  insert into public.service_addons (service_id, addon_id, price_override_pence, minutes_override)
  select target, addon_id, price_override_pence, minutes_override
  from jsonb_populate_recordset(null::public.service_addons, coalesce(addon_links, '[]'));
end;
$$;

revoke execute on function public.save_service(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_service(jsonb, jsonb, jsonb) to authenticated;
