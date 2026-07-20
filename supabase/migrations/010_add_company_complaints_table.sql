-- Create company complaints table for user reports on companies
CREATE TABLE company_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_company_id uuid NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX idx_company_complaints_reported_company_id ON company_complaints(reported_company_id);
CREATE INDEX idx_company_complaints_status ON company_complaints(status);
CREATE INDEX idx_company_complaints_created_at ON company_complaints(created_at DESC);

-- Enable RLS
ALTER TABLE company_complaints ENABLE ROW LEVEL SECURITY;

-- User can see complaints against their company, complaints they filed, or admins can see all
CREATE POLICY company_complaints_select ON company_complaints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM owner_profiles
      WHERE owner_profiles.id = reported_company_id
      AND owner_profiles.telegram_id = auth.uid()::bigint
    ) OR
    reported_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('administrator', 'admin'))
  );

-- Only authenticated users can create complaints about companies
CREATE POLICY company_complaints_insert ON company_complaints
  FOR INSERT
  WITH CHECK (reported_by = auth.uid());

-- Only admins can update complaint status
CREATE POLICY company_complaints_update ON company_complaints
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('administrator', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('administrator', 'admin'))
  );
