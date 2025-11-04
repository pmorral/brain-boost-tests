-- Add language column to assessments table
ALTER TABLE assessments 
ADD COLUMN language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en'));