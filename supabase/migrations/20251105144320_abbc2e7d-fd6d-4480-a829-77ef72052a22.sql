-- Crear función security definer para obtener el email del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Eliminar política problemática y recrearla
DROP POLICY IF EXISTS "Users can view their own assessments" ON public.assessments;

-- Nueva política corregida usando la función
CREATE POLICY "Users can view their own assessments"
  ON public.assessments
  FOR SELECT
  USING (
    (auth.uid() = recruiter_id) OR
    (recruiter_id IS NULL AND creator_email = public.get_current_user_email())
  );