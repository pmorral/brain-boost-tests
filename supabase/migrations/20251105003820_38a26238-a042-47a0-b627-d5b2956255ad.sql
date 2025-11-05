-- Remove the old constraint that only allows A, B, C, D
ALTER TABLE public.assessment_questions 
DROP CONSTRAINT IF EXISTS assessment_questions_correct_answer_check;

-- Add new constraint that allows A, B, C, D, E, and LIKERT
ALTER TABLE public.assessment_questions 
ADD CONSTRAINT assessment_questions_correct_answer_check 
CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E', 'LIKERT'));