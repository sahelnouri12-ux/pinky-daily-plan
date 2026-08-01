-- Pinky Daily Plan 1.4.0 — schedule push delivery every minute.
-- 1) Replace BOTH placeholders below.
-- 2) Run this file in Supabase SQL Editor after schema.sql.
-- The URL must have no trailing slash.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

-- Replace or create the encrypted Vercel URL secret.
do $setup$
declare existing_id uuid;
begin
  select id into existing_id from vault.secrets where name = 'pinky_vercel_url' limit 1;
  if existing_id is null then
    perform vault.create_secret('https://YOUR-PROJECT.vercel.app', 'pinky_vercel_url', 'Pinky Daily Plan production URL');
  else
    perform vault.update_secret(existing_id, 'https://YOUR-PROJECT.vercel.app', 'pinky_vercel_url', 'Pinky Daily Plan production URL');
  end if;
end $setup$;

-- Must exactly match CRON_SECRET in Vercel Environment Variables.
do $setup$
declare existing_id uuid;
begin
  select id into existing_id from vault.secrets where name = 'pinky_cron_secret' limit 1;
  if existing_id is null then
    perform vault.create_secret('REPLACE_WITH_THE_SAME_CRON_SECRET_FROM_VERCEL', 'pinky_cron_secret', 'Authorizes the push delivery endpoint');
  else
    perform vault.update_secret(existing_id, 'REPLACE_WITH_THE_SAME_CRON_SECRET_FROM_VERCEL', 'pinky_cron_secret', 'Authorizes the push delivery endpoint');
  end if;
end $setup$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'pinky-send-due-reminders';

select cron.schedule(
  'pinky-send-due-reminders',
  '* * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'pinky_vercel_url' limit 1) || '/api/send-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'pinky_cron_secret' limit 1)
    ),
    body := jsonb_build_object('source', 'supabase-cron', 'requested_at', now()),
    timeout_milliseconds := 15000
  ) as request_id;
  $cron$
);

-- Confirmation: one row named pinky-send-due-reminders should appear.
select jobid, jobname, schedule, active from cron.job where jobname = 'pinky-send-due-reminders';
