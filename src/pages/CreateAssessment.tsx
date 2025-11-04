import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

const PSYCHOMETRIC_TESTS = [
  { value: "mbti", label: "MBTI - Myers-Briggs Type Indicator" },
  { value: "disc", label: "DISC - Análisis de Comportamiento" },
  { value: "big_five", label: "Big Five - Los Cinco Grandes" },
  { value: "emotional_intelligence", label: "Inteligencia Emocional (EQ)" },
  { value: "rorschach", label: "Rorschach - Test de Manchas de Tinta" },
  { value: "mmpi", label: "MMPI - Inventario de Personalidad" },
  { value: "cattell_16pf", label: "16PF - 16 Factores de Personalidad" },
  { value: "hogan", label: "Hogan - Inventario de Personalidad" },
  { value: "caliper", label: "Caliper - Perfil de Personalidad" },
  { value: "wonderlic", label: "Wonderlic - Test de Aptitud Cognitiva" },
];

const CreateAssessment = () => {
  const [loading, setLoading] = useState(false);
  const [assessmentType, setAssessmentType] = useState<"skills" | "psychometric" | "">("");
  const [psychometricType, setPsychometricType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Validations
      if (!assessmentType) {
        throw new Error("Debes seleccionar un tipo de evaluación");
      }
      
      if (assessmentType === "skills" && !title.trim()) {
        throw new Error("Debes especificar el título de la evaluación");
      }
      
      if (assessmentType === "skills" && !description.trim()) {
        throw new Error("Debes especificar los detalles de la evaluación (incluye seniority y habilidades)");
      }
      
      if (assessmentType === "psychometric" && !psychometricType) {
        throw new Error("Debes seleccionar un tipo de test psicométrico");
      }

      // Create assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from("assessments")
        .insert([{
          recruiter_id: user.id,
          title: assessmentType === "skills" ? title : PSYCHOMETRIC_TESTS.find(t => t.value === psychometricType)?.label || "",
          description: assessmentType === "skills" ? description : "",
          assessment_type: assessmentType,
          custom_topic: assessmentType === "skills" ? description : null,
          psychometric_type: psychometricType || null,
        }] as any)
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      toast({
        title: "Generando preguntas...",
        description: "La IA está creando las preguntas de la evaluación.",
      });

      // Call edge function to generate questions
      const { data: generateData, error: generateError } = await supabase.functions.invoke(
        "generate-questions",
        {
          body: {
            assessmentId: assessment.id,
            assessmentType,
            topic: assessmentType === "skills" ? description : null,
            psychometricType,
          },
        }
      );

      if (generateError) {
        console.error("Error generating questions:", generateError);
        throw new Error("Error al generar las preguntas");
      }

      toast({
        title: "¡Evaluación creada!",
        description: "Las 20 preguntas han sido generadas con IA.",
      });

      navigate(`/assessment/${assessment.id}`);
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la evaluación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Crear Nueva Evaluación</CardTitle>
            </div>
            <CardDescription>
              La IA generará 20 preguntas personalizadas basadas en tus especificaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Evaluación *</Label>
                <Select
                  value={assessmentType}
                  onValueChange={(value: any) => {
                    setAssessmentType(value);
                    setTitle("");
                    setDescription("");
                    setPsychometricType("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de evaluación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skills">Hard & Soft Skills</SelectItem>
                    <SelectItem value="psychometric">Prueba Psicométrica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assessmentType === "skills" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title">Título de la Evaluación *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej: Evaluación Senior Developer React"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Detalles de la Evaluación *
                      <span className="text-sm text-muted-foreground ml-2">
                        (Incluye seniority y habilidades a evaluar)
                      </span>
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ej: Senior Developer con 5+ años de experiencia en React, TypeScript, Node.js. Evaluar arquitectura de componentes, gestión de estado, y mejores prácticas."
                      rows={4}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      La IA generará preguntas personalizadas basándose en estos detalles.
                    </p>
                  </div>
                </>
              )}

              {assessmentType === "psychometric" && (
                <div className="space-y-2">
                  <Label htmlFor="psychometric">Tipo de Test Psicométrico *</Label>
                  <Select value={psychometricType} onValueChange={setPsychometricType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un test" />
                    </SelectTrigger>
                    <SelectContent>
                      {PSYCHOMETRIC_TESTS.map((test) => (
                        <SelectItem key={test.value} value={test.value}>
                          {test.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {assessmentType && (
                <>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Detalles de la Evaluación
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 20 preguntas generadas por IA</li>
                    <li>• 4 opciones de respuesta por pregunta</li>
                    <li>• 50 segundos por pregunta</li>
                    <li>• Link único para compartir con candidatos</li>
                  </ul>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generando Evaluación con IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Crear Evaluación
                    </>
                  )}
                  </Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateAssessment;