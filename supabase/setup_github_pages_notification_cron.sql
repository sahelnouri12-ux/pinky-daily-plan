-- Pinky Daily Plan 1.5.0 — Supabase Edge Function cron
-- Replace the TWO placeholders before running this in SQL Editor.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'pinky-send-due-reminders') then
    perform cron.unschedule('pinky-send-due-reminders');
  end if;
end $$;

select cron.schedule(
  'pinky-send-due-reminders',
  '* * * * *',
  $job$
    select net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-due-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', 'REPLACE_WITH_YOUR_CRON_SECRET'
      ),
      body := jsonb_build_object('source', 'supabase-cron', 'at', now())
    );
  $job$
);

select jobid, schedule, active, jobname from cron.job where jobname='pinky-send-due-reminders';
