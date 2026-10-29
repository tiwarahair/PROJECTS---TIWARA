begin;
select plan(3);

create temp table sent as
with queued as (
  insert into public.notifications (channel, to_address, template, payload)
  values ('email', 'ada@scrub.test', 'review_invite', jsonb_build_object(
    'review_url', 'https://x/review?token=a', 'appeal_url', 'https://x/appeal?token=b',
    'confirm_url', 'https://x/confirm?token=c', 'update_url', 'https://x/update?token=d',
    'studio_url', 'https://x/studio', 'ref', 'TH-SCRUB1'
  ))
  returning id
)
select id from queued;

select ok(
  (select payload ?& array['review_url', 'appeal_url', 'confirm_url', 'update_url']
    from public.notifications where id = (select id from sent)),
  'an unsent email keeps its links'
);

update public.notifications set status = 'sent' where id = (select id from sent);

select ok(
  (select not (payload ?| array['review_url', 'appeal_url', 'confirm_url', 'update_url'])
    from public.notifications where id = (select id from sent)),
  'once sent, the review, appeal, confirm and card-update links are gone'
);

select is(
  (select payload ->> 'studio_url' from public.notifications where id = (select id from sent)),
  'https://x/studio', 'links that open nothing on their own stay'
);

select * from finish();
rollback;
