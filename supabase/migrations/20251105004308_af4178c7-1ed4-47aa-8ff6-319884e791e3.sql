-- Add column to store psychometric analysis for candidates
ALTER TABLE public.candidates 
ADD COLUMN psychometric_analysis TEXT;