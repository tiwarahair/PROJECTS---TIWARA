-- A portfolio path is unique per stylist, not globally: real uploads already sit in the stylist's own folder,
-- and this lets demo stylists share the bundled demo/ photos. The new index also covers stylist_id lookups.
alter table public.portfolio_photos drop constraint portfolio_photos_path_key;

alter table public.portfolio_photos add constraint portfolio_photos_stylist_path_key unique (stylist_id, path);

drop index public.portfolio_photos_stylist_id_idx;
