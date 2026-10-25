-- ==============================================================================
-- MathForesee User Profiles & Survey Responses Setup (RLS DISABLED)
-- Includes Statistical Analysis, Accuracy Test & Auto-Save Draft Tracking
-- ==============================================================================

-- QUICK FIX FOR EXISTING TABLES:
-- If you already created public.survey_responses before, run this ALTER block in Supabase SQL Editor:
alter table public.survey_responses 
  add column if not exists is_completed boolean default false,
  add column if not exists current_category text default 'concentration',
  add column if not exists error_rate numeric(5,2),
  add column if not exists prediction_accuracy numeric(5,2),
  add column if not exists concentration_description text,
  add column if not exists concentration_interpretation text,
  add column if not exists organizing_description text,
  add column if not exists organizing_interpretation text,
  add column if not exists anxiety_description text,
  add column if not exists anxiety_interpretation text,
  add column if not exists self_concept_description text,
  add column if not exists self_concept_interpretation text,
  add column if not exists updated_at timestamptz default timezone('utc'::text, now());

-- 1. Create the public.profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text not null,
  last_name text not null,
  middle_name text default 'N/A',
  suffix text default 'N/A',
  age integer check (age >= 5 and age <= 125),
  email text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Explicitly DISABLE Row Level Security on profiles
alter table public.profiles disable row level security;

-- 2. Create the public.survey_responses table (Supports In-Progress Drafts & Complete Results)
create table if not exists public.survey_responses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  
  -- Progress Status: false when in-progress draft, true when finished
  is_completed boolean default false,
  current_category text default 'concentration',
  
  -- Part I: Demographic Profile & Actual Grades
  sex text,
  age integer,
  grade_q1 numeric(5,2),
  grade_q2 numeric(5,2),
  grade_q3 numeric(5,2),
  average_grade numeric(5,2),
  predicted_grade numeric(5,2),
  monthly_income text,
  
  -- Statistical Accuracy Test (Formula: Error rate (%) = [|Actual - Predicted| / Actual] * 100)
  error_rate numeric(5,2),
  prediction_accuracy numeric(5,2),
  
  -- Part II: Non-Academic Factor Mean Scores (1.00 - 5.00 Scale)
  concentration_memory_score numeric(4,2),
  organizing_processing_score numeric(4,2),
  math_anxiety_score numeric(4,2),
  math_self_concept_score numeric(4,2),
  overall_factor_score numeric(4,2),
  
  -- Manifestation Interpretations & Research Descriptions
  concentration_description text,
  concentration_interpretation text,
  organizing_description text,
  organizing_interpretation text,
  anxiety_description text,
  anxiety_interpretation text,
  self_concept_description text,
  self_concept_interpretation text,
  
  -- Pedagogical Advice & Summary Interpretation
  interpretation text,
  advice text,
  
  -- Complete item-by-item responses stored as JSON
  answers jsonb default '{}'::jsonb,
  
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Explicitly DISABLE Row Level Security on survey_responses
alter table public.survey_responses disable row level security;

-- 3. Automated trigger to copy auth metadata to public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    middle_name,
    suffix,
    age,
    email,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'middle_name', 'N/A'),
    coalesce(new.raw_user_meta_data->>'suffix', 'N/A'),
    nullif(new.raw_user_meta_data->>'age', '')::integer,
    new.email,
    now(),
    now()
  )
  on conflict (id) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    middle_name = excluded.middle_name,
    suffix = excluded.suffix,
    age = excluded.age,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

-- 4. Attach trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();
