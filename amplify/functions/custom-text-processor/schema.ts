import { Type } from "@google/genai";

export const scenarioSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        difficulty_level: { type: Type.STRING },
        sentences: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    source: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            highlighted_words: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        word: { type: Type.STRING },
                                        translation: { type: Type.STRING },
                                        examples: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    }
                                }
                            }
                        }
                    },
                    target: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            highlighted_words: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        word: { type: Type.STRING },
                                        translation: { type: Type.STRING },
                                        examples: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

