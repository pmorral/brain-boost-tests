import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";
const GOOGLE_SHEETS_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzalr_bQoCLtqqbCLR84QRB-BXs2gL-tBv_E1EbUgdJkzk7YrBP1xJ96FPrjYv2SiAk/exec";

// Helper para seguir redirecciones manteniendo POST y body (similar a follow-redirects)
async function postWithRedirects(url: string, payload: unknown, maxRedirects = 10): Promise<Response> {
  let currentUrl = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetch(currentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "supabase-edge/1.0",
      },
      body: JSON.stringify(payload),
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") || res.headers.get("Location");
      if (!location) return res;
      currentUrl = location;
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects when posting to Google Sheets");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      candidateName,
      candidateEmail,
      assessmentTitle,
      assessmentType,
      psychometricType,
      score,
      totalQuestions,
      completedAt,
      reason,
    } = await req.json();

    console.log("Sending candidate completion notifications for:", candidateName, reason ? `(reason: ${reason})` : "");

    // Prepare data for notifications
    const assessmentTypeLabel = assessmentType === "skills" ? "Hard & Soft Skills" : "Prueba Psicométrica";
    const scoreDisplay = score !== null ? `${score}/${totalQuestions}` : "Análisis pendiente";
    const isExit = reason === "tab_exit";

    // Send Slack notification
    try {
      console.log(SLACK_WEBHOOK_URL);
      if (!SLACK_WEBHOOK_URL) {
        console.error("SLACK_WEBHOOK_URL secret is not set");
        // Continuar sin Slack, pero no interrumpir el flujo
        throw new Error("Missing SLACK_WEBHOOK_URL");
      }
      const fields = [
        {
          type: "mrkdwn",
          text: `*Candidato:*\n${candidateName}`,
        },
        {
          type: "mrkdwn",
          text: `*Email:*\n${candidateEmail}`,
        },
        {
          type: "mrkdwn",
          text: `*Evaluación:*\n${assessmentTitle}`,
        },
        {
          type: "mrkdwn",
          text: `*Tipo:*\n${assessmentTypeLabel}`,
        },
        {
          type: "mrkdwn",
          text: `*Puntaje:*\n${scoreDisplay}`,
        },
        {
          type: "mrkdwn",
          text: `*${isExit ? "Finalizado" : "Completado"}:*\n${new Date(completedAt).toLocaleString("es-MX")}`,
        },
      ] as any[];

      if (isExit) {
        fields.push({
          type: "mrkdwn",
          text: `*Motivo:*\nSalida de pestaña`,
        });
      }

      const slackMessage = {
        text: isExit ? "⚠️ Evaluación Finalizada por Salida" : "✅ Candidato Completó Evaluación",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: isExit ? "⚠️ Evaluación Finalizada por Salida" : "✅ Candidato Completó Evaluación",
              emoji: true,
            },
          },
          {
            type: "section",
            fields,
          },
        ],
      } as any;

      if (psychometricType) {
        const fieldsBlock = slackMessage.blocks[1];
        if (fieldsBlock && "fields" in fieldsBlock && (fieldsBlock as any).fields) {
          (fieldsBlock as any).fields.push({
            type: "mrkdwn",
            text: `*Test Psicométrico:*\n${psychometricType}`,
          });
        }
      }

      const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackMessage),
      });

      if (!slackResponse.ok) {
        console.error("Error sending Slack notification:", await slackResponse.text());
      } else {
        console.log("Slack notification sent successfully");
      }
    } catch (slackError) {
      console.error("Error with Slack:", slackError);
    }

    // Send Google Sheets notification
    try {
      const sheetsData = {
        candidateName,
        candidateEmail,
        assessmentTitle,
        assessmentType: assessmentTypeLabel,
        psychometricType: psychometricType || "N/A",
        score: scoreDisplay,
        totalQuestions: totalQuestions.toString(),
        completedAt: new Date(completedAt).toISOString(),
        timestamp: new Date().toISOString(),
        status: isExit ? "Exited" : "Completed",
        reason: isExit ? "tab_exit" : "completed",
      };

      const sheetsResponse = await postWithRedirects(GOOGLE_SHEETS_WEBHOOK_URL, sheetsData, 10);

      if (!sheetsResponse.ok) {
        console.error("Error sending to Google Sheets:", await sheetsResponse.text());
      } else {
        console.log("Google Sheets notification sent successfully");
      }
    } catch (sheetsError) {
      console.error("Error with Google Sheets:", sheetsError);
    }

    return new Response(JSON.stringify({ success: true, message: "Notifications sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-candidate-completed function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
