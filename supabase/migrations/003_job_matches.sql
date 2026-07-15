-- Create job_matches table for freelancer-owner interactions
CREATE TABLE IF NOT EXISTS job_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id uuid REFERENCES vacancies(id) ON DELETE CASCADE,
  owner_telegram_id bigint NOT NULL REFERENCES profiles(telegram_id),
  freelancer_telegram_id bigint NOT NULL REFERENCES profiles(telegram_id),
  initiated_by text NOT NULL CHECK (initiated_by IN ('freelancer', 'owner')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (vacancy_id, freelancer_telegram_id)
);

CREATE INDEX idx_job_matches_owner ON job_matches(owner_telegram_id);
CREATE INDEX idx_job_matches_freelancer ON job_matches(freelancer_telegram_id);
CREATE INDEX idx_job_matches_status ON job_matches(status);
CREATE INDEX idx_job_matches_vacancy ON job_matches(vacancy_id);

-- Ensure telegram_username exists in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_username text;
