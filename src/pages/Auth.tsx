import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Función para reclamar evaluaciones manualmente
  const claimAssessments = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .update({ 
          recruiter_id: userId, 
          claimed: true 
        })
        .eq('creator_email', email)
        .is('recruiter_id', null)
        .select();

      if (!error && data && data.length > 0) {
        toast({
          title: "¡Evaluaciones vinculadas!",
          description: `Se han asociado ${data.length} evaluación(es) a tu cuenta`,
        });
      }
    } catch (error) {
      console.error('Error claiming assessments:', error);
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const redirectUrl = searchParams.get('redirect');
        navigate(redirectUrl || "/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && event === "SIGNED_IN") {
        // Intentar reclamar evaluaciones al iniciar sesión
        await claimAssessments(session.user.id, session.user.email!);
        
        const redirectUrl = searchParams.get('redirect');
        setTimeout(() => {
          navigate(redirectUrl || "/dashboard");
        }, 1000);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-primary/5 px-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Puntu.ai
          </h1>
          <p className="text-muted-foreground">
            Plataforma de evaluación de candidatos con IA
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Desarrollado por HR Leaders LATAM y LaPieza
          </p>
        </div>
        <AuthForm 
          mode={mode} 
          onToggleMode={() => setMode(mode === "signin" ? "signup" : "signin")}
          defaultEmail={searchParams.get('email') || undefined}
        />
      </div>
    </div>
  );
};

export default Auth;