-- Allow anyone to view assessments by share_link
CREATE POLICY "Anyone can view assessments by share link"
ON assessments
FOR SELECT
TO public
USING (share_link IS NOT NULL);

-- Allow anyone to view questions for assessments accessed by share_link
CREATE POLICY "Anyone can view questions by share link"
ON assessment_questions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM assessments
    WHERE assessments.id = assessment_questions.assessment_id
    AND assessments.share_link IS NOT NULL
  )
);