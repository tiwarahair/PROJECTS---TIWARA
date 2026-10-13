-- Match hosted "Automatically expose new tables" = off: every table states its own grants.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

revoke all on public.service_groups, public.service_types, public.customisation_options, public.default_addons
  from anon, authenticated;

grant select on public.service_groups, public.service_types, public.customisation_options, public.default_addons
  to anon, authenticated;
