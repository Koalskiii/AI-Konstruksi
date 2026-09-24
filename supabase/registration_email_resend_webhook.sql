alter table public.registration_requests
  add column if not exists email_notified_at timestamptz,
  add column if not exists email_notification_id text;

create index if not exists registration_requests_email_notified_idx
  on public.registration_requests (email_notified_at);

create or replace function public.notify_registration_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://kiyneeejluyqzvgdfljt.supabase.co/functions/v1/notify-registration',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'registration_requests',
      'schema', 'public',
      'record', to_jsonb(NEW),
      'old_record', null
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_NGf9sH1tagHPRfPJRcUvtg_vFJIPF6W'
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
end;
$$;

drop trigger if exists registration_requests_notify_email on public.registration_requests;

create trigger registration_requests_notify_email
after insert on public.registration_requests
for each row
execute function public.notify_registration_webhook();

revoke all on function public.notify_registration_webhook() from public, anon, authenticated;
