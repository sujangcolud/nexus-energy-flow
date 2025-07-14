import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: "YOUR_OPENAI_API_KEY", // IMPORTANT: Replace with your actual API key
  dangerouslyAllowBrowser: true, // Only for safe, local, or test apps!
});

// Fetch answer from OpenAI based on user input and optional business context
export async function fetchOpenAIAnswer(prompt: string, context?: string) {
  try {
    const systemPrompt = "You are a helpful business assistant chatbot. Be detailed, accurate, and friendly. Use business context if provided.";
    const messages: any = [
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
    return completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
  } catch (err) {
    console.error("Error contacting OpenAI:", err);
    return "Sorry, there was a problem contacting OpenAI.";
  }
}
