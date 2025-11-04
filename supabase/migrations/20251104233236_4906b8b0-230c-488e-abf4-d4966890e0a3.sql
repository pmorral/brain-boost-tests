-- Allow candidates to view their own entry after creation
CREATE POLICY "Candidates can view their own entry"
ON candidates
FOR SELECT
TO public
USING (true);