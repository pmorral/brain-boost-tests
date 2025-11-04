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
    const { assessmentId, assessmentType, topic, psychometricType } = await req.json();
    
    console.log('Generating questions for:', { assessmentId, assessmentType, topic, psychometricType });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build the prompt based on assessment type
    let systemPrompt = '';
    let userPrompt = '';

    if (assessmentType === 'hard_skills') {
      systemPrompt = `You are an expert technical assessment creator. Generate 20 multiple-choice questions to evaluate ${topic} hard skills. Each question should test practical knowledge and problem-solving abilities.`;
      userPrompt = `Create 20 technical questions about ${topic}. Each question must have:
- A clear, specific question
- 4 answer options (A, B, C, D)
- Exactly one correct answer
- Progressive difficulty (start easier, get harder)

Format each question as JSON:
{
  "question": "question text",
  "options": {
    "A": "option A text",
    "B": "option B text", 
    "C": "option C text",
    "D": "option D text"
  },
  "correct": "A/B/C/D"
}

Return ONLY a JSON array of 20 questions.`;
    } else if (assessmentType === 'soft_skills') {
      systemPrompt = `You are an expert in soft skills assessment. Generate 20 scenario-based multiple-choice questions to evaluate ${topic} soft skills.`;
      userPrompt = `Create 20 soft skills questions about ${topic}. Each question should present a workplace scenario and evaluate skills like communication, teamwork, leadership, problem-solving, etc.

Each question must have:
- A realistic workplace scenario
- 4 answer options representing different approaches
- One best answer based on professional best practices
- Progressive complexity

Format each question as JSON:
{
  "question": "scenario description and question",
  "options": {
    "A": "approach A",
    "B": "approach B",
    "C": "approach C",
    "D": "approach D"
  },
  "correct": "A/B/C/D"
}

Return ONLY a JSON array of 20 questions.`;
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
      systemPrompt = `You are an expert psychometric test designer. Generate 20 multiple-choice questions for a ${psychometricType?.toUpperCase()} assessment.`;
      userPrompt = `Create 20 psychometric questions for ${psychometricType?.toUpperCase()} assessment.

Focus on: ${psychDesc}

Each question must:
- Be carefully worded to assess specific psychological traits
- Have 4 answer options with varying degrees of the measured trait
- One answer should be most indicative of the trait being measured
- Be professionally appropriate and unbiased

Format each question as JSON:
{
  "question": "question text",
  "options": {
    "A": "option A",
    "B": "option B",
    "C": "option C",
    "D": "option D"
  },
  "correct": "A/B/C/D"
}

Return ONLY a JSON array of 20 questions.`;
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

    if (!Array.isArray(questions) || questions.length !== 20) {
      throw new Error('AI did not return exactly 20 questions');
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
      JSON.stringify({ success: true, questionsCount: 20 }),
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