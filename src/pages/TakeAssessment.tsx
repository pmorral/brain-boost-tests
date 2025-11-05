import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Timer, CheckCircle2 } from "lucide-react";

const TakeAssessment = () => {
  const { shareLink } = useParams();
  const { toast } = useToast();
  const [step, setStep] = useState<"info" | "test" | "complete">("info");
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [candidateId, setCandidateId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [responses, setResponses] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const isCompletedRef = useRef(false);

  useEffect(() => {
    // Detect if device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword)) || 
                            (window.innerWidth <= 768);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    loadAssessment();
    
    // Prevent screenshots and screen recording
    const preventScreenCapture = () => {
      document.addEventListener('keyup', (e) => {
        // Prevent Print Screen
        if (e.key === 'PrintScreen') {
          navigator.clipboard.writeText('');
          toast({ title: "Advertencia", description: "Las capturas de pantalla están deshabilitadas", variant: "destructive" });
        }
      });
      
      // Prevent common screenshot shortcuts
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) ||
            (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))) {
          e.preventDefault();
          toast({ title: "Advertencia", description: "Las capturas de pantalla están deshabilitadas", variant: "destructive" });
        }
      });
    };

    // Disable right-click
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
      toast({ title: "Advertencia", description: "Clic derecho deshabilitado", variant: "destructive" });
    };

    // Disable copy
    const disableCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({ title: "Advertencia", description: "Copiar texto está deshabilitado", variant: "destructive" });
    };

    // Disable text selection
    const disableSelection = () => {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    };

    preventScreenCapture();
    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('copy', disableCopy);
    disableSelection();

    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('copy', disableCopy);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [shareLink, toast]);

  useEffect(() => {
    if (step === "test" && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === "test" && timeLeft === 0) {
      handleAnswer("");
    }
  }, [step, timeLeft]);

  // Reset selected answer when question changes
  useEffect(() => {
    setSelectedAnswer("");
  }, [currentQuestion]);

  useEffect(() => {
    if (step !== "test") return;

    const handleVisibilityChange = async () => {
      // Don't trigger if assessment was already completed normally
      if (document.hidden && !isCompletedRef.current) {
        toast({
          title: "Evaluación Terminada",
          description: "Saliste de la pestaña. La evaluación ha finalizado.",
          variant: "destructive",
        });

        // Terminar la evaluación inmediatamente
        await supabase
          .from("candidates")
          .update({
            completed_at: new Date().toISOString(),
            total_score: score,
          })
          .eq("id", candidateId);

        setStep("complete");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [step, candidateId, score, toast]);

  const loadAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from("assessments")
        .select("*, assessment_questions(*)")
        .eq("share_link", shareLink)
        .maybeSingle();

      if (error) {
        console.error("Error loading assessment:", error);
        toast({ title: "Error", description: "Error al cargar la evaluación", variant: "destructive" });
      } else if (!data) {
        toast({ title: "Error", description: "Evaluación no encontrada", variant: "destructive" });
      } else if (!data.assessment_questions || data.assessment_questions.length === 0) {
        toast({ 
          title: "Evaluación en preparación", 
          description: "Las preguntas se están generando. Por favor espera unos segundos y recarga la página.", 
          variant: "default" 
        });
      } else {
        setAssessment(data);
        const sortedQuestions = data.assessment_questions?.sort((a: any, b: any) => a.question_number - b.question_number) || [];
        setQuestions(sortedQuestions);
      }
    } catch (err) {
      console.error("Exception loading assessment:", err);
      toast({ title: "Error", description: "Error inesperado al cargar la evaluación", variant: "destructive" });
    }
    setLoading(false);
  };

  const startTest = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast({ title: "Error", description: "Completa todos los campos", variant: "destructive" });
      return;
    }

    // Randomly select 20 questions from all 50
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 20);
    const questionIds = selectedQuestions.map(q => q.id);

    const { data, error } = await supabase
      .from("candidates")
      .insert([{ 
        assessment_id: assessment.id, 
        full_name: fullName, 
        email, 
        started_at: new Date().toISOString(),
        assigned_question_ids: questionIds
      }] as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "No se pudo iniciar la evaluación", variant: "destructive" });
    } else {
      setCandidateId(data.id);
      setQuestions(selectedQuestions); // Use only the 20 selected questions
      setStep("test");
    }
  };

  const handleAnswer = async (answer: string) => {
    setSelectedAnswer(answer);
    
    // Small visual delay so user sees their selection
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const question = questions[currentQuestion];
    const isLikert = question.correct_answer === 'LIKERT';
    const isCorrect = isLikert ? null : answer === question.correct_answer;
    
    await supabase.from("candidate_responses").insert([{
      candidate_id: candidateId,
      question_id: question.id,
      selected_answer: answer || "A",
      is_correct: isCorrect !== null ? isCorrect : false,
      time_taken_seconds: 40 - timeLeft,
    }] as any);

    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);
    setResponses([...responses, answer]);

    if (currentQuestion < 19) {
      setCurrentQuestion(currentQuestion + 1);
      setTimeLeft(40);
    } else {
      // Mark as completed BEFORE changing step to prevent visibility handler from triggering
      isCompletedRef.current = true;
      
      // Save completion data first, then show complete screen
      const finalScore = isLikert ? null : newScore;
      await supabase.from("candidates").update({ 
        completed_at: new Date().toISOString(), 
        total_score: finalScore 
      }).eq("id", candidateId);
      
      // Now show complete screen
      setStep("complete");
      
      // If it's a Likert assessment, trigger AI analysis in background
      if (isLikert) {
        supabase.functions.invoke('analyze-psychometric', {
          body: { candidateId }
        }).catch(error => console.error('Error triggering psychometric analysis:', error));
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8 space-y-4">
            <h2 className="text-2xl font-bold">Evaluación no encontrada</h2>
            <p className="text-muted-foreground">El link que estás intentando usar no es válido o la evaluación ya no está disponible.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show mobile-only message if accessed from desktop
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8 space-y-6">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Solo Dispositivos Móviles</h2>
              <p className="text-muted-foreground">
                Por razones de seguridad, esta evaluación solo puede ser tomada desde un dispositivo móvil (teléfono o tablet).
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-500 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                📱 Instrucciones:
              </h3>
              <ol className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-decimal list-inside">
                <li>Copia este link en tu dispositivo móvil</li>
                <li>Abre el link desde tu teléfono o tablet</li>
                <li>Completa la evaluación desde allí</li>
              </ol>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-xs text-muted-foreground break-all">
                {window.location.href}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Esta medida ayuda a prevenir fraudes y garantiza la integridad de la evaluación.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-primary/5 flex items-center justify-center p-4">
      {step === "info" && (
        <Card className="w-full max-w-lg">
          <CardHeader><CardTitle>{assessment?.title}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Nombre Completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            
            <div className="bg-amber-50 dark:bg-amber-950 border-2 border-amber-500 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                ⚠️ Medidas de Seguridad Obligatorias
              </h3>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                <li>Esta evaluación está protegida contra fraudes</li>
                <li>Las capturas de pantalla están bloqueadas</li>
                <li>No puedes copiar ni pegar texto</li>
                <li>Si cambias de pestaña, la prueba terminará automáticamente</li>
                <li><strong>PROHIBIDO usar ayuda de terceros o herramientas externas</strong></li>
                <li>Cualquier violación será detectada y reportada</li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded space-y-1 text-sm">
              <p className="font-semibold mb-2">Detalles de la Evaluación:</p>
              <p>• 20 preguntas (seleccionadas aleatoriamente)</p>
              <p>• 40 segundos por pregunta</p>
              <p>• No podrás volver atrás</p>
            </div>
            
            <Button onClick={startTest} className="w-full">Acepto las Condiciones - Comenzar Evaluación</Button>
          </CardContent>
        </Card>
      )}

      {step === "test" && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Pregunta {currentQuestion + 1} de 20</span>
              <div className="flex items-center gap-2 text-primary font-semibold"><Timer className="h-4 w-4" />{timeLeft}s</div>
            </div>
            <Progress value={(currentQuestion / 20) * 100} />
          </CardHeader>
          <CardContent className="space-y-6">
            <CardTitle className="text-lg">{questions[currentQuestion]?.question_text}</CardTitle>
            <div className="space-y-3">
              {questions[currentQuestion]?.correct_answer === 'LIKERT' 
                ? ["A", "B", "C", "D", "E"].map((option) => (
                    <Button 
                      key={option} 
                      variant={selectedAnswer === option ? "default" : "outline"} 
                      className="w-full justify-start text-left h-auto py-4" 
                      onClick={() => handleAnswer(option)}
                    >
                      <span className="font-bold mr-3">{option}.</span> {questions[currentQuestion]?.[`option_${option.toLowerCase()}`]}
                    </Button>
                  ))
                : ["A", "B", "C", "D"].map((option) => (
                    <Button 
                      key={option} 
                      variant={selectedAnswer === option ? "default" : "outline"} 
                      className="w-full justify-start text-left h-auto py-4" 
                      onClick={() => handleAnswer(option)}
                    >
                      <span className="font-bold mr-3">{option}.</span> {questions[currentQuestion]?.[`option_${option.toLowerCase()}`]}
                    </Button>
                  ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8 space-y-6">
            <CheckCircle2 className="h-16 w-16 text-secondary mx-auto" />
            <div><h2 className="text-3xl font-bold">¡Evaluación Completada!</h2><p className="text-muted-foreground mt-2">Gracias por completar la evaluación</p></div>
            {questions[0]?.correct_answer === 'LIKERT' ? (
              <div className="bg-primary/10 rounded-lg p-6">
                <div className="text-4xl font-bold text-primary">N/A</div>
                <div className="text-sm text-muted-foreground mt-2">Evaluación psicométrica</div>
                <p className="text-sm mt-4">Esta evaluación no tiene puntuación. El reclutador analizará tus respuestas para entender tu perfil.</p>
              </div>
            ) : (
              <div className="bg-primary/10 rounded-lg p-6"><div className="text-5xl font-bold text-primary">{score}/20</div><div className="text-sm text-muted-foreground mt-2">Respuestas correctas</div><div className="text-2xl font-semibold text-primary mt-2">{Math.round((score / 20) * 100)}%</div></div>
            )}
            <p className="text-sm text-muted-foreground">Los resultados han sido enviados al reclutador.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TakeAssessment;