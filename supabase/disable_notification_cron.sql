select cron.unschedule(jobid) from cron.job where jobname = 'pinky-send-due-reminders';
