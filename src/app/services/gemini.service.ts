import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";
import { ConversationScenario, Language, ScenarioSummary, SpeechAssessment } from '../models';
import { generateClient } from 'aws-amplify/api';
import { LanguageService } from './language.service';
import { SessionStore } from '../state/session.store';
import { MOCK_ASSESSMENT, MOCK_SCENARIOS } from './mock-scenarios.data';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI | null;
  private client = generateClient();
  private store = inject(SessionStore);
  private languageService = inject(LanguageService);

  constructor() {
    // This key has been hardcoded to resolve persistent API authentication issues.
    // In a production environment, this should be handled via secure environment variables.
    const apiKey = "1234567890abcdef1234567890abcdef"; // Replace with your actual API key

    if (apiKey) {
      console.log(`[GeminiService] Using hardcoded API Key, starting with: ${apiKey.substring(0, 8)}...`);
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      // This block should not be reached with a hardcoded key, but is kept as a fallback.
      console.warn(
        "Gemini API key is not configured. AI-powered features will fall back to mock data. "
      );
      this.ai = null;
    }
  }

  private getRandomScenario(): ConversationScenario {
    const randomIndex = Math.floor(Math.random() * MOCK_SCENARIOS.length);
    // Return a deep copy to prevent mutation of the original mock data
    return JSON.parse(JSON.stringify(MOCK_SCENARIOS[randomIndex]));
  }

  private readonly scenarioSchema = {
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

  private readonly assessmentSchema = {
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

  private handleError(error: unknown, context: object, functionName: string): never {
    let friendlyMessage = 'An AI service error occurred. Please try again later.';
    let detailedMessage = 'An unexpected error occurred.';

    console.error(`[GeminiService:${functionName}] An error occurred.`);
    console.error(`[GeminiService:${functionName}] Context:`, context);
    console.error(`[GeminiService:${functionName}] Original Error:`, error);

    if (error && typeof error === 'object') {
      const anyError = error as any;
      // Check for Google AI error structure: { error: { message: '...' } }
      if (anyError.error && typeof anyError.error.message === 'string') {
        detailedMessage = anyError.error.message;
        if (detailedMessage.includes('API Key not found')) {
          friendlyMessage = 'The configured Gemini API key is invalid or missing. AI features are unavailable.';
        } else if (detailedMessage.toLowerCase().includes('quota')) {
          friendlyMessage = 'The AI service quota has been exceeded. Please try again later.';
        } else {
          friendlyMessage = `AI Service Error: ${detailedMessage}`;
        }
        // Check for GraphQL error structure: { errors: [{ message: '...' }] }
      } else if (Array.isArray(anyError.errors) && anyError.errors.length > 0 && anyError.errors[0].message) {
        detailedMessage = anyError.errors.map((e: { message: string }) => e.message).join('; ');
        friendlyMessage = `Data Service Error: ${detailedMessage}`;
        // Standard Error object
      } else if (typeof anyError.message === 'string') {
        detailedMessage = anyError.message;
        friendlyMessage = detailedMessage;
      } else {
        try {
          detailedMessage = JSON.stringify(error);
        } catch {
          detailedMessage = 'Could not stringify error object.';
        }
      }
    } else if (error) {
      detailedMessage = String(error);
      friendlyMessage = detailedMessage;
    }

    console.error(`[GeminiService:${functionName}] Parsed Error: ${detailedMessage}`);

    // Throw the user-friendly message to be displayed in the UI
    throw new Error(friendlyMessage);
  }

  async generateScenario(topic: string, difficulty: string, sourceLang: Language, targetLang: Language): Promise<ConversationScenario> {
    if (this.languageService.isDevMode && this.store.mockApiMode()) {
      console.warn('--- MOCK API MODE: Returning mock scenario for "generateScenario". ---');
      await new Promise(resolve => setTimeout(resolve, 750)); // Simulate network delay
      const mockScenario = this.getRandomScenario();
      mockScenario.name = `Mock: ${topic}`;
      mockScenario.difficulty_level = difficulty;
      return mockScenario;
    }

    const generateScenarioQuery = /* GraphQL */ `
      query GenerateScenario($topic: String!, $difficulty: String!, $sourceLang: String!, $targetLang: String!) {
        generateScenario(topic: $topic, difficulty: $difficulty, sourceLang: $sourceLang, targetLang: $targetLang) {
          scenario
        }
      }
    `;

    try {
      const response = await this.client.graphql({
        query: generateScenarioQuery,
        variables: {
          topic: topic,
          difficulty: difficulty,
          sourceLang: sourceLang.display_name,
          targetLang: targetLang.display_name,
        }
      });

      if ('subscribe' in response) {
        throw new Error('Unexpected subscription result for a GraphQL query.');
      }

      if (response.errors) {
        throw { errors: response.errors };
      }

      if (!response.data?.generateScenario?.scenario) {
        console.error("Invalid response from backend:", response.data);
        throw new Error("The backend returned an invalid or empty scenario. Please try again.");
      }

      const scenarioString = response.data.generateScenario.scenario;
      const scenario = JSON.parse(scenarioString) as ConversationScenario;
      return scenario;

    } catch (error) {
      this.handleError(
        error,
        {
          topic,
          difficulty,
          sourceLang: sourceLang.display_name,
          targetLang: targetLang.display_name,
        },
        'generateScenario'
      );
    }
  }

  async processCustomText(text: string, textLanguage: 'source' | 'target', difficulty: string, sourceLang: Language, targetLang: Language): Promise<ConversationScenario> {
    if ((this.languageService.isDevMode && this.store.mockApiMode()) || !this.ai) {
      const logReason = !this.ai ? 'API key missing' : 'mock API mode enabled';
      console.warn(`--- FALLBACK MODE (${logReason}): Returning mock scenario for "processCustomText". ---`);
      await new Promise(resolve => setTimeout(resolve, 750));
      const mockScenario = this.getRandomScenario();
      mockScenario.name = 'Mock: Custom Text';
      mockScenario.description = 'A mock scenario based on your custom text.';
      mockScenario.difficulty_level = difficulty;
      return mockScenario;
    }

    const fromLang = textLanguage === 'source' ? sourceLang.display_name : targetLang.display_name;
    const toLang = textLanguage === 'source' ? targetLang.display_name : sourceLang.display_name;

    const prompt = `Process a user-provided text for language learning.
    The user's native language is ${sourceLang.display_name}.
    They are learning ${targetLang.display_name} at a ${difficulty} CEFR level.

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
    8.  The 'source' object in the JSON must contain the text in ${sourceLang.display_name}, and the 'target' object must contain the text in ${targetLang.display_name}.`;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: this.scenarioSchema,
        },
      });
      const jsonStr = response.text?.trim() || '';
      const scenario = JSON.parse(jsonStr) as ConversationScenario;
      return scenario;

    } catch (error) {
      this.handleError(
        error,
        {
          textLanguage,
          difficulty,
          sourceLang: sourceLang.display_name,
          targetLang: targetLang.display_name,
          textLength: text.length,
        },
        'processCustomText'
      );
    }
  }

  async assessPronunciation(originalText: string, userTranscript: string, language: Language): Promise<SpeechAssessment> {
    if (this.languageService.isDevMode && this.store.mockApiMode()) {
      console.warn('--- MOCK API MODE: Returning mock assessment. ---');
      await new Promise(resolve => setTimeout(resolve, 500));
      return MOCK_ASSESSMENT;
    }

    const assessPronunciationQuery = /* GraphQL */ `
      query AssessPronunciation($originalText: String!, $userTranscript: String!, $language: String!) {
        assessPronunciation(originalText: $originalText, userTranscript: $userTranscript, language: $language)
      }
    `;

    try {
      const response = await this.client.graphql({
        query: assessPronunciationQuery,
        variables: {
          originalText,
          userTranscript,
          language: language.display_name,
        }
      });

      if ('subscribe' in response) {
        throw new Error('Unexpected subscription result for a GraphQL query.');
      }

      if (response.errors) {
        throw { errors: response.errors };
      }

      if (!response.data?.assessPronunciation) {
        console.error("Invalid response from backend:", response.data);
        throw new Error("The backend returned an invalid or empty assessment. Please try again.");
      }

      // Handle JSON response - it might be a string or already parsed
      let assessment: SpeechAssessment;
      const rawAssessment = response.data.assessPronunciation;

      console.log('[GeminiService:assessPronunciation] Raw response type:', typeof rawAssessment);
      console.log('[GeminiService:assessPronunciation] Raw response:', rawAssessment);

      if (typeof rawAssessment === 'string') {
        // Parse if it's a JSON string
        try {
          assessment = JSON.parse(rawAssessment) as SpeechAssessment;
        } catch (parseError) {
          console.error('[GeminiService:assessPronunciation] JSON parse error:', parseError);
          throw new Error("Failed to parse assessment response from backend.");
        }
      } else if (typeof rawAssessment === 'object' && rawAssessment !== null) {
        // Already an object
        assessment = rawAssessment as SpeechAssessment;
      } else {
        throw new Error(`Unexpected response type: ${typeof rawAssessment}`);
      }

      console.log('[GeminiService:assessPronunciation] Parsed assessment:', assessment);
      return assessment;

    } catch (error) {
      this.handleError(
        error,
        {
          originalText,
          userTranscript,
          language: language.display_name,
        },
        'assessPronunciation'
      );
    }
  }

  async listPracticeScenarios(sourceLang: Language, targetLang: Language): Promise<ScenarioSummary[]> {
    if (this.languageService.isDevMode && this.store.mockApiMode()) {
      console.warn('--- MOCK API MODE: Returning empty list for "listPracticeScenarios". ---');
      return Promise.resolve([]);
    }

    const difficultyLevels = this.languageService.difficultyLevels;

    const listScenariosQuery = /* GraphQL */ `
      query ListScenarios(
        $sourceLanguage: String!
        $targetLanguage: String!
        $difficulty: String!
      ) {
        listScenarios(
          filter: {
            sourceLang: { eq: $sourceLanguage }
            targetLang: { eq: $targetLanguage }
            difficulty_level: { eq: $difficulty }
          },
          limit: 1000
        ) {
          items {
            id
            name
            description
            difficulty_level
            topic
          }
        }
      }
    `;

    try {
      const promises = difficultyLevels.map(level => {
        return this.client.graphql({
          query: listScenariosQuery,
          variables: {
            sourceLanguage: sourceLang.display_name,
            targetLanguage: targetLang.display_name,
            difficulty: level
          }
        });
      });

      const responses = await Promise.all(promises);

      const allScenarios: ScenarioSummary[] = [];
      for (const response of responses) {
        if ('subscribe' in response) {
          console.warn('Unexpected subscription result for a GraphQL query in listPracticeScenarios.');
          continue;
        }

        if (response.errors) {
          throw { errors: response.errors };
        }

        const items = response.data?.listScenarios?.items || [];
        const validItems = (items as ScenarioSummary[]).filter(item => item);
        allScenarios.push(...validItems);
      }

      return allScenarios;

    } catch (error) {
      this.handleError(
        error,
        {
          sourceLang: sourceLang.display_name,
          targetLang: targetLang.display_name,
          requestedDifficulties: difficultyLevels,
        },
        'listPracticeScenarios'
      );
    }
  }

  async listExistingScenariosByTopic(
    sourceLang: Language,
    targetLang: Language,
    difficulty: string,
    topic: string
  ): Promise<ScenarioSummary[]> {
    if (this.languageService.isDevMode && this.store.mockApiMode()) {
      console.warn('--- MOCK API MODE: Returning empty list for "listExistingScenariosByTopic". ---');
      return Promise.resolve([]);
    }

    // Use the same approach as multiple topics since database stores topics as comma-separated strings
    const baseListQuery = /* GraphQL */ `
      query ListScenariosByLevel(
        $sourceLanguage: String!
        $targetLanguage: String!
        $difficulty: String!
      ) {
        listScenarios(
          filter: {
            sourceLang: { eq: $sourceLanguage }
            targetLang: { eq: $targetLanguage }
            difficulty_level: { eq: $difficulty }
          },
          limit: 1000
        ) {
          items {
            id
            name
            description
            difficulty_level
            topic
          }
        }
      }
    `;

    try {
      const response = await this.client.graphql({
        query: baseListQuery,
        variables: {
          sourceLanguage: sourceLang.display_name,
          targetLanguage: targetLang.display_name,
          difficulty,
        },
      });

      if ('subscribe' in response) {
        throw new Error('Unexpected subscription result for a GraphQL query.');
      }

      if (response.errors) {
        throw { errors: response.errors };
      }

      const items = (response as any).data?.listScenarios?.items || [];
      const all: ScenarioSummary[] = (items as ScenarioSummary[]).filter(Boolean);

      // Filter by topic substring since topics are stored as comma-separated strings
      const topicLower = topic.trim().toLowerCase();
      return all.filter(s => {
        const subject = (s.topic || '').toLowerCase();
        return subject.includes(topicLower);
      });
    } catch (error) {
      this.handleError(
        error,
        {
          sourceLang: sourceLang.display_name,
          targetLang: targetLang.display_name,
          difficulty,
          topic,
        },
        'listExistingScenariosByTopic'
      );
    }
  }

  async listExistingScenariosByTopics(
    sourceLang: Language,
    targetLang: Language,
    difficulty: string,
    topics: string[]
  ): Promise<ScenarioSummary[]> {
    if (this.languageService.isDevMode && this.store.mockApiMode()) {
      console.warn('--- MOCK API MODE: Returning empty list for "listExistingScenariosByTopics". ---');
      return Promise.resolve([]);
    }

    // Reuse the base list by difficulty and languages, then filter on the client
    const baseListQuery = /* GraphQL */ `
      query ListScenariosByLevel(
        $sourceLanguage: String!
        $targetLanguage: String!
        $difficulty: String!
      ) {
        listScenarios(
          filter: {
            sourceLang: { eq: $sourceLanguage }
            targetLang: { eq: $targetLanguage }
            difficulty_level: { eq: $difficulty }
          },
          limit: 1000
        ) {
          items {
            id
            name
            description
            difficulty_level
            topic
          }
        }
      }
    `;

    try {
      const response = await this.client.graphql({
        query: baseListQuery,
        variables: {
          sourceLanguage: sourceLang.display_name,
          targetLanguage: targetLang.display_name,
          difficulty,
        },
      });

      if ('subscribe' in response) {
        throw new Error('Unexpected subscription result for a GraphQL query.');
      }

      if (response.errors) {
        throw { errors: response.errors };
      }

      const items = (response as any).data?.listScenarios?.items || [];
      const all: ScenarioSummary[] = (items as ScenarioSummary[]).filter(Boolean);
      const required = topics.map(t => t.trim()).filter(Boolean);
      if (required.length === 0) return all;

      // Construct the comma-separated topic string that would be stored in the database
      const commaSeparatedTopic = required.join(', ');
      const commaSeparatedTopicLower = commaSeparatedTopic.toLowerCase();

      return all.filter(s => {
        const subject = (s.topic || '').toLowerCase();
        // First try exact match of the comma-separated format
        if (subject === commaSeparatedTopicLower) {
          return true;
        }
        // Also check if all topics are contained in the stored topic string
        // This handles cases where the stored topic might have a different order or additional topics
        return required.every(t => subject.includes(t.toLowerCase()));
      });
    } catch (error) {
      this.handleError(
        error,
        {
          sourceLang: sourceLang.display_name,
          targetLang: targetLang.display_name,
          difficulty,
          topics,
        },
        'listExistingScenariosByTopics'
      );
    }
  }

  async getScenarioById(id: string): Promise<ConversationScenario> {
    if (this.languageService.isDevMode && this.store.mockApiMode()) {
      console.warn('--- MOCK API MODE: Returning mock scenario for "getScenarioById". ---');
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockScenario = this.getRandomScenario();
      mockScenario.id = id;
      mockScenario.name = "Mock: Loaded Scenario";
      return mockScenario;
    }

    const getScenarioQuery = /* GraphQL */ `
      query GetScenario($id: ID!) {
        getScenario(id: $id) {
          id
          scenario
        }
      }
    `;

    try {
      const response = await this.client.graphql({
        query: getScenarioQuery,
        variables: { id }
      });

      if ('subscribe' in response) {
        throw new Error('Unexpected subscription result for a GraphQL query.');
      }

      if (response.errors) {
        throw { errors: response.errors };
      }

      if (!response.data?.getScenario?.scenario) {
        console.error("Invalid response from backend:", response.data);
        throw new Error("The backend returned an invalid or empty scenario. It might have been deleted.");
      }

      const scenarioString = response.data.getScenario.scenario;
      const scenario = JSON.parse(scenarioString) as ConversationScenario;
      return scenario;

    } catch (error) {
      this.handleError(error, { id }, 'getScenarioById');
    }
  }
}