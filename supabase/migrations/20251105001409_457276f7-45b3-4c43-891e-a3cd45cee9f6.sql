-- Add column to store assigned question IDs for each candidate
ALTER TABLE candidates ADD COLUMN assigned_question_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN candidates.assigned_question_ids IS 'Array of question IDs (20 out of 50) assigned to this candidate';