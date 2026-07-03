-- ============================================
-- AGENDAMENTO DIÁRIO DA EDGE FUNCTION alertas-diarios
-- ============================================
-- Requer as extensões pg_cron e pg_net (disponíveis no Supabase).
-- Após o deploy da função (`supabase functions deploy alertas-diarios`),
-- substitua <PROJECT_REF> e <SERVICE_ROLE_KEY> abaixo pelos valores do seu
-- projeto (Settings > API) antes de rodar esta migração.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'alertas-diarios-orcafamilia',
  '0 11 * * *', -- todos os dias às 11:00 UTC (08:00 BRT)
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/alertas-diarios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
