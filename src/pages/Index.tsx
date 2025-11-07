import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Brain, ClipboardList, TrendingUp, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2"><Brain className="h-8 w-8 text-primary" /><span className="text-2xl font-bold">Puntú.ai</span></div>
        <Button onClick={() => navigate("/auth")} variant="outline">Ingresar</Button>
      </nav>
      
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">Evalúa Candidatos con IA</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Genera evaluaciones personalizadas de hard skills, soft skills y pruebas psicométricas en segundos</p>
          </div>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/create-assessment")} className="text-lg px-8"><Sparkles className="mr-2 h-5 w-5" />Crear Evaluación Gratuita</Button>
            <Button size="lg" onClick={() => navigate("/auth")} variant="outline" className="text-lg px-8">Ya tengo cuenta</Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="p-6 rounded-lg bg-card border"><ClipboardList className="h-12 w-12 text-primary mb-4" /><h3 className="font-semibold text-lg mb-2">20 Preguntas IA</h3><p className="text-sm text-muted-foreground">Generadas automáticamente para cada evaluación</p></div>
            <div className="p-6 rounded-lg bg-card border"><TrendingUp className="h-12 w-12 text-secondary mb-4" /><h3 className="font-semibold text-lg mb-2">Resultados Instantáneos</h3><p className="text-sm text-muted-foreground">Dashboard en tiempo real con análisis de desempeño</p></div>
            <div className="p-6 rounded-lg bg-card border"><Brain className="h-12 w-12 text-accent mb-4" /><h3 className="font-semibold text-lg mb-2">Tests Psicométricos</h3><p className="text-sm text-muted-foreground">MBTI, DISC, Big Five y 7 pruebas más</p></div>
          </div>
          
          <footer className="mt-20 text-center text-sm text-muted-foreground">
            <p>Desarrollado por <a href="https://hrleaders.lat/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-primary transition-colors">HR Leaders LATAM</a> y <a href="https://lapieza.io/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-primary transition-colors">LaPieza</a></p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Index;
