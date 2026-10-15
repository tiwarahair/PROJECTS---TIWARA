-- Performance advisor fixes. (select auth.uid()) is evaluated once per query instead of once per row.
alter policy "Users read their own profile" on public.profiles
  using (id = (select auth.uid()));

alter policy "Users update their own profile" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy "Owners read their stylist" on public.stylists
  using (owner_id = (select auth.uid()));

alter policy "Owners update their stylist" on public.stylists
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- foreign keys without an index (deletes and joins on them would scan the table)
create index addons_category_id_idx on public.addons (category_id);
create index addons_service_group_id_idx on public.addons (service_group_id);
create index services_category_id_idx on public.services (category_id);
create index stylist_categories_service_group_id_idx on public.stylist_categories (service_group_id);
create index stylist_slug_history_stylist_id_idx on public.stylist_slug_history (stylist_id);
