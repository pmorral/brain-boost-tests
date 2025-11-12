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
    
    // Validate topic length to prevent AI API errors
    if (topic && topic.length > 5000) {
      throw new Error('Topic exceeds maximum length of 5000 characters');
    }
    
    console.log('Generating questions for:', { assessmentId, assessmentType, topic: topic ? `${topic.substring(0, 100)}...` : null, psychometricType, language });

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

DIFFICULTY LEVEL:
- Default to SENIOR level difficulty unless the requirements explicitly mention junior or mid-level
- Senior questions should test deep understanding, best practices, and real-world scenarios
- Consider the seniority level mentioned to adjust difficulty appropriately

Analyze the requirements to determine the appropriate mix of:
- Technical/hard skills questions (testing practical knowledge, problem-solving, best practices)
- Soft skills questions (testing interpersonal abilities, emotional intelligence, professional behavior)

Each question must have:
- A BRIEF, clear question (no long scenarios or context)
- 4 SHORT answer options (A, B, C, D)
- Exactly one correct answer
- Progressive difficulty throughout the assessment

CRITICAL - CORRECT ANSWER DISTRIBUTION (MANDATORY):
You MUST ensure the correct answers are distributed as follows:
- Approximately 12-13 questions with "A" as correct answer
- Approximately 12-13 questions with "B" as correct answer  
- Approximately 12-13 questions with "C" as correct answer
- Approximately 12-13 questions with "D" as correct answer
This is NOT optional - you MUST randomize and vary which option is correct.
DO NOT make most answers "B" or favor any single letter.

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

NIVEL DE DIFICULTAD:
- Por defecto usa nivel SENIOR a menos que los requisitos mencionen explícitamente nivel junior o mid-level
- Las preguntas senior deben evaluar comprensión profunda, mejores prácticas y escenarios del mundo real
- Considera el nivel de seniority mencionado para ajustar la dificultad apropiadamente

Analiza los requisitos para determinar la combinación apropiada de:
- Preguntas de habilidades técnicas/hard skills (evaluando conocimiento práctico, resolución de problemas, mejores prácticas)
- Preguntas de habilidades blandas/soft skills (evaluando capacidades interpersonales, inteligencia emocional, comportamiento profesional)

Cada pregunta debe tener:
- Una pregunta BREVE y clara (sin escenarios largos o contexto extenso)
- 4 opciones de respuesta CORTAS (A, B, C, D)
- Exactamente una respuesta correcta
- Dificultad progresiva a lo largo de la evaluación

