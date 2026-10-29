create or replace function public.scrub_sent_notification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.payload := new.payload - array[
    'manage_url', 'save_details_url', 'secure_url', 'pay_url', 'review_url', 'appeal_url', 'confirm_url', 'update_url',
    'code'
  ];

  return new;
end;
$$;
