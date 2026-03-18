-- Move scheduled jobs from Vercel Cron to Supabase pg_cron + pg_net.
-- Run this in Supabase SQL Editor after replacing placeholders.
--
-- Replace these placeholders before running:
--   https://YOUR_BACKEND_URL
--   YOUR_CRON_SECRET
--
-- Times are in UTC.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove old jobs if they already exist.
do $$
declare
  reminder_job_id bigint;
  daily_job_id bigint;
begin
  select jobid into reminder_job_id from cron.job where jobname = 'hacktrack-reminder-dispatch';
  if reminder_job_id is not null then
    perform cron.unschedule(reminder_job_id);
  end if;

  select jobid into daily_job_id from cron.job where jobname = 'hacktrack-daily-deadlines';
  if daily_job_id is not null then
    perform cron.unschedule(daily_job_id);
  end if;
end
$$;

-- 06:00 UTC - send due reminders + today deadline alerts
select cron.schedule(
  'hacktrack-reminder-dispatch',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://hack-trackk-backend.vercel.app/api/cron/reminder-dispatch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer 3c65259151824d7789033ef8ed0786c1af01ffbf801f482f97ac734251ce820b',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 07:00 UTC - send daily digest for all hackathons
select cron.schedule(
  'hacktrack-daily-deadlines',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://hack-trackk-backend.vercel.app/api/cron/daily-deadlines',
    headers := jsonb_build_object(
      'Authorization', 'Bearer 3c65259151824d7789033ef8ed0786c1af01ffbf801f482f97ac734251ce820b',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verify scheduled jobs
select jobid, jobname, schedule, active
from cron.job
where jobname in ('hacktrack-reminder-dispatch', 'hacktrack-daily-deadlines')
order by jobname;