CRÍTICO - DISTRIBUCIÓN DE RESPUESTAS CORRECTAS (OBLIGATORIO):
DEBES asegurar que las respuestas correctas se distribuyan de la siguiente manera:
- Aproximadamente 12-13 preguntas con "A" como respuesta correcta
- Aproximadamente 12-13 preguntas con "B" como respuesta correcta
- Aproximadamente 12-13 preguntas con "C" como respuesta correcta  
- Aproximadamente 12-13 preguntas con "D" como respuesta correcta
Esto NO es opcional - DEBES aleatorizar y variar qué opción es la correcta.
NO hagas que la mayoría de respuestas sean "B" ni favorezcas ninguna letra en particular.

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
      // Determine if test uses Likert scale (no correct answers) or has correct answers
      const likertTests = ['mbti', 'disc', 'big_five', 'emotional_intelligence', 'rorschach', 'mmpi', 'cattell_16pf', 'hogan', 'caliper'];
      const usesLikert = likertTests.includes(psychometricType || '');
      
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
      
      if (usesLikert) {
        systemPrompt = language === 'en'
          ? `You are an expert psychometric test designer. Generate 50 CONCISE Likert-scale questions that can be answered in 40 seconds or less. Keep questions SHORT. ${languageInstruction}`
          : `Eres un diseñador experto en pruebas psicométricas. Genera 50 preguntas CONCISAS con escala Likert que puedan responderse en 40 segundos o menos. Mantén las preguntas CORTAS. ${languageInstruction}`;
        
        userPrompt = language === 'en'
          ? `Create 50 CONCISE psychometric questions for ${psychometricType?.toUpperCase()} assessment using a Likert scale.

CRITICAL: Questions must be answerable in 40 seconds. Keep everything SHORT:
- Question text: Maximum 2 lines
- Use a 5-point Likert scale

Focus on: ${psychDesc}

Each question must:
- Be a BRIEF statement about personality traits, behaviors, or preferences
- There is NO correct answer - all options are valid responses
- Be professionally appropriate and unbiased

Use this Likert scale format:
A = "Strongly Disagree" / "Totalmente en desacuerdo"
B = "Disagree" / "En desacuerdo"  
C = "Neutral" / "Neutral"
D = "Agree" / "De acuerdo"
E = "Strongly Agree" / "Totalmente de acuerdo"

CRITICAL - JSON FORMAT:
You MUST return EXACTLY this JSON structure for each question:
{
  "question": "brief statement text",
  "correct": "LIKERT"
}

DO NOT include an "options" field. DO NOT include separate A, B, C, D fields.
The format is: question text + correct field set to "LIKERT" string.

Return ONLY a JSON array of 50 questions with this exact structure. ${languageInstruction}`
          : `Crea 50 preguntas psicométricas CONCISAS para la evaluación ${psychometricType?.toUpperCase()} usando escala Likert.

CRÍTICO: Las preguntas deben responderse en 40 segundos. Mantén todo CORTO:
- Texto de pregunta: Máximo 2 líneas
- Usa una escala Likert de 5 puntos

Enfócate en: ${psychDesc}

Cada pregunta debe:
- Ser una afirmación BREVE sobre rasgos de personalidad, comportamientos o preferencias
- NO hay respuesta correcta - todas las opciones son respuestas válidas
- Ser profesionalmente apropiada e imparcial

Usa este formato de escala Likert:
A = "Totalmente en desacuerdo"
B = "En desacuerdo"
C = "Neutral"
D = "De acuerdo"
E = "Totalmente de acuerdo"

CRÍTICO - FORMATO JSON:
DEBES devolver EXACTAMENTE esta estructura JSON para cada pregunta:
{
  "question": "texto breve de la afirmación",
  "correct": "LIKERT"
}

NO incluyas un campo "options". NO incluyas campos separados A, B, C, D.
El formato es: texto de pregunta + campo correct establecido como string "LIKERT".

Devuelve SOLAMENTE un array JSON de 50 preguntas con esta estructura exacta. ${languageInstruction}`;
      } else {
        // Wonderlic - cognitive test with correct answers
        systemPrompt = language === 'en'
          ? `You are an expert psychometric test designer. Generate 50 CONCISE multiple-choice questions that can be answered in 40 seconds or less. Keep questions and answers SHORT. ${languageInstruction}`
          : `Eres un diseñador experto en pruebas psicométricas. Genera 50 preguntas CONCISAS de opción múltiple que puedan responderse en 40 segundos o menos. Mantén las preguntas y respuestas CORTAS. ${languageInstruction}`;
        
        userPrompt = language === 'en'
          ? `Create 50 CONCISE cognitive ability questions for ${psychometricType?.toUpperCase()} assessment.

CRITICAL: Questions must be answerable in 40 seconds. Keep everything SHORT:
- Question text: Maximum 2 lines
- Answer options: Maximum 1 line each

Focus on: ${psychDesc}

Each question must:
- Be BRIEFLY worded to test cognitive ability
- Have 4 SHORT answer options (A, B, C, D)
- Have exactly one correct answer
- Test problem-solving, logical reasoning, and learning aptitude

CRITICAL - CORRECT ANSWER DISTRIBUTION (MANDATORY):
You MUST ensure the correct answers are distributed as follows:
- Approximately 12-13 questions with "A" as correct answer
- Approximately 12-13 questions with "B" as correct answer  
- Approximately 12-13 questions with "C" as correct answer
- Approximately 12-13 questions with "D" as correct answer
This is NOT optional - you MUST randomize and vary which option is correct.
DO NOT make most answers "B" or favor any single letter.

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
          : `Crea 50 preguntas CONCISAS de habilidad cognitiva para la evaluación ${psychometricType?.toUpperCase()}.

CRÍTICO: Las preguntas deben responderse en 40 segundos. Mantén todo CORTO:
- Texto de pregunta: Máximo 2 líneas
- Opciones de respuesta: Máximo 1 línea cada una

Enfócate en: ${psychDesc}

Cada pregunta debe:
- Estar redactada BREVEMENTE para evaluar habilidad cognitiva
- Tener 4 opciones de respuesta CORTAS (A, B, C, D)
- Tener exactamente una respuesta correcta
- Evaluar resolución de problemas, razonamiento lógico y aptitud de aprendizaje

CRÍTICO - DISTRIBUCIÓN DE RESPUESTAS CORRECTAS (OBLIGATORIO):
DEBES asegurar que las respuestas correctas se distribuyan de la siguiente manera:
- Aproximadamente 12-13 preguntas con "A" como respuesta correcta
- Aproximadamente 12-13 preguntas con "B" como respuesta correcta
- Aproximadamente 12-13 preguntas con "C" como respuesta correcta  
- Aproximadamente 12-13 preguntas con "D" como respuesta correcta
Esto NO es opcional - DEBES aleatorizar y variar qué opción es la correcta.
NO hagas que la mayoría de respuestas sean "B" ni favorezcas ninguna letra en particular.

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
    }

    // Function to validate answer distribution
    const validateDistribution = (qs: any[]): { valid: boolean; distribution: Record<string, number> } => {
      const hasCorrectAnswers = qs.some(q => q.correct && q.correct !== 'LIKERT');
      
      if (!hasCorrectAnswers) {
        // Likert scale questions don't need distribution validation
        return { valid: true, distribution: {} };
      }

      const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
      qs.forEach(q => {
        if (q.correct && q.correct !== 'LIKERT') {
          distribution[q.correct] = (distribution[q.correct] || 0) + 1;
        }
      });

      // Check if any single letter exceeds 30% (15 out of 50 questions)
      const totalQuestions = qs.length;
      const maxAllowedPercentage = 30;
      
      for (const [letter, count] of Object.entries(distribution)) {
        const percentage = (count / totalQuestions) * 100;
        if (percentage > maxAllowedPercentage) {
          console.log(`Distribution validation failed: ${letter} appears in ${percentage.toFixed(1)}% of questions (${count}/${totalQuestions})`);
          return { valid: false, distribution };
        }
      }

      return { valid: true, distribution };
    };

    // Retry system with model escalation
    let attempts = 0;
    const maxAttempts = 3;
    let questions: any[] | null = null;
    let model = 'google/gemini-2.5-flash';
    let finalDistribution: Record<string, number> = {};

    while (attempts < maxAttempts && !questions) {
      attempts++;
      
      // Switch to more powerful model on third attempt
      if (attempts === 3) {
        model = 'google/gemini-2.5-pro';
        console.log(`⚡ Attempt ${attempts}/3: Switching to ${model} for better instruction following...`);
      } else {
        console.log(`🔄 Attempt ${attempts}/3: Generating questions with ${model}...`);
      }

      try {
        // Call Lovable AI
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
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
        let parsedQuestions;
        try {
          // Remove markdown code blocks if present
          const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
          parsedQuestions = JSON.parse(cleanContent);
        } catch (parseError) {
          console.error('Failed to parse AI response:', content.substring(0, 500));
          throw new Error('Failed to parse AI-generated questions');
        }

        if (!Array.isArray(parsedQuestions)) {
          console.error('AI response is not an array:', typeof parsedQuestions);
          throw new Error('AI response is not a valid array of questions');
        }

        console.log(`AI returned ${parsedQuestions.length} questions`);

        // Handle cases where AI doesn't return exactly 50 questions
        if (parsedQuestions.length < 40) {
          console.error(`AI returned too few questions: ${parsedQuestions.length}`);
          throw new Error(`AI returned only ${parsedQuestions.length} questions. Minimum required is 40.`);
        }

        if (parsedQuestions.length < 50) {
          console.log(`AI returned ${parsedQuestions.length} questions, adjusting to 50...`);
          // Duplicate random questions to reach 50
          while (parsedQuestions.length < 50) {
            const randomIndex = Math.floor(Math.random() * parsedQuestions.length);
            parsedQuestions.push({ ...parsedQuestions[randomIndex] });
          }
        } else if (parsedQuestions.length > 50) {
          console.log(`AI returned ${parsedQuestions.length} questions, trimming to 50...`);
          // Take only the first 50 questions
          parsedQuestions = parsedQuestions.slice(0, 50);
        }

        // Validate distribution
        const { valid, distribution } = validateDistribution(parsedQuestions);
        finalDistribution = distribution;

        if (valid) {
          questions = parsedQuestions;
          console.log(`✅ Attempt ${attempts} succeeded! Correct answer distribution:`, distribution);
        } else {
          console.log(`❌ Attempt ${attempts} failed validation - distribution is skewed:`, distribution);
          
          if (attempts === maxAttempts) {
            throw new Error(`Failed to generate questions with balanced distribution after ${maxAttempts} attempts. Final distribution: ${JSON.stringify(distribution)}`);
          }
          
          // Continue to next iteration
          continue;
        }

      } catch (error) {
        console.error(`Error in attempt ${attempts}:`, error);
        
        // If this is the last attempt, throw the error
        if (attempts === maxAttempts) {
          throw error;
        }
        
        // Otherwise, continue to next iteration
        continue;
      }
    }

    // At this point, questions should be set (or we would have thrown an error)
    if (!questions) {
      throw new Error('Failed to generate questions - unexpected error');
    }

    // Log final distribution
    if (Object.keys(finalDistribution).length > 0) {
      console.log('Final correct answer distribution:', finalDistribution);
    }

    // Insert questions into database
    console.log('Inserting questions into database...');
    const questionsToInsert = questions.map((q: any, index: number) => {
      // Validate question structure
      if (!q.question) {
        console.error(`Question ${index + 1} missing question text:`, q);
        throw new Error(`Question ${index + 1} has invalid structure`);
      }

      // For Likert scale questions
      if (q.correct === 'LIKERT') {
        return {
          assessment_id: assessmentId,
          question_number: index + 1,
          question_text: q.question,
          option_a: language === 'en' ? 'Strongly Disagree' : 'Totalmente en desacuerdo',
          option_b: language === 'en' ? 'Disagree' : 'En desacuerdo',
          option_c: language === 'en' ? 'Neutral' : 'Neutral',
          option_d: language === 'en' ? 'Agree' : 'De acuerdo',
          option_e: language === 'en' ? 'Strongly Agree' : 'Totalmente de acuerdo',
          correct_answer: 'LIKERT',
        };
      }
      
      // For questions with correct answers - validate options exist
      if (!q.options || !q.options.A || !q.options.B || !q.options.C || !q.options.D) {
        console.error(`Question ${index + 1} missing options:`, q);
        throw new Error(`Question ${index + 1} has invalid structure - missing options`);
      }

      return {
        assessment_id: assessmentId,
        question_number: index + 1,
        question_text: q.question,
        option_a: q.options.A,
        option_b: q.options.B,
        option_c: q.options.C,
        option_d: q.options.D,
        correct_answer: q.correct,
      };
    });

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