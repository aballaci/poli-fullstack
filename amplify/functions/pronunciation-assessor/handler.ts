import { Handler } from "aws-lambda";
import { GoogleGenAI } from "@google/genai/node";
import { assessmentSchema } from "./schema.js";
import { SpeechAssessment } from "./models.js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const handler: Handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    
    const { originalText, userTranscript, language } = event.arguments;

    if (!originalText || !userTranscript || !language) {
        throw new Error("Missing required arguments: originalText, userTranscript, and language are required");
    }

    const prompt = `Act as an expert language tutor for a student learning ${language}.
    The student is practicing the following sentence:
    Original Sentence: "${originalText}"

    The student spoke the sentence, and their speech was transcribed as:
    User's Attempt: "${userTranscript}"

    Based on a comparison of the original sentence and the user's attempt, please provide a pronunciation and fluency assessment. Assume that differences in the transcription are due to pronunciation errors.

    Provide your response as a valid JSON object matching the provided schema.

    - \`overall_feedback\`: A brief, encouraging summary of their performance.
    - \`pronunciation_score\`: An integer score from 0 to 100, where 100 is perfect pronunciation.
    - \`fluency_score\`: An integer score from 0 to 100, where 100 is perfectly fluent.
    - \`suggestions\`: An array of 1-3 short, actionable tips for improvement. Focus on specific words or sounds the user likely struggled with based on the transcription differences. If the attempt is near-perfect, provide a single encouraging suggestion. If it is perfect, return an empty array.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: assessmentSchema,
            },
        });

        // Extract text from response (handling both Node SDK structure and fallback)
        const deepText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        const topLevelText = (response as any).text;
        const rawText = deepText || topLevelText;

        if (!rawText || typeof rawText !== "string") {
            throw new Error("Failed to extract raw text from Gemini response (text was empty or not found).");
        }

        // Clean and parse JSON
        const cleanedText = rawText
            .trim()
            .replace(/^```json\s*/, '')
            .replace(/```\s*$/, '');

        const assessment: SpeechAssessment = JSON.parse(cleanedText);

        console.log("✅ Assessment generated successfully:", JSON.stringify(assessment, null, 2));

        return assessment;
    } catch (error) {
        console.error("Error generating assessment:", error);
        throw new Error(`Failed to generate pronunciation assessment: ${error instanceof Error ? error.message : String(error)}`);
    }
};

