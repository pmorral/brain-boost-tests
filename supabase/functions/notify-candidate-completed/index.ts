import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";
const GOOGLE_SHEETS_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzalr_bQoCLtqqbCLR84QRB-BXs2gL-tBv_E1EbUgdJkzk7YrBP1xJ96FPrjYv2SiAk/exec";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  console.log("version: 1.0.0");

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
      console.log("Slack webhook URL:", SLACK_WEBHOOK_URL ? "configured" : "not configured");
      if (!SLACK_WEBHOOK_URL) {
        console.error("SLACK_WEBHOOK_URL secret is not set");
        throw new Error("Missing SLACK_WEBHOOK_URL");
      }

      const slackText = isExit
        ? `⚠️ *Evaluación Finalizada por Salida*\n\n*Candidato:* ${candidateName}\n*Email:* ${candidateEmail}\n*Evaluación:* ${assessmentTitle}\n*Tipo:* ${assessmentTypeLabel}\n*Puntaje:* ${scoreDisplay}\n*Finalizado:* ${new Date(completedAt).toLocaleString("es-MX")}\n*Motivo:* Salida de pestaña${psychometricType ? `\n*Test Psicométrico:* ${psychometricType}` : ""}`
        : `✅ *Candidato Completó Evaluación*\n\n*Candidato:* ${candidateName}\n*Email:* ${candidateEmail}\n*Evaluación:* ${assessmentTitle}\n*Tipo:* ${assessmentTypeLabel}\n*Puntaje:* ${scoreDisplay}\n*Completado:* ${new Date(completedAt).toLocaleString("es-MX")}${psychometricType ? `\n*Test Psicométrico:* ${psychometricType}` : ""}`;

      const slackMessage = {
        text: slackText,
      };

      console.log("Sending Slack message:", slackMessage);

      const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slackMessage),
      });

      if (!slackResponse.ok) {
        const errorText = await slackResponse.text();
        console.error("Error sending Slack notification:", errorText);
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
        status: isExit ? "Exited" : "Completed",
        reason: isExit ? "tab_exit" : "completed",
      };
      console.log("Sending to Google Sheets:", sheetsData);

      const sheetsResponse = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sheetsData),
      });

      if (!sheetsResponse.ok) {
        const errorText = await sheetsResponse.text();
        console.error("Error sending to Google Sheets:", errorText);
      } else {
        const responseData = await sheetsResponse.text();
        console.log("Google Sheets notification sent successfully:", responseData);
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
