-- Create shifts table for completed/cancelled shifts history
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES profiles(id),
  owner_id UUID NOT NULL REFERENCES owner_profiles(id),
  vacancy_id UUID REFERENCES vacancies(id),
  location_address TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  total_hours DECIMAL(5,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_shifts_freelancer_id ON shifts(freelancer_id);
CREATE INDEX idx_shifts_owner_id ON shifts(owner_id);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_status ON shifts(status);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Freelancers can view their own shifts history
CREATE POLICY "Freelancers can view own shifts" ON shifts FOR SELECT
  USING (auth.uid() = freelancer_id);

-- Owners can view their shifts history
CREATE POLICY "Owners can view their shifts" ON shifts FOR SELECT
  USING (auth.uid() = owner_id);

-- Only admins can create/update/delete shifts (system-managed)
CREATE POLICY "Admins can manage shifts" ON shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrator'
    )
  );
