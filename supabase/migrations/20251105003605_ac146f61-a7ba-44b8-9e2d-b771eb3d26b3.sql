-- Change correct_answer column type to allow longer values like 'LIKERT'
ALTER TABLE public.assessment_questions 
ALTER COLUMN correct_answer TYPE TEXT;