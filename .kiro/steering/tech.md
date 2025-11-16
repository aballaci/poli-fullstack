# Technology Stack

## Frontend Stack

* **Framework:** Angular 17 (standalone components, signals-based state)
* **Styling:** Tailwind CSS + custom SCSS
* **State Management:** Angular Signals + injectable services (SessionStore pattern)
* **Internationalization:** @jsverse/transloco with JSON translation files in `src/assets/i18n/`
* **PWA:** @angular/service-worker with ngsw-config.json
* **Offline Storage:** IndexedDB via `idb` library

## Backend Stack (AWS Amplify Gen 2)

* **API:** AWS AppSync (GraphQL)
* **Database:** Amazon DynamoDB
* **Functions:** AWS Lambda (TypeScript)
* **Auth:** Amazon Cognito
* **Storage:** Amazon S3 (public assets)
* **AI Integration:** Google Gemini API (@google/genai)

## Key Libraries

* `aws-amplify` (v6) - Backend integration
* `@aws-amplify/ui-angular` - Pre-built UI components
* `@jsverse/transloco` - i18n framework
* `@google/genai` - Gemini AI SDK (backend only)
* `idb` - IndexedDB wrapper for offline storage

## Common Commands

### Development
```bash
npm start                    # Start dev server (localhost:4200)
npm run build                # Production build
npm run build:prod           # Production build with optimizations
npm run watch                # Build with watch mode
npm test                     # Run Karma tests
```

### Amplify Backend
```bash
npx ampx sandbox                           # Start local sandbox
npx ampx sandbox --stream-function-logs    # Sandbox with function logs
npx ampx sandbox secret set GEMINI_API_KEY # Set API key secret
npx ampx generate graphql-client-code      # Generate GraphQL types
```

## Project Configuration

* **Angular Config:** `angular.json` - Build configurations, assets, service worker
* **TypeScript:** `tsconfig.json` (base), `tsconfig.app.json` (app), `tsconfig.spec.json` (tests)
* **Tailwind:** `tailwind.config.js` - Custom theme and utilities
* **PWA:** `ngsw-config.json` - Service worker caching strategies
* **Transloco:** `src/app/transloco.config.ts` - i18n configuration

## Environment & Secrets

* Backend secrets managed via `npx ampx sandbox secret set <KEY>`
* Frontend config auto-generated in `amplify_outputs.json` (do not edit manually)
* Amplify configuration initialized in `src/main.ts`
