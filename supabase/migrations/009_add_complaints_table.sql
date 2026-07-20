-- Create complaints table for user reports
CREATE TABLE complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX idx_complaints_reported_user_id ON complaints(reported_user_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC);

-- Enable RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- User can see complaints against them, complaints they filed, or admins can see all
CREATE POLICY complaints_select ON complaints
  FOR SELECT
  USING (
    reported_user_id = auth.uid() OR
    reported_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('administrator', 'admin'))
  );

-- Only authenticated users can create complaints about others
CREATE POLICY complaints_insert ON complaints
  FOR INSERT
  WITH CHECK (reported_by = auth.uid() AND reported_user_id != auth.uid());

-- Only admins can update complaint status
CREATE POLICY complaints_update ON complaints
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('administrator', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('administrator', 'admin'))
  );
