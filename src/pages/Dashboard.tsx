import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, ClipboardList, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadAssessments(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadAssessments = async (userId: string) => {
    const { data, error } = await supabase
      .from("assessments")
      .select(`
        *,
        candidates(count)
      `)
      .eq("recruiter_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading assessments:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las evaluaciones",
        variant: "destructive",
      });
    } else {
      setAssessments(data || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">SkillEval AI</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Evaluaciones
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Candidatos Evaluados
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assessments.reduce((sum, a) => sum + (a.candidates?.[0]?.count || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tasa de Completado
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        </div>

        {/* Create New Assessment */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Crear Nueva Evaluación</CardTitle>
            <CardDescription>
              Genera una evaluación personalizada con IA para tus candidatos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate("/create-assessment")}
            >
              <Plus className="h-5 w-5 mr-2" />
              Nueva Evaluación
            </Button>
          </CardContent>
        </Card>

        {/* Assessments List */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Evaluaciones</CardTitle>
            <CardDescription>
              Gestiona tus evaluaciones y revisa los resultados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assessments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No has creado ninguna evaluación aún.</p>
                <p className="text-sm mt-2">¡Comienza creando tu primera evaluación!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <Card key={assessment.id} className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => navigate(`/assessment/${assessment.id}`)}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{assessment.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {assessment.description || "Sin descripción"}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {assessment.assessment_type.replace('_', ' ')}
                            </span>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                              {assessment.candidates?.[0]?.count || 0} candidatos
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Ver Detalles
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;