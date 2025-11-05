-- Add option_e column to assessment_questions table for Likert scale questions
ALTER TABLE public.assessment_questions 
ADD COLUMN option_e TEXT;