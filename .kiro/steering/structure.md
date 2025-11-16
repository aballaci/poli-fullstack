# Project Structure

## Root Structure

```
/
├── amplify/                 # Backend definitions (Amplify Gen 2)
├── src/                     # Frontend application
├── .kiro/                   # Kiro configuration and specs
├── dist/                    # Build output (gitignored)
├── node_modules/            # Dependencies (gitignored)
└── amplify_outputs.json     # Auto-generated Amplify config
```

## Backend Structure (`amplify/`)

```
amplify/
├── backend.ts               # Main backend composition
├── auth/
│   └── resource.ts          # Cognito auth configuration
├── data/
│   └── resource.ts          # GraphQL schema and DynamoDB models
├── storage/
│   └── resource.ts          # S3 bucket configuration
└── functions/               # Lambda functions (kebab-case names)
    ├── scenario-generator/
    │   ├── resource.ts      # Function config
    │   ├── handler.ts       # Function logic
    │   └── *.ts             # Helper modules
    ├── exercise-generator/
    ├── pronunciation-assessor/
    ├── custom-text-processor/
    ├── usage-summary/
    └── exercise-retriever/
```

## Frontend Structure (`src/app/`)

```
src/app/
├── components/              # All UI components (flat structure)
│   ├── home/
│   ├── language-wizard/
│   ├── scenario-selector/
│   ├── conversation-view/
│   ├── exercises/           # Exercise components
│   │   ├── fill-in-blank/
│   │   ├── matching-pairs/
│   │   ├── sentence-scramble/
│   │   └── swipe/
│   ├── vocabulary/
│   ├── flash-cards/
│   └── ...
├── services/                # Business logic and API integration
│   ├── gemini.service.ts    # AI API calls
│   ├── language.service.ts  # Language/i18n management
│   ├── exercise.service.ts  # Exercise logic
│   ├── sound.service.ts     # Audio playback
│   └── ...
├── state/                   # State management
│   └── session.store.ts     # Global session state (signals)
├── guards/                  # Route guards
│   ├── conversation.guard.ts
│   ├── language-setup.guard.ts
│   └── ...
├── models/                  # TypeScript interfaces/types
│   └── index.ts
├── app.component.ts         # Root component
├── app.routes.ts            # Route definitions
└── transloco.config.ts      # i18n configuration
```

## Key Conventions

* **Components:** Flat structure under `components/`, not feature-based folders
* **Naming:** All files use kebab-case (e.g., `language-wizard.component.ts`)
* **Standalone:** All components are standalone (no NgModules)
* **Services:** Injectable with `providedIn: 'root'`
* **State:** Signals-based reactive state via `SessionStore`
* **Routes:** Defined in `app.routes.ts` with lazy loading where applicable

## Translation Files

```
src/assets/i18n/
├── en.json                  # English (default)
├── it.json                  # Italian
├── es.json                  # Spanish
├── fr.json                  # French
├── de.json                  # German
├── pt.json                  # Portuguese
├── ja.json                  # Japanese
├── zh.json                  # Chinese
└── ar.json                  # Arabic
```

## Specs & Documentation

```
.kiro/specs/                 # Feature specifications
├── component-i18n/
├── exercise-ui-components/
├── mobile-optimization/
├── offline-storage/
├── pwa-offline-support/
├── scenario-exercise-generator/
└── transloco-i18n/
```
