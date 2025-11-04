-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for assessment types
CREATE TYPE assessment_type AS ENUM ('hard_skills', 'soft_skills', 'psychometric');

-- Create enum for psychometric test types
CREATE TYPE psychometric_test_type AS ENUM (
  'mbti',           -- Myers-Briggs Type Indicator
  'disc',           -- DISC Assessment
  'big_five',       -- Big Five Personality Test
  'emotional_intelligence', -- EQ Test
  'rorschach',      -- Rorschach Inkblot Test
  'mmpi',           -- Minnesota Multiphasic Personality Inventory
  'cattell_16pf',   -- 16 Personality Factors
  'hogan',          -- Hogan Personality Inventory
  'caliper',        -- Caliper Profile
  'wonderlic'       -- Wonderlic Personnel Test
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assessment_type assessment_type NOT NULL,
  psychometric_type psychometric_test_type,
  custom_topic TEXT,
  share_link UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS on assessments
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Assessments policies
CREATE POLICY "Recruiters can view their own assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can create assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can update their own assessments"
  ON public.assessments FOR UPDATE
  USING (auth.uid() = recruiter_id);

CREATE POLICY "Recruiters can delete their own assessments"
  ON public.assessments FOR DELETE
  USING (auth.uid() = recruiter_id);

-- Create assessment_questions table
CREATE TABLE public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assessment_id, question_number)
);

-- Enable RLS on assessment_questions
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

-- Questions policies (recruiters can see questions for their assessments)
CREATE POLICY "Recruiters can view questions for their assessments"
  ON public.assessment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.recruiter_id = auth.uid()
    )
  );

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on candidates
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Candidates policies
CREATE POLICY "Recruiters can view candidates for their assessments"
  ON public.candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments
      WHERE assessments.id = candidates.assessment_id
      AND assessments.recruiter_id = auth.uid()
    )
  );

-- Public can insert candidates (when taking test)
CREATE POLICY "Anyone can create candidate entry"
  ON public.candidates FOR INSERT
  WITH CHECK (true);

-- Public can update their own candidate entry
CREATE POLICY "Candidates can update their own entry"
  ON public.candidates FOR UPDATE
  USING (true);

-- Create candidate_responses table
CREATE TABLE public.candidate_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  selected_answer CHAR(1) NOT NULL CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(candidate_id, question_id)
);

-- Enable RLS on candidate_responses
ALTER TABLE public.candidate_responses ENABLE ROW LEVEL SECURITY;

-- Responses policies
CREATE POLICY "Recruiters can view responses for their assessments"
  ON public.candidate_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates
      JOIN public.assessments ON assessments.id = candidates.assessment_id
      WHERE candidates.id = candidate_responses.candidate_id
      AND assessments.recruiter_id = auth.uid()
    )
  );

-- Public can insert responses when taking test
CREATE POLICY "Anyone can create responses"
  ON public.candidate_responses FOR INSERT
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();