import { Type } from "@google/genai";

export const assessmentSchema = {
    type: Type.OBJECT,
    properties: {
        overall_feedback: { type: Type.STRING },
        pronunciation_score: { type: Type.INTEGER },
        fluency_score: { type: Type.INTEGER },
        suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        }
    }
};

