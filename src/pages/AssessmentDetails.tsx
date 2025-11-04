import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, ExternalLink, Loader2, Users, Award } from "lucide-react";

const AssessmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);

  useEffect(() => {
    loadAssessment();
    loadCandidates();
  }, [id]);

  const loadAssessment = async () => {
    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error loading assessment:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la evaluación",
        variant: "destructive",
      });
      navigate("/dashboard");
    } else {
      setAssessment(data);
    }
    setLoading(false);
  };

  const loadCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .eq("assessment_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading candidates:", error);
    } else {
      setCandidates(data || []);
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/take/${assessment.share_link}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "¡Link copiado!",
      description: "Comparte este link con tus candidatos",
    });
  };

  const openShareLink = () => {
    const link = `${window.location.origin}/take/${assessment.share_link}`;
    window.open(link, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Assessment Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{assessment.title}</CardTitle>
                <CardDescription>
                  {assessment.description || "Sin descripción"}
                </CardDescription>
                <div className="flex gap-2 mt-4">
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {assessment.assessment_type.replace('_', ' ')}
                  </span>
                  {assessment.custom_topic && (
                    <span className="text-xs bg-secondary/10 text-secondary px-3 py-1 rounded-full">
                      {assessment.custom_topic}
                    </span>
                  )}
                  {assessment.psychometric_type && (
                    <span className="text-xs bg-accent/10 text-accent px-3 py-1 rounded-full">
                      {assessment.psychometric_type.toUpperCase()}
                    </span>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Candidates Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Resultados de Candidatos
                </CardTitle>
                <CardDescription>
                  {candidates.length} candidato(s) han tomado esta evaluación
                </CardDescription>
              </CardHeader>
              <CardContent>
                {candidates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Aún no hay candidatos que hayan completado esta evaluación.</p>
                    <p className="text-sm mt-2">Comparte el link para comenzar a recibir resultados.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {candidates.map((candidate) => (
                      <Card key={candidate.id} className="overflow-hidden">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{candidate.full_name}</h4>
                              <p className="text-sm text-muted-foreground">{candidate.email}</p>
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Iniciado: {new Date(candidate.started_at).toLocaleString()}</span>
                                {candidate.completed_at && (
                                  <span>Completado: {new Date(candidate.completed_at).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                            {candidate.completed_at ? (
                              <div className="flex flex-col items-center gap-1">
                                <Award className="h-8 w-8 text-primary" />
                                <div className="text-center">
                                  <div className="text-2xl font-bold">
                                    {candidate.total_score || 0}
                                  </div>
                                  <div className="text-xs text-muted-foreground">/ 20</div>
                                </div>
                                <div className="text-xs font-semibold text-primary">
                                  {Math.round(((candidate.total_score || 0) / 20) * 100)}%
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-amber-600 font-medium">
                                En progreso...
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Share Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Compartir Evaluación</CardTitle>
                <CardDescription>
                  Envía este link a los candidatos para que tomen la evaluación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 break-all text-sm">
                  {window.location.origin}/take/{assessment.share_link}
                </div>
                <div className="space-y-2">
                  <Button onClick={copyShareLink} className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                  <Button onClick={openShareLink} variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Link
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Los candidatos no necesitan cuenta</p>
                  <p>• 20 preguntas con 40 segundos cada una</p>
                  <p>• Los resultados aparecen automáticamente aquí</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssessmentDetails;