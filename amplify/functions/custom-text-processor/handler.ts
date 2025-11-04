import { Handler } from "aws-lambda";
import { GoogleGenAI } from "@google/genai/node";
import { scenarioSchema } from "./schema.js";
import { v4 as uuidv4 } from 'uuid';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const handler: Handler = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));
    
    const { text, textLanguage, difficulty, sourceLang, targetLang } = event.arguments;

    if (!text || !textLanguage || !difficulty || !sourceLang || !targetLang) {
        throw new Error("Missing required arguments: text, textLanguage, difficulty, sourceLang, and targetLang are required");
    }

    const fromLang = textLanguage === 'source' ? sourceLang : targetLang;
    const toLang = textLanguage === 'source' ? targetLang : sourceLang;

    const prompt = `Process a user-provided text for language learning.
    The user's native language is ${sourceLang}.
    They are learning ${targetLang} at a ${difficulty} CEFR level.

    The user has provided the following text in ${fromLang}:
    ---
    ${text}
    ---

    Your task is to:
    1.  Translate the entire text accurately into ${toLang}.
    2.  Break down the original text and its translation into logical sentence pairs (3-7 pairs).
    3.  For each sentence in BOTH the original and translated text, identify 1 or 2 important vocabulary words appropriate for the ${difficulty} learning level.
    4.  For each highlighted word, provide a translation into the other language and two example sentences in the language of the highlighted word.
    5.  Format the final output as a valid JSON object matching the provided schema.
    6.  Use "Custom Text Practice" for the 'name' field and "Practice based on your provided text." for the 'description' field.
    7.  Ensure all IDs are unique strings (e.g., using UUID format).
    8.  The 'source' object in the JSON must contain the text in ${sourceLang}, and the 'target' object must contain the text in ${targetLang}.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: scenarioSchema,
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

        const scenario = JSON.parse(cleanedText);

        // Assign new UUIDs to scenario and sentences after Gemini generation
        scenario.id = uuidv4();
        scenario.sentences = scenario.sentences.map((sentence: any) => ({
          ...sentence,
          id: uuidv4()
        }));

        console.log("✅ Custom text processed successfully with new UUIDs:", JSON.stringify(scenario, null, 2));

        return scenario;
    } catch (error) {
        console.error("Error processing custom text:", error);
        throw new Error(`Failed to process custom text: ${error instanceof Error ? error.message : String(error)}`);
    }
};

