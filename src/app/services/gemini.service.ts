import { Injectable, inject } from '@angular/core';
import { ConversationScenario, Language, ScenarioSummary, SpeechAssessment } from '../models';
import { generateClient } from 'aws-amplify/api';
import { LanguageService } from './language.service';
import { SessionStore } from '../state/session.store';
import { MOCK_ASSESSMENT, MOCK_SCENARIOS } from './mock-scenarios.data';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private client = generateClient();
  private store = inject(SessionStore);
  private languageService = inject(LanguageService);

  private getRandomScenario(): ConversationScenario {
    const randomIndex = Math.floor(Math.random() * MOCK_SCENARIOS.length);
    // Return a deep copy to prevent mutation of the original mock data
    return JSON.parse(JSON.stringify(MOCK_SCENARIOS[randomIndex]));
  }



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
    if (this.languageService.isDevMode && this.store.mockApiMode()) {
      console.warn('--- MOCK API MODE: Returning mock scenario for "processCustomText". ---');
      await new Promise(resolve => setTimeout(resolve, 750));
      const mockScenario = this.getRandomScenario();
      mockScenario.name = 'Mock: Custom Text';
      mockScenario.description = 'A mock scenario based on your custom text.';
      mockScenario.difficulty_level = difficulty;
      return mockScenario;
    }

    const processCustomTextQuery = /* GraphQL */ `
      query ProcessCustomText(
        $text: String!
        $textLanguage: String!
        $difficulty: String!
        $sourceLang: String!
        $targetLang: String!
      ) {
        processCustomText(
          text: $text
          textLanguage: $textLanguage
          difficulty: $difficulty
          sourceLang: $sourceLang
          targetLang: $targetLang
        )
      }
    `;

    try {
      const response = await this.client.graphql({
        query: processCustomTextQuery,
        variables: {
          text,
          textLanguage,
          difficulty,
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

      if (!response.data?.processCustomText) {
        console.error("Invalid response from backend:", response.data);
        throw new Error("The backend returned an invalid or empty scenario. Please try again.");
      }

      // Handle JSON response - it might be a string or already parsed
      let scenario: ConversationScenario;
      const rawScenario = response.data.processCustomText;

      console.log('[GeminiService:processCustomText] Raw response type:', typeof rawScenario);
      console.log('[GeminiService:processCustomText] Raw response:', rawScenario);

      if (typeof rawScenario === 'string') {
        // Parse if it's a JSON string
        try {
          scenario = JSON.parse(rawScenario) as ConversationScenario;
        } catch (parseError) {
          console.error('[GeminiService:processCustomText] JSON parse error:', parseError);
          throw new Error("Failed to parse scenario response from backend.");
        }
      } else if (typeof rawScenario === 'object' && rawScenario !== null) {
        // Already an object
        scenario = rawScenario as ConversationScenario;
      } else {
        throw new Error(`Unexpected response type: ${typeof rawScenario}`);
      }

      console.log('[GeminiService:processCustomText] Parsed scenario:', scenario);
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