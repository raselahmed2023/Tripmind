import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

export interface AIInput {
  prompt: string;
  systemInstruction?: string;
}

export interface AIResult {
  text: string;
  providerUsed: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ProviderConfig {
  name: string;
  generate: (input: AIInput) => Promise<AIResult>;
}

const isRetryableError = (err: Error): boolean => {
  const msg = err.message.toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('enotfound') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('500') ||
    msg.includes('unavailable') ||
    msg.includes('temporarily')
  );
};

const createGeminiProvider = (): ProviderConfig => ({
  name: 'gemini',
  generate: async (input: AIInput): Promise<AIResult> => {
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: config.GEMINI_MODEL,
      systemInstruction: input.systemInstruction,
    });

    const response = await model.generateContent(input.prompt);
    const responseText = response.response.text();
    const usageMetadata = response.response.usageMetadata;

    return {
      text: responseText,
      providerUsed: `gemini/${config.GEMINI_MODEL}`,
      tokenUsage: usageMetadata ? {
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      } : undefined,
    };
  },
});

const createGroqProvider = (): ProviderConfig => ({
  name: 'groq',
  generate: async (input: AIInput): Promise<AIResult> => {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.GROQ_MODEL,
        messages: [
          ...(input.systemInstruction ? [{ role: 'system', content: input.systemInstruction }] : []),
          { role: 'user', content: input.prompt },
        ],
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Groq returned empty response');
    }

    return {
      text,
      providerUsed: `groq/${config.GROQ_MODEL}`,
      tokenUsage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  },
});

const getProviders = (): ProviderConfig[] => {
  const order = config.AI_PROVIDER_ORDER.split(',').map(p => p.trim());
  const providers: ProviderConfig[] = [];

  for (const name of order) {
    if (name === 'gemini' && config.GEMINI_API_KEY) {
      providers.push(createGeminiProvider());
    } else if (name === 'groq' && config.GROQ_API_KEY) {
      providers.push(createGroqProvider());
    }
  }

  return providers;
};

export const generateWithFallback = async (input: AIInput): Promise<AIResult> => {
  const providers = getProviders();

  if (providers.length === 0) {
    throw new Error('No AI providers configured');
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const result = await provider.generate(input);
      return result;
    } catch (err) {
      lastError = err as Error;
      console.error(`[AI Provider] ${provider.name} failed:`, lastError.message);

      // Only fall back for retryable errors
      if (!isRetryableError(lastError)) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('All AI providers failed');
};
