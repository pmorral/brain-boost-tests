import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentId, assessmentType, topic, psychometricType, language = 'es' } = await req.json();
    
    console.log('Generating questions for:', { assessmentId, assessmentType, topic, psychometricType, language });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build the prompt based on assessment type and language
    let systemPrompt = '';
    let userPrompt = '';
    const languageInstruction = language === 'en' 
      ? 'Generate all questions and answers in English.' 
      : 'Genera todas las preguntas y respuestas en español.';

    if (assessmentType === 'skills') {
      systemPrompt = language === 'en'
        ? `You are an expert assessment creator specializing in both technical and soft skills evaluation. Generate 50 CONCISE multiple-choice questions that can be answered in 40 seconds or less. Keep questions and answers SHORT and DIRECT. ${languageInstruction}`
        : `Eres un experto creador de evaluaciones especializado en habilidades técnicas y blandas. Genera 50 preguntas CONCISAS de opción múltiple que puedan responderse en 40 segundos o menos. Mantén las preguntas y respuestas CORTAS y DIRECTAS. ${languageInstruction}`;
      
      userPrompt = language === 'en'
        ? `Create 50 CONCISE assessment questions based on: ${topic}

CRITICAL: Questions must be answerable in 40 seconds. Keep everything SHORT:
- Question text: Maximum 2 lines
- Answer options: Maximum 1 line each
- Use simple, direct language

Analyze the requirements to determine the appropriate mix of:
- Technical/hard skills questions (testing practical knowledge, problem-solving, best practices)
- Soft skills questions (testing interpersonal abilities, emotional intelligence, professional behavior)
- Consider the seniority level mentioned to adjust difficulty appropriately

Each question must have:
- A BRIEF, clear question (no long scenarios or context)
- 4 SHORT answer options (A, B, C, D)
- Exactly one correct answer
- Progressive difficulty throughout the assessment

Format each question as JSON:
{
  "question": "brief question text",
  "options": {
    "A": "short option A",
    "B": "short option B", 
    "C": "short option C",
    "D": "short option D"
  },
  "correct": "A/B/C/D"
}

Return ONLY a JSON array of 50 questions. ${languageInstruction}`
        : `Crea 50 preguntas CONCISAS de evaluación basadas en: ${topic}

CRÍTICO: Las preguntas deben responderse en 40 segundos. Mantén todo CORTO:
- Texto de pregunta: Máximo 2 líneas
- Opciones de respuesta: Máximo 1 línea cada una
- Usa lenguaje simple y directo

Analiza los requisitos para determinar la combinación apropiada de:
- Preguntas de habilidades técnicas/hard skills (evaluando conocimiento práctico, resolución de problemas, mejores prácticas)
- Preguntas de habilidades blandas/soft skills (evaluando capacidades interpersonales, inteligencia emocional, comportamiento profesional)
- Considera el nivel de seniority mencionado para ajustar la dificultad apropiadamente

Cada pregunta debe tener:
- Una pregunta BREVE y clara (sin escenarios largos o contexto extenso)
- 4 opciones de respuesta CORTAS (A, B, C, D)
- Exactamente una respuesta correcta
- Dificultad progresiva a lo largo de la evaluación

Formatea cada pregunta como JSON:
{
  "question": "texto breve de la pregunta",
  "options": {
    "A": "opción A corta",
    "B": "opción B corta", 
    "C": "opción C corta",
    "D": "opción D corta"
  },
  "correct": "A/B/C/D"
}

Devuelve SOLAMENTE un array JSON de 50 preguntas. ${languageInstruction}`;
    } else if (assessmentType === 'psychometric') {
      const psychometricPrompts: Record<string, string> = {
        mbti: 'Myers-Briggs Type Indicator questions assessing personality preferences (Extraversion/Introversion, Sensing/Intuition, Thinking/Feeling, Judging/Perceiving)',
        disc: 'DISC assessment questions evaluating Dominance, Influence, Steadiness, and Conscientiousness behavioral styles',
        big_five: 'Big Five personality test questions measuring Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism',
        emotional_intelligence: 'Emotional Intelligence (EQ) questions assessing self-awareness, self-regulation, motivation, empathy, and social skills',
        rorschach: 'Perception and interpretation questions similar to inkblot analysis, assessing thought patterns and emotional responses',
        mmpi: 'Personality assessment questions identifying psychological conditions and personality structure',
        cattell_16pf: 'Sixteen Personality Factor questions measuring warmth, reasoning, emotional stability, dominance, and other personality traits',
        hogan: 'Personality inventory questions assessing reputation, values, and challenges in professional settings',
        caliper: 'Personality profile questions evaluating motivations, behaviors, and potential in work environments',
        wonderlic: 'Cognitive ability questions testing problem-solving, logical reasoning, and learning aptitude'
      };

      const psychDesc = psychometricPrompts[psychometricType || 'mbti'];
      systemPrompt = language === 'en'
        ? `You are an expert psychometric test designer. Generate 50 CONCISE multiple-choice questions that can be answered in 40 seconds or less. Keep questions and answers SHORT. ${languageInstruction}`
        : `Eres un diseñador experto en pruebas psicométricas. Genera 50 preguntas CONCISAS de opción múltiple que puedan responderse en 40 segundos o menos. Mantén las preguntas y respuestas CORTAS. ${languageInstruction}`;
      
      userPrompt = language === 'en'
        ? `Create 50 CONCISE psychometric questions for ${psychometricType?.toUpperCase()} assessment.

CRITICAL: Questions must be answerable in 40 seconds. Keep everything SHORT:
- Question text: Maximum 2 lines
- Answer options: Maximum 1 line each

Focus on: ${psychDesc}

Each question must:
- Be BRIEFLY worded to assess specific psychological traits
- Have 4 SHORT answer options with varying degrees of the measured trait
- One answer should be most indicative of the trait being measured
- Be professionally appropriate and unbiased

Format each question as JSON:
{
  "question": "brief question text",
  "options": {
    "A": "short option A",
    "B": "short option B",
    "C": "short option C",
    "D": "short option D"
  },
  "correct": "A/B/C/D"
}

Return ONLY a JSON array of 50 questions. ${languageInstruction}`
        : `Crea 50 preguntas psicométricas CONCISAS para la evaluación ${psychometricType?.toUpperCase()}.

CRÍTICO: Las preguntas deben responderse en 40 segundos. Mantén todo CORTO:
- Texto de pregunta: Máximo 2 líneas
- Opciones de respuesta: Máximo 1 línea cada una

Enfócate en: ${psychDesc}

Cada pregunta debe:
- Estar redactada BREVEMENTE para evaluar rasgos psicológicos específicos
- Tener 4 opciones de respuesta CORTAS con diferentes grados del rasgo medido
- Una respuesta debe ser la más indicativa del rasgo que se está midiendo
- Ser profesionalmente apropiada e imparcial

Formatea cada pregunta como JSON:
{
  "question": "texto breve de la pregunta",
  "options": {
    "A": "opción A corta",
    "B": "opción B corta",
    "C": "opción C corta",
    "D": "opción D corta"
  },
  "correct": "A/B/C/D"
}

Devuelve SOLAMENTE un array JSON de 50 preguntas. ${languageInstruction}`;
    }

    // Call Lovable AI
    console.log('Calling Lovable AI...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    console.log('AI response received');

    // Parse the JSON response
    let questions;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI-generated questions');
    }

    if (!Array.isArray(questions) || questions.length !== 50) {
      throw new Error('AI did not return exactly 50 questions');
    }

    // Insert questions into database
    console.log('Inserting questions into database...');
    const questionsToInsert = questions.map((q: any, index: number) => ({
      assessment_id: assessmentId,
      question_number: index + 1,
      question_text: q.question,
      option_a: q.options.A,
      option_b: q.options.B,
      option_c: q.options.C,
      option_d: q.options.D,
      correct_answer: q.correct,
    }));

    const { error: insertError } = await supabaseClient
      .from('assessment_questions')
      .insert(questionsToInsert);

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    console.log('Questions generated successfully');

    return new Response(
      JSON.stringify({ success: true, questionsCount: 50 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-questions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});