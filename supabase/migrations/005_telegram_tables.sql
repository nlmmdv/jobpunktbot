-- Rename vacancies to owner_vacancies to match code expectations
ALTER TABLE vacancies RENAME TO owner_vacancies;

-- Update indexes after rename
ALTER INDEX idx_vacancies_owner_telegram_id RENAME TO idx_owner_vacancies_owner_telegram_id;
ALTER INDEX idx_vacancies_city RENAME TO idx_owner_vacancies_city;

-- Create telegram_message_logs table for logging sent messages
CREATE TABLE IF NOT EXISTS telegram_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL REFERENCES profiles(telegram_id),
  message_text text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  telegram_response jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for lookups
CREATE INDEX idx_telegram_message_logs_telegram_id ON telegram_message_logs(telegram_id);
CREATE INDEX idx_telegram_message_logs_sent_at ON telegram_message_logs(sent_at);

-- Update job_matches foreign key to reference owner_vacancies
ALTER TABLE job_matches DROP CONSTRAINT job_matches_vacancy_id_fkey;
ALTER TABLE job_matches ADD CONSTRAINT job_matches_vacancy_id_fkey
  FOREIGN KEY (vacancy_id) REFERENCES owner_vacancies(id) ON DELETE CASCADE;
