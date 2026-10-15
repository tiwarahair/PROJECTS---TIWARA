-- Staging only: 30 made-up stylists around Greater Manchester, live and bookable.
-- Run in the Supabase SQL editor for staging. Safe to re-run: it replaces the same 30 (staging-seed-N@example.com).
-- Covers are app assets (demo/stylists/*, the dev covers); profile photos are left empty.
-- remove-staging-stylists.sql deletes them again.

-- one do block, so the SQL editor runs it as a single statement (all or nothing)
do $$
begin

delete from auth.users where email like 'staging-seed-%@example.com';

create temp table seed_stylist (
  n int,
  business text,
  first_name text,
  last_name text,
  business_type text,
  line1 text,
  area text,
  postcode text,
  lat float8,
  lng float8,
  radius smallint,
  groups text[],
  services text[],
  bio text
) on commit drop;

insert into seed_stylist values
  (1, 'Crown & Coil', 'Adaeze', 'Nwosu', 'shop', '41 Claremont Road', 'Moss Side, Manchester', 'M14 4RS', 53.4590, -2.2370, null,
    array['braids', 'natural'], array['knotless-braids', 'box-braids', 'silk-press', 'define-curls'],
    'Neat knotless and healthy natural styling from a bright studio on Claremont Road. Consultation included with every booking.'),
  (2, 'Plaits by Temi', 'Temi', 'Adeyemi', 'home_based', '8 Royce Road', 'Hulme, Manchester', 'M15 5BJ', 53.4655, -2.2490, null,
    array['braids'], array['knotless-braids', 'fulani-braids', 'feed-in-braids'],
    'Small-batch braiding from a calm home studio in Hulme. Light tension, clean parts and edges that last.'),
  (3, 'Shanice Styles', 'Shanice', 'Clarke', 'mobile', '', 'Rusholme, Manchester', 'M14 5AL', 53.4530, -2.2250, 10,
    array['wigs', 'weaves'], array['frontal-install', 'glueless-install', 'closure-sew-in'],
    'Wig installs and sew-ins that come to you. Melted lace, natural partings and no glue unless you want it.'),
  (4, 'Kinks & Co', 'Folake', 'Bello', 'shop', '210 Stockport Road', 'Longsight, Manchester', 'M13 0RQ', 53.4600, -2.2000, null,
    array['natural', 'treatments'], array['wash-and-style', 'twist-out', 'deep-conditioning', 'scalp-treatment'],
    'Natural hair care that puts health first: wash days, twist-outs and treatments for 4a–4c hair.'),
  (5, 'Rooted Locs Studio', 'Ruth', 'Mensah', 'shop', '17 Stockport Road', 'Levenshulme, Manchester', 'M19 3AB', 53.4440, -2.1920, null,
    array['locs'], array['starter-locs', 'loc-re-twist', 'loc-repair', 'loc-extensions'],
    'Locs only, from first twist to full-length extensions. Ruth has been loc''ing in Levenshulme for ten years.'),
  (6, 'Imani Hair Lounge', 'Imani', 'Johnson', 'shop', '5 School Lane', 'Didsbury, Manchester', 'M20 6RD', 53.4170, -2.2310, null,
    array['braids', 'wigs'], array['goddess-braids', 'bora-bora', 'closure-install', 'wig-styling'],
    'A relaxed Didsbury lounge for boho braids and soft-glam wig installs. Tea on arrival, playlist on request.'),
  (7, 'Chi''s Braid Room', 'Chidinma', 'Okeke', 'home_based', '22 Beech Road', 'Chorlton, Manchester', 'M21 9EG', 53.4410, -2.2760, null,
    array['braids'], array['knotless-braids', 'passion-twists', 'senegalese-twists', 'takedown'],
    'Twists and knotless in a cosy Chorlton braid room. Hair included and pre-stretched, so you just turn up.'),
  (8, 'Curl Theory', 'Leah', 'Campbell', 'chair_rental', '90 Withington Road', 'Whalley Range, Manchester', 'M16 8EE', 53.4500, -2.2550, null,
    array['natural', 'treatments'], array['define-curls', 'silk-press', 'protein-treatment', 'hair-trim'],
    'Curl definition, silk presses and trims, all tailored to your pattern. Leah rents a chair at a Whalley Range salon.'),
  (9, 'Fulani Queen', 'Aisha', 'Bah', 'mobile', '', 'Old Trafford, Manchester', 'M16 0RA', 53.4590, -2.2850, 10,
    array['braids'], array['fulani-braids', 'feed-in-braids', 'stitch-braids'],
    'Mobile braider for Fulani, feed-in and stitch styles. Beads and cuffs brought along at no extra cost.'),
  (10, 'Lace & Grace', 'Kerry-Ann', 'Brown', 'chair_rental', '31 Chester Road', 'Stretford, Manchester', 'M32 0RW', 53.4460, -2.3090, null,
    array['wigs'], array['frontal-install', 'closure-install', 'glueless-install', 'wig-styling'],
    'Lace installs with a light hand. Kerry-Ann customises every unit before it goes on.'),
  (11, 'The Twist Bar', 'Precious', 'Okafor', 'shop', '12 Chapel Street', 'Salford', 'M3 5JZ', 53.4840, -2.2550, null,
    array['braids', 'locs'], array['passion-twists', 'marley-twists', 'faux-locs', 'loc-re-twist'],
    'Twists of every kind in central Salford, plus faux locs and re-twists. Walk-ins welcome on Saturdays.'),
  (12, 'Silk Edit', 'Nadia', 'Hamid', 'home_based', '6 Church Street', 'Eccles', 'M30 0DF', 53.4830, -2.3340, null,
    array['natural'], array['silk-press', 'blow-dry', 'hair-trim'],
    'Silk presses that hold through Manchester rain. Heat protection and a trim are part of every press.'),
  (13, 'Zee Knots', 'Zainab', 'Sesay', 'shop', '50 Blossom Street', 'Ancoats, Manchester', 'M4 6BF', 53.4840, -2.2270, null,
    array['braids'], array['knotless-braids', 'miracle-knots', 'french-curl', 'refresh'],
    'Knotless and miracle knots in an Ancoats studio. Zainab is known for tiny, even parts.'),
  (14, 'Tress Atelier', 'Tolu', 'Ogunleye', 'shop', '19 Oldham Street', 'Northern Quarter, Manchester', 'M1 1JG', 53.4840, -2.2350, null,
    array['wigs', 'weaves'], array['frontal-install', 'versatile-sew-in', 'tape-in-install', 'ponytail-extension'],
    'A Northern Quarter atelier for installs, sew-ins and sleek ponytails. Bring your own hair or order through us.'),
  (15, 'Mane Street', 'Danielle', 'Morgan', 'home_based', '73 Cheetham Hill Road', 'Cheetham Hill, Manchester', 'M8 8EJ', 53.5050, -2.2370, null,
    array['natural', 'braids'], array['cornrows', 'braid-out', 'feed-in-braids', 'wash-and-style'],
    'Cornrows, braid-outs and wash days for all ages. Kids'' appointments run on weekday afternoons.'),
  (16, 'Asante Locs', 'Grace', 'Asante', 'home_based', '14 Church Lane', 'Harpurhey, Manchester', 'M9 4LQ', 53.5170, -2.2170, null,
    array['locs'], array['starter-locs', 'loc-re-twist', 'loc-repair'],
    'Patient, careful loc maintenance from Grace''s home studio. Starter locs come with a free first re-twist.'),
  (17, 'Braids by Funmi', 'Funmi', 'Adebayo', 'mobile', '', 'Gorton, Manchester', 'M18 8LD', 53.4680, -2.1740, 5,
    array['braids'], array['box-braids', 'knotless-braids', 'goddess-braids'],
    'Box, knotless and goddess braids in your own home. Funmi covers east Manchester and Tameside.'),
  (18, 'Glow & Go Hair', 'Jade', 'Williams', 'chair_rental', '120 Ashton Old Road', 'Openshaw, Manchester', 'M11 1JG', 53.4760, -2.1750, null,
    array['treatments', 'natural'], array['colouring', 'deep-conditioning', 'blow-dry'],
    'Colour and conditioning for natural and relaxed hair. Every colour starts with a strand test.'),
  (19, 'Bloom Braiding Co', 'Esther', 'Boateng', 'shop', '8 Mersey Square', 'Stockport', 'SK1 1RA', 53.4106, -2.1575, null,
    array['braids'], array['knotless-braids', 'bora-bora', 'french-curl', 'takedown'],
    'Stockport''s braid studio for curly-end styles and knotless. Takedowns booked separately so you''re never rushed.'),
  (20, 'Ngozi''s Hair Haven', 'Ngozi', 'Eze', 'home_based', '27 Union Street', 'Oldham', 'OL1 1HE', 53.5409, -2.1114, null,
    array['braids', 'natural'], array['senegalese-twists', 'stitch-braids', 'define-curls'],
    'Twists, stitch braids and curl days in a quiet Oldham home studio.'),
  (21, 'Edge & Root', 'Abena', 'Owusu', 'shop', '3 Yorkshire Street', 'Rochdale', 'OL16 1BH', 53.6158, -2.1557, null,
    array['locs', 'natural'], array['loc-re-twist', 'loc-extensions', 'twist-out'],
    'Locs and natural styling in Rochdale town centre. Abena specialises in loc extensions that blend.'),
  (22, 'Simone Sews', 'Simone', 'Reid', 'home_based', '44 Deane Road', 'Bolton', 'BL3 5AB', 53.5740, -2.4410, null,
    array['weaves', 'wigs'], array['closure-sew-in', 'versatile-sew-in', 'glueless-install'],
    'Sew-ins that lie flat and last six to eight weeks. Simone braids every base by hand.'),
  (23, 'Halima Braids', 'Halima', 'Diallo', 'mobile', '', 'Bury', 'BL9 0AW', 53.5933, -2.2966, 15,
    array['braids'], array['fulani-braids', 'knotless-braids', 'feed-in-braids', 'refresh'],
    'Mobile braiding across Bury and north Manchester. Refresh appointments keep your style going longer.'),
  (24, 'Coils & Crowns', 'Yetunde', 'Lawal', 'shop', '15 Standishgate', 'Wigan', 'WN1 1UE', 53.5450, -2.6325, null,
    array['natural', 'treatments'], array['define-curls', 'wash-and-style', 'protein-treatment', 'scalp-treatment'],
    'Coily-hair specialists in Wigan. Treatments are matched to your porosity after a quick test.'),
  (25, 'Unit Society', 'Bukola', 'Afolabi', 'mobile', '', 'Ashton-under-Lyne', 'OL6 6BX', 53.4880, -2.0950, 10,
    array['wigs'], array['frontal-install', 'closure-install', 'wig-styling'],
    'Wig installs and restyles that come to you, from bridal glam to everyday glueless.'),
  (26, 'Twist & Shout', 'Chantelle', 'Thomas', 'home_based', '61 Washway Road', 'Sale', 'M33 7AB', 53.4240, -2.3220, null,
    array['braids', 'locs'], array['passion-twists', 'faux-locs', 'starter-locs'],
    'Bold twists and faux locs with a playful finish. Chantelle loves a colour pop.'),
  (27, 'Ife''s Loc Lab', 'Ifeoma', 'Nnaji', 'chair_rental', '9 Stamford New Road', 'Altrincham', 'WA14 1BL', 53.3878, -2.3490, null,
    array['locs'], array['loc-re-twist', 'loc-repair', 'loc-extensions'],
    'Precise re-twists and loc repairs in Altrincham. Ife keeps notes on every client''s loc journey.'),
  (28, 'Pressed by Monique', 'Monique', 'Daley', 'home_based', '18 Rowlandsway', 'Wythenshawe, Manchester', 'M22 5RS', 53.3800, -2.2640, null,
    array['natural'], array['silk-press', 'blow-dry', 'braid-out', 'hair-trim'],
    'Silk presses and stretched styles from a Wythenshawe home studio. Swim-season blow-outs a speciality.'),
  (29, 'Northside Braids', 'Bisi', 'Okonkwo', 'shop', '2 Bury New Road', 'Prestwich', 'M25 1AJ', 53.5330, -2.2840, null,
    array['braids', 'weaves'], array['box-braids', 'knotless-braids', 'ponytail-extension'],
    'Braids and sleek ponytails in Prestwich village. Bisi''s box braids are a north Manchester favourite.'),
  (30, 'Halo Hair Bar', 'Amina', 'Kamara', 'shop', '235 Wilmslow Road', 'Fallowfield, Manchester', 'M14 6LT', 53.4430, -2.2190, null,
    array['braids', 'wigs', 'treatments'], array['knotless-braids', 'goddess-braids', 'glueless-install', 'deep-conditioning'],
    'Braids, installs and a treatment menu, all under one roof on Wilmslow Road. Student discount on weekdays.');

-- signing up runs handle_new_user, which creates the profile, business, categories, hours and default policy
-- (the token columns must be '' not null, or Supabase Auth fails to list or load users)
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new)
select md5('tiwara-staging-seed-' || n)::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'staging-seed-' || n || '@example.com',
  jsonb_build_object(
    'account_type', 'stylist',
    'first_name', first_name,
    'last_name', last_name,
    'phone', '07700900' || lpad(n::text, 3, '0'),
    'terms_version', '2026-10',
    'stylist', jsonb_build_object(
      'business_name', business,
      'business_type', business_type,
      'line1', line1,
      'city', split_part(area, ', ', -1),
      'postcode', postcode,
      'lat', lat,
      'lng', lng,
      'area_label', area,
      'travel_radius_miles', radius,
      'categories', to_jsonb(groups),
      'contact_email', 'staging-seed-' || n || '@example.com'
    )
  ),
  '{}', now(), now(), now(), '', '', '', ''
from seed_stylist;

create temp table seeded on commit drop as
select seed_stylist.*, stylists.id as stylist_id
from seed_stylist
join public.stylists on stylists.owner_id = md5('tiwara-staging-seed-' || seed_stylist.n)::uuid;

-- covers cycle through the 8 dev covers; staggered created_at so "newest" has an order
update public.stylists
set bio = seeded.bio,
  cover_path = (array[
    'demo/stylists/w160944.jpg', 'demo/stylists/w161154.jpg', 'demo/stylists/IMG_0013.jpg', 'demo/stylists/w161244.jpg',
    'demo/stylists/w161942.jpg', 'demo/stylists/w162031.jpg', 'demo/stylists/w161512.jpg', 'demo/stylists/w160524.jpg'
  ])[(seeded.n - 1) % 8 + 1],
  availability_confirmed_at = now(),
  profile_confirmed_at = now(),
  created_at = now() - seeded.n * interval '2 days'
from seeded
where stylists.id = seeded.stylist_id;

-- swap the draft starter services for an active menu
delete from public.services where stylist_id in (select stylist_id from seeded);

insert into public.services (stylist_id, service_type_id, service_group_id, category_id, name, description,
  price_pence, duration_min, status, sort)
select seeded.stylist_id, service_types.id, service_types.group_id, stylist_categories.id, service_types.name,
  service_types.default_description,
  round(service_types.added_price_pence * (1.2 + (seeded.n % 6) * 0.08) / 500) * 500,
  service_types.default_minutes, 'active', picked.position - 1
from seeded
cross join unnest(seeded.services) with ordinality as picked (type_id, position)
join public.service_types on service_types.id = picked.type_id
join public.stylist_categories
  on stylist_categories.stylist_id = seeded.stylist_id and stylist_categories.service_group_id = service_types.group_id;

-- three hour patterns: the sign-up default (Mon–Fri 9–6, Sat 9–4), Tue–Sat 10–7, and Mon–Sat with a late Thursday
update public.working_hours
set is_open = case when seeded.n % 3 = 1 then weekday between 1 and 5 else weekday < 6 end,
  start_time = case when seeded.n % 3 = 1 then '10:00'::time else '09:00'::time end,
  end_time = case
    when seeded.n % 3 = 1 then '19:00'::time
    when seeded.n % 3 = 2 and weekday = 3 then '20:00'::time
    when seeded.n % 3 = 2 then '17:00'::time
    when weekday = 5 then '16:00'::time
    else '18:00'::time
  end
from seeded
where working_hours.stylist_id = seeded.stylist_id and seeded.n % 3 <> 0;

-- a second later than the sign-up default, so it's the current policy
insert into public.payment_policies (stylist_id, mode, deposit_percent, refundable, free_window_hours, grace_minutes, created_at)
select stylist_id,
  (array['deposit', 'deposit', 'card', 'none'])[n % 4 + 1],
  (array[20, 25, 0, 0])[n % 4 + 1],
  true,
  (array[48, 24, 24, 24])[n % 4 + 1],
  (array[0, 0, 15, 0])[n % 4 + 1],
  now() + interval '1 second'
from seeded;

-- last, because service and confirmation changes re-check go-live (these accounts have no Stripe or 2FA)
update public.stylists set status = 'live' where id in (select stylist_id from seeded);

end
$$;
