-- the pages clients open from emailed links, so no stylist's booking link can take their place
insert into public.reserved_slugs (slug) values ('pay'), ('confirm'), ('card') on conflict do nothing;
