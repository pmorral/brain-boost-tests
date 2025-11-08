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

  try {
    const {
      title,
      assessmentType,
      psychometricType,
      description,
      language,
      creatorEmail,
      creatorName,
      company,
      shareLink,
    } = await req.json();

    console.log("Sending notifications for assessment:", title);

    // Prepare data for notifications
    const assessmentTypeLabel = assessmentType === "skills" ? "Hard & Soft Skills" : "Prueba Psicométrica";
    const languageLabel = language === "es" ? "Español" : "English";

    // Send Slack notification
    try {
      if (!SLACK_WEBHOOK_URL) {
        console.error("SLACK_WEBHOOK_URL secret is not set");
        // Continuar sin Slack, pero no interrumpir el flujo
        throw new Error("Missing SLACK_WEBHOOK_URL");
      }
      const slackMessage = {
        text: "🎯 Nueva Evaluación Creada",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🎯 Nueva Evaluación Creada",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Título:*\n${title}`,
              },
              {
                type: "mrkdwn",
                text: `*Tipo:*\n${assessmentTypeLabel}`,
              },
              {
                type: "mrkdwn",
                text: `*Idioma:*\n${languageLabel}`,
              },
              {
                type: "mrkdwn",
                text: `*Creador:*\n${creatorName || "No registrado"}`,
              },
              {
                type: "mrkdwn",
                text: `*Email:*\n${creatorEmail}`,
              },
              {
                type: "mrkdwn",
                text: `*Empresa:*\n${company || "N/A"}`,
              },
            ],
          },
        ],
      };

      if (psychometricType) {
        const fieldsBlock = slackMessage.blocks[1];
        if (fieldsBlock && "fields" in fieldsBlock && fieldsBlock.fields) {
          fieldsBlock.fields.push({
            type: "mrkdwn",
            text: `*Test Psicométrico:*\n${psychometricType}`,
          });
        }
      }

      if (description) {
        slackMessage.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Descripción:*\n${description}`,
          },
        } as any);
      }

      slackMessage.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Link:*\n${shareLink}`,
        },
      } as any);

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
        title,
        assessmentType: assessmentTypeLabel,
        psychometricType: psychometricType || "N/A",
        description: description || "N/A",
        language: languageLabel,
        creatorEmail,
        creatorName: creatorName || "No registrado",
        company: company || "N/A",
        shareLink,
        timestamp: new Date().toISOString(),
      };

      const sheetsResponse = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sheetsData),
      });

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
    console.error("Error in notify-assessment-created function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
