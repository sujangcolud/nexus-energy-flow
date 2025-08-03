
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export async function generateWithAI(prompt: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system' as const, 
          content: 'You are a helpful assistant that generates content based on user prompts.' 
        },
        { 
          role: 'user' as const, 
          content: prompt 
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error('Failed to generate content with AI');
  }
}

export async function analyzeFinancialData(data: any): Promise<string> {
  const prompt = `Analyze this financial data and provide insights: ${JSON.stringify(data)}`;
  return generateWithAI(prompt);
}
