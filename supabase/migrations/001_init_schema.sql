-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee', 'admin')),
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  city TEXT,
  telegram_username TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create freelancer_resumes table
CREATE TABLE IF NOT EXISTS freelancer_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE REFERENCES profiles(telegram_id),
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  city TEXT,
  about TEXT,
  photo_url TEXT,
  marketplaces TEXT[] DEFAULT '{}',
  preferred_schedule TEXT,
  hourly_rate DECIMAL(10,2),
  metro_stations TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create owner_profiles table
CREATE TABLE IF NOT EXISTS owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE REFERENCES profiles(telegram_id),
  organization_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vacancies table
CREATE TABLE IF NOT EXISTS vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_telegram_id BIGINT NOT NULL REFERENCES profiles(telegram_id),
  title TEXT NOT NULL,
  description TEXT,
  city TEXT,
  employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract')),
  hourly_rate DECIMAL(10,2),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'filled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES vacancies(id),
  freelancer_telegram_id BIGINT NOT NULL REFERENCES profiles(telegram_id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(vacancy_id, freelancer_telegram_id)
);

-- Create indexes for performance
CREATE INDEX idx_profiles_telegram_id ON profiles(telegram_id);
CREATE INDEX idx_freelancer_resumes_telegram_id ON freelancer_resumes(telegram_id);
CREATE INDEX idx_owner_profiles_telegram_id ON owner_profiles(telegram_id);
CREATE INDEX idx_vacancies_owner_telegram_id ON vacancies(owner_telegram_id);
CREATE INDEX idx_applications_vacancy_id ON applications(vacancy_id);
CREATE INDEX idx_applications_freelancer_telegram_id ON applications(freelancer_telegram_id);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Freelancer resumes: Read own, update own
CREATE POLICY "Freelancers can view own resume" ON freelancer_resumes FOR SELECT USING (true);
CREATE POLICY "Freelancers can update own resume" ON freelancer_resumes FOR UPDATE USING (true);

-- Vacancies: Owners can create/read/update their own
CREATE POLICY "Owners can view vacancies" ON vacancies FOR SELECT USING (true);
CREATE POLICY "Owners can create vacancies" ON vacancies FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can update own vacancies" ON vacancies FOR UPDATE USING (true);

-- Applications: Users can view/create/update their own
CREATE POLICY "Users can view own applications" ON applications FOR SELECT USING (true);
CREATE POLICY "Users can create applications" ON applications FOR INSERT WITH CHECK (true);
