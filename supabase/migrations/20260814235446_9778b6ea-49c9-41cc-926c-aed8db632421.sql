CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'generate-recurring-peladas',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--51a04721-fe87-4997-8b87-066f643e38b4.lovable.app/api/public/cron/recurring-peladas',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlaGZ1ZW9qaXNsaXF4d2Rsa3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NTc0NzUsImV4cCI6MjA5ODQzMzQ3NX0.2flE9ibnVC9tFGOlxz8FmyX3o89iNE9xYrnkYaIUWao"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) as request_id;
  $$
);