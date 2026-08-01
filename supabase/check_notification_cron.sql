select jobid, jobname, schedule, active from cron.job where jobname = 'pinky-send-due-reminders';
select * from cron.job_run_details where jobid in (select jobid from cron.job where jobname = 'pinky-send-due-reminders') order by start_time desc limit 20;
select id, status_code, error_msg, created from net._http_response order by created desc limit 20;
select delivery_status, count(*) from public.push_reminders group by delivery_status order by delivery_status;
