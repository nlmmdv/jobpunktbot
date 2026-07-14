-- Fix profiles table: ensure id has default value for auto-generation
ALTER TABLE profiles
ALTER COLUMN id SET DEFAULT gen_random_uuid();
