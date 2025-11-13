import { GoogleGenAI } from "@google/genai/node";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export interface GenerateContentOptions {
    prompt: string;
    schema: any;
    modelName?: string;
}

export interface GenerateContentResult<T> {
    data: T;
    response: any;
}

/**
 * Generate structured content using Google AI with retry logic
 */
export async function generateStructuredContent<T>(
    options: GenerateContentOptions,
    retries: number = 2
): Promise<GenerateContentResult<T>> {
    const { prompt, schema, modelName = "gemini-2.5-flash" } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const rawText = extractTextFromResponse(response);
            const data = parseJsonResponse<T>(rawText);

            return { data, response };
        } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt + 1} failed:`, error);

            if (attempt < retries) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt) * 1000;
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error("Failed to generate content after retries");
}

/**
 * Extract text from Google AI response
 */
function extractTextFromResponse(response: any): string {
    const deepText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    const topLevelText = (response as any).text;
    const rawText = deepText || topLevelText;

    if (!rawText || typeof rawText !== "string") {
        throw new Error("Failed to extract raw text from Gemini response (text was empty or not found).");
    }

    return rawText;
}

/**
 * Parse JSON response with cleanup
 */
function parseJsonResponse<T>(rawText: string): T {
    try {
        const cleanedText = rawText
            .trim()
            .replace(/^```json\s*/, '')
            .replace(/```\s*$/, '');

        return JSON.parse(cleanedText) as T;
    } catch (err) {
        console.error("JSON Parsing Error:", (err as Error).message, "Raw excerpt:", rawText.substring(0, 200) + '...');
        throw new Error("Failed to parse Gemini response as JSON.");
    }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get the Google AI client instance
 */
export function getGeminiClient() {
    return ai;
}
