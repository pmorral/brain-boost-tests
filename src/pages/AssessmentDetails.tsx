import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, ExternalLink, Loader2, Users, Award, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const AssessmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<any>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirigir a auth con return URL
        const returnUrl = `/assessment/${id}`;
        navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
        return;
      }

      setCheckingAuth(false);
      loadAssessment();
      loadQuestions();
      loadCandidates();
    };

    checkAuthAndLoad();
  }, [id, navigate]);

  const loadAssessment = async () => {
    const { data: assessmentData, error: assessmentError } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", id)
      .single();

    if (assessmentError) {
      console.error("Error loading assessment:", assessmentError);
      toast({
        title: "Error",
        description: "No se pudo cargar la evaluación",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }
      
    // Verificar permisos
    if (assessmentData) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const hasAccess = 
        assessmentData.recruiter_id === user.id || 
        (assessmentData.creator_email === user.email && !assessmentData.recruiter_id);

      if (!hasAccess) {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para ver esta evaluación",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }
    }
      
    setAssessment(assessmentData);
    setLoading(false);
  };

  const loadQuestions = async () => {
    const { data, error } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", id)
      .order("question_number", { ascending: true });

    if (error) {
      console.error("Error loading questions:", error);
    } else {
      setQuestions(data || []);
    }
  };

  const loadCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select(`
        *,
        candidate_responses(count)
      `)
      .eq("assessment_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading candidates:", error);
    } else {
      setCandidates(data || []);
    }
  };

  const loadCandidateDetails = async (candidateId: string) => {
    if (candidateDetails[candidateId]) return; // Already loaded

    const { data, error } = await supabase
      .from("candidate_responses")
      .select(`
        *,
        assessment_questions (
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          question_number
        )
      `)
      .eq("candidate_id", candidateId)
      .order("answered_at", { ascending: true });

    if (error) {
      console.error("Error loading candidate details:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles del candidato",
        variant: "destructive",
      });
    } else {
      setCandidateDetails(prev => ({
        ...prev,
        [candidateId]: data || []
      }));
    }
  };

  const toggleCandidateExpansion = async (candidateId: string) => {
    if (expandedCandidate === candidateId) {
      setExpandedCandidate(null);
    } else {
      setExpandedCandidate(candidateId);
      await loadCandidateDetails(candidateId);
    }
  };

  const getShareLink = () => {
    // Clean origin by removing any query parameters and ensuring proper domain
    const cleanOrigin = window.location.origin;
    return `${cleanOrigin}/take-assessment/${assessment.share_link}`;
  };

  const copyShareLink = () => {
    const link = getShareLink();
    navigator.clipboard.writeText(link);
    toast({
      title: "¡Link copiado!",
      description: "Comparte este link con tus candidatos",
    });
  };

  const openShareLink = () => {
    const link = getShareLink();
    window.open(link, "_blank");
  };

  if (checkingAuth || loading) {
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

            {/* Generated Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Preguntas Generadas por IA</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowQuestions(!showQuestions)}
                  >
                    {showQuestions ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                    {showQuestions ? "Ocultar" : "Ver"} Preguntas
                  </Button>
                </CardTitle>
                <CardDescription>
                  {questions.length} preguntas generadas (cada candidato verá 20 aleatorias)
                </CardDescription>
              </CardHeader>
              {showQuestions && (
                <CardContent>
                  <div className="space-y-4">
                     {questions.map((question, index) => {
                      const isLikert = question.correct_answer === 'LIKERT';
                      const options = isLikert 
                        ? { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d, E: question.option_e }
                        : { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d };
                        
                      return (
                        <div key={question.id} className="border rounded-lg p-4 bg-muted/30">
                          <p className="font-semibold mb-3">
                            {question.question_number}. {question.question_text}
                          </p>
                          {isLikert && (
                            <p className="text-xs text-muted-foreground mb-2 italic">
                              Escala Likert - No hay respuesta correcta
                            </p>
                          )}
                          <div className="grid grid-cols-1 gap-2 text-sm ml-4">
                            {Object.entries(options).map(([key, value]) => (
                              <div key={key} className={`py-2 px-3 rounded ${
                                !isLikert && question.correct_answer === key 
                                  ? 'bg-green-100 dark:bg-green-950 border border-green-300 font-semibold' 
                                  : 'bg-background'
                              }`}>
                                {key}) {value}
                                {!isLikert && question.correct_answer === key && ' ✓ Correcta'}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
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
                    {candidates.map((candidate) => {
                      const questionsAnswered = candidate.candidate_responses?.[0]?.count || 0;
                      const wasInterrupted = candidate.completed_at && questionsAnswered < 20;
                      const isExpanded = expandedCandidate === candidate.id;
                      const details = candidateDetails[candidate.id] || [];
                      
                      return (
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
                                {wasInterrupted && (
                                  <div className="mt-2 bg-amber-50 dark:bg-amber-950 border border-amber-500 rounded px-3 py-2">
                                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                                      ⚠️ Evaluación interrumpida: El candidato salió de la pestaña o violó las medidas de seguridad.
                                    </p>
                                    <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                                      Respondió solo {questionsAnswered} de 20 preguntas
                                    </p>
                                  </div>
                                )}
                              </div>
                              {candidate.completed_at ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Award className="h-8 w-8 text-primary" />
                                  <div className="text-center">
                                    {candidate.total_score !== null ? (
                                      <>
                                        <div className="text-2xl font-bold">
                                          {candidate.total_score || 0}
                                        </div>
                                        <div className="text-xs text-muted-foreground">/ 20</div>
                                        <div className="text-xs font-semibold text-primary">
                                          {Math.round(((candidate.total_score || 0) / 20) * 100)}%
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="text-2xl font-bold">N/A</div>
                                        <div className="text-xs text-muted-foreground">Psicométrica</div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-amber-600 font-medium">
                                  En progreso...
                                </div>
                              )}
                            </div>
                            
                            {candidate.completed_at && (
                              <Collapsible open={isExpanded} onOpenChange={() => toggleCandidateExpansion(candidate.id)}>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" className="w-full mt-4 justify-between">
                                    <span>Ver respuestas detalladas</span>
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-4 space-y-3">
                                  {details.length === 0 ? (
                                    <div className="text-center py-4">
                                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                    </div>
                                  ) : (
                                    <>
                                      {candidate.psychometric_analysis && candidate.total_score === null && (
                                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-300 rounded-lg p-4 mb-4">
                                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                            <Award className="h-5 w-5" />
                                            Análisis Psicométrico por IA
                                          </h4>
                                          <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                                            {candidate.psychometric_analysis}
                                          </p>
                                        </div>
                                      )}
                                      {details.map((response: any, index: number) => {
                                      const question = response.assessment_questions;
                                      const isLikert = question.correct_answer === 'LIKERT';
                                      const options = isLikert 
                                        ? { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d, E: question.option_e }
                                        : { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d };
                                      
                                      return (
                                        <div key={response.id} className={`border rounded-lg p-4 ${
                                          isLikert 
                                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300' 
                                            : response.is_correct 
                                            ? 'bg-green-50 dark:bg-green-950/20 border-green-300' 
                                            : 'bg-red-50 dark:bg-red-950/20 border-red-300'
                                        }`}>
                                          <div className="flex items-start gap-2 mb-2">
                                            {isLikert ? (
                                              <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mt-0.5 flex-shrink-0">
                                                L
                                              </div>
                                            ) : response.is_correct ? (
                                              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                            ) : (
                                              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                            )}
                                            <div className="flex-1">
                                              <p className="font-semibold text-sm mb-2">
                                                Pregunta {question.question_number}: {question.question_text}
                                              </p>
                                              {isLikert && (
                                                <p className="text-xs text-muted-foreground mb-2 italic">
                                                  Escala Likert - Sin respuesta correcta
                                                </p>
                                              )}
                                              <div className="grid grid-cols-1 gap-1 text-sm">
                                                {Object.entries(options).map(([key, value]) => (
                                                  <div key={key} className={`py-1 px-2 rounded ${
                                                    isLikert 
                                                      ? key === response.selected_answer
                                                        ? 'bg-blue-200 dark:bg-blue-900 font-semibold'
                                                        : ''
                                                      : key === response.selected_answer && key === question.correct_answer
                                                        ? 'bg-green-200 dark:bg-green-900 font-semibold'
                                                        : key === response.selected_answer
                                                        ? 'bg-red-200 dark:bg-red-900 font-semibold'
                                                        : key === question.correct_answer
                                                        ? 'bg-green-100 dark:bg-green-950 font-medium'
                                                        : ''
                                                  }`}>
                                                    {key}) {value}
                                                    {key === response.selected_answer && (isLikert ? ' ← Respuesta seleccionada' : ' ← Respuesta del candidato')}
                                                    {!isLikert && key === question.correct_answer && key !== response.selected_answer && ' ← Respuesta correcta'}
                                                  </div>
                                                ))}
                                              </div>
                                              <p className="text-xs text-muted-foreground mt-2">
                                                Tiempo: {response.time_taken_seconds}s
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </>
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
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
                  {getShareLink()}
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