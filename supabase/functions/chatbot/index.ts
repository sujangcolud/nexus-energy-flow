import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CreateCompletionRequest } from "https://esm.sh/openai@4.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();

    if (!question) {
      throw new Error("Missing question");
    }

    const completionConfig: CreateCompletionRequest = {
      model: "gpt-3.5-turbo",
      prompt: question,
      max_tokens: 256,
      temperature: 0.7,
      stream: false,
    };

    const response = await fetch("https://api.openai.com/v1/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(completionConfig),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message);
    }

    const data = await response.json();
    const answer = data.choices[0].text.trim();

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
