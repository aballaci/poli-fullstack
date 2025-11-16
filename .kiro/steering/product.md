# Product Overview

This is a language learning application that uses AI-powered conversational scenarios to help users practice speaking and comprehension skills.

## Core Features

* **AI-Generated Scenarios:** Users select topics and difficulty levels (A1-C2 CEFR) to generate contextual conversation practice scenarios using Google Gemini AI
* **Multi-Language Support:** Supports 9 languages (English, Italian, Spanish, French, German, Portuguese, Japanese, Chinese, Arabic) for both UI and learning content
* **Interactive Exercises:** Multiple exercise types including fill-in-blank, matching pairs, sentence scramble, and swipe exercises
* **Speech Assessment:** Pronunciation evaluation using AI to provide feedback on user speech
* **Custom Text Processing:** Users can input their own text to generate personalized learning scenarios
* **Offline Support:** PWA with service worker for offline functionality and background sync
* **Practice History:** Tracks user's completed scenarios and exercises

## User Flow

1. User selects UI language and target learning language via wizard
2. User chooses scenario topic and difficulty level
3. AI generates a contextual conversation scenario
4. User practices through conversation view and exercises
5. Progress and history are saved for future reference

## Technical Approach

* Frontend: Angular 17 SPA with standalone components
* Backend: AWS Amplify Gen 2 with Lambda functions
* AI: Google Gemini API for content generation and assessment
* Storage: DynamoDB for scenarios and user data
* Auth: Amazon Cognito for user authentication
