// File: /supabase/functions/chat/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { question } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Example: fetch data from your database to provide context
  const { data } = await supabase
    .from("your_table_name") // Replace with your table name
    .select("*")
    .limit(10);

  const context = JSON.stringify(data);

  // Call Cohere generate endpoint
  const response = await fetch("https://api.cohere.ai/generate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("COHERE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "command-xlarge-nightly",
      prompt: `Answer the question based on the following data:\n\nQuestion: ${question}\n\nData: ${context}\n\nAnswer:`,
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  const result = await response.json();
  const answer = result.generations?.[0]?.text.trim() || "Sorry, I couldn't find an answer.";

  return new Response(JSON.stringify({ answer }), {
    headers: { "Content-Type": "application/json" },
  });
});
