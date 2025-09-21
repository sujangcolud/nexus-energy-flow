
import { supabase } from "@/integrations/supabase/client";

export async function fetchOpenAIAnswer(prompt: string, context?: string) {
  try {
    console.log('Calling OpenAI via Edge Function with prompt:', prompt);
    
    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: { 
        prompt, 
        context 
      }
    });

    if (error) {
      console.error("Edge Function error:", error);
      return "Sorry, there was a problem contacting OpenAI.";
    }

    if (data?.error) {
      console.error("OpenAI API error:", data.error);
      
      if (data.error.includes('API key')) {
        return "OpenAI API key not configured properly. Please contact an administrator.";
      }
      
      return "Sorry, there was a problem contacting OpenAI.";
    }

    return data?.content || "Sorry, I couldn't generate a response.";
    
  } catch (err: any) {
    console.error("OpenAI API error:", err);
    return "Sorry, there was a problem contacting OpenAI.";
  }
}
