-- Hacer recruiter_id nullable y agregar campos para creación anónima
ALTER TABLE public.assessments 
  ALTER COLUMN recruiter_id DROP NOT NULL,
  ADD COLUMN creator_email TEXT,
  ADD COLUMN claimed BOOLEAN DEFAULT FALSE;

-- Actualizar RLS policies para permitir creación anónima
DROP POLICY IF EXISTS "Recruiters can create assessments" ON public.assessments;
DROP POLICY IF EXISTS "Recruiters can view their own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Recruiters can update their own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Recruiters can delete their own assessments" ON public.assessments;

-- Permitir INSERT anónimo si se proporciona creator_email
CREATE POLICY "Anyone can create assessments with email"
  ON public.assessments
  FOR INSERT
  WITH CHECK (
    (auth.uid() = recruiter_id) OR 
    (recruiter_id IS NULL AND creator_email IS NOT NULL)
  );

-- Permitir SELECT si es dueño autenticado O si el email coincide
CREATE POLICY "Users can view their own assessments"
  ON public.assessments
  FOR SELECT
  USING (
    (auth.uid() = recruiter_id) OR
    (recruiter_id IS NULL AND creator_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Permitir UPDATE solo para dueños autenticados
CREATE POLICY "Users can update their own assessments"
  ON public.assessments
  FOR UPDATE
  USING (auth.uid() = recruiter_id);

-- Permitir DELETE solo para dueños autenticados
CREATE POLICY "Users can delete their own assessments"
  ON public.assessments
  FOR DELETE
  USING (auth.uid() = recruiter_id);

-- Crear función para reclamar evaluaciones al hacer signup/login
CREATE OR REPLACE FUNCTION public.claim_assessments_by_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.assessments
  SET recruiter_id = NEW.id,
      claimed = TRUE
  WHERE creator_email = NEW.email
    AND recruiter_id IS NULL;
  RETURN NEW;
END;
$$;

-- Trigger para auto-reclamar evaluaciones cuando un usuario se registra
DROP TRIGGER IF EXISTS on_auth_user_created_claim_assessments ON auth.users;
CREATE TRIGGER on_auth_user_created_claim_assessments
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.claim_assessments_by_email();