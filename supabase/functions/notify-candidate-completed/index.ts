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
