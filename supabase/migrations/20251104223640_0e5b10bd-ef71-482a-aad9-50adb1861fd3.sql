-- Update assessment_type enum to combine hard and soft skills
ALTER TYPE assessment_type RENAME TO assessment_type_old;

CREATE TYPE assessment_type AS ENUM ('skills', 'psychometric');

-- Update existing records
ALTER TABLE assessments 
  ALTER COLUMN assessment_type TYPE assessment_type 
  USING (
    CASE 
      WHEN assessment_type::text IN ('hard_skills', 'soft_skills') THEN 'skills'::assessment_type
      ELSE 'psychometric'::assessment_type
    END
  );

DROP TYPE assessment_type_old;