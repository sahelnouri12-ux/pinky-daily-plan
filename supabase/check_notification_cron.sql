select jobid, schedule, active, jobname, command from cron.job where jobname='pinky-send-due-reminders';
select * from cron.job_run_details where jobid in (select jobid from cron.job where jobname='pinky-send-due-reminders') order by start_time desc limit 20;
select id,user_id,task_id,title,reminder_at,sent_at,delivery_status,attempt_count,last_error from public.push_reminders order by reminder_at desc limit 50;
