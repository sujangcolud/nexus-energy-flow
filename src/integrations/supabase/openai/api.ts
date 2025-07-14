import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey:
    import.meta.env.VITE_OPENAI_API_KEY ||
    "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",
  dangerouslyAllowBrowser: true, // Only for safe/demo apps!
});

export async function fetchOpenAIAnswer(prompt: string, context?: string) {
  try {
    // Check if API key is available
    if (!import.meta.env.VITE_OPENAI_API_KEY && !openai.apiKey) {
      return "OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.";
    }

    const systemPrompt =
      "You are a helpful business assistant chatbot. Be detailed, accurate, and friendly. Use business context if provided.";
    const messages = [
      { role: "system", content: systemPrompt },
      ...(context ? [{ role: "assistant", content: context }] : []),
      { role: "user", content: prompt },
    ];
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.2,
      max_tokens: 600,
    });
    return (
      completion.choices[0]?.message?.content ||
      "Sorry, I couldn't generate a response."
    );
  } catch (err: any) {
    console.error("OpenAI API error:", err);
    if (err?.status === 401) {
      return "Invalid OpenAI API key. Please check your configuration.";
    }
    return "Sorry, there was a problem contacting OpenAI.";
  }
}
