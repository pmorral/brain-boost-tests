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
    const { candidateId } = await req.json();
    
    console.log('Analyzing psychometric results for candidate:', candidateId);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get candidate with assessment and responses
    const { data: candidate, error: candidateError } = await supabaseClient
      .from('candidates')
      .select(`
        *,
        assessments (
          title,
          psychometric_type,
          language
        ),
        candidate_responses (
          selected_answer,
          assessment_questions (
            question_text,
            correct_answer
          )
        )
      `)
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error('Error fetching candidate:', candidateError);
      throw new Error('Candidate not found');
    }

    const assessment = candidate.assessments;
    const responses = candidate.candidate_responses;
    
    // Only analyze if it's a Likert scale psychometric test
    const firstQuestion = responses[0]?.assessment_questions;
    if (!firstQuestion || firstQuestion.correct_answer !== 'LIKERT') {
      console.log('Not a Likert scale assessment, skipping analysis');
      return new Response(
        JSON.stringify({ message: 'Not a psychometric assessment requiring analysis' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt for AI analysis
    const language = assessment.language || 'es';
    const psychometricType = assessment.psychometric_type?.toUpperCase() || 'PSYCHOMETRIC';
    
    const responsesText = responses.map((r: any, i: number) => 
      `${i + 1}. ${r.assessment_questions.question_text}\n   Answer: ${r.selected_answer}`
    ).join('\n\n');

    const systemPrompt = language === 'en'
      ? `You are an expert psychologist specialized in ${psychometricType} assessments. Analyze the candidate's responses and provide a professional, insightful personality profile.`
      : `Eres un psicólogo experto especializado en evaluaciones ${psychometricType}. Analiza las respuestas del candidato y proporciona un perfil de personalidad profesional y perspicaz.`;

    const userPrompt = language === 'en'
      ? `Based on these ${psychometricType} assessment responses, provide a comprehensive personality analysis (200-300 words):

${responsesText}

Focus on:
- Key personality traits identified
- Strengths and potential areas for development
- Work style and interpersonal tendencies
- Recommendations for team fit and role suitability

Write in a professional, constructive tone suitable for recruitment purposes.`
      : `Basado en estas respuestas de evaluación ${psychometricType}, proporciona un análisis de personalidad completo (200-300 palabras):

${responsesText}

Enfócate en:
- Rasgos de personalidad clave identificados
- Fortalezas y áreas potenciales de desarrollo
- Estilo de trabajo y tendencias interpersonales
- Recomendaciones para ajuste de equipo e idoneidad de rol

Escribe en un tono profesional y constructivo apropiado para propósitos de reclutamiento.`;

    // Call Lovable AI for analysis
    console.log('Calling AI for psychometric analysis...');
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
    const analysis = aiData.choices[0].message.content;
    console.log('Analysis generated successfully');

    // Save analysis to database
    const { error: updateError } = await supabaseClient
      .from('candidates')
      .update({ psychometric_analysis: analysis })
      .eq('id', candidateId);

    if (updateError) {
      console.error('Error saving analysis:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-psychometric:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
