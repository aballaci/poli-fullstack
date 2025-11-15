# Design Document: Transloco Internationalization

## Overview

This design implements internationalization (i18n) for the Angular language learning application using @jsverse/transloco. The solution provides multi-language UI support with English and Italian, smart language detection, user preferences persistence, and an optional immersion mode for advanced learners.

The implementation follows Angular best practices with standalone components, uses Transloco's lazy loading for optimal performance, and integrates seamlessly with the existing application architecture.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │  Templates   │  │   Services   │      │
│  │              │  │              │  │              │      │
│  │ - Home       │  │ - transloco  │  │ - Language   │      │
│  │ - Header     │  │   pipe       │  │   Service    │      │
│  │ - Settings   │  │ - structural │  │ - Theme      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                  Transloco Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            TranslocoService (Core)                   │   │
│  │  - Language switching                                │   │
│  │  - Translation resolution                            │   │
│  │  - Fallback handling                                 │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────┴───────────────────────────────────────┐   │
│  │         TranslocoHttpLoader (Custom)                 │   │
│  │  - Loads translation JSON files                      │   │
│  │  - Handles missing translations                      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                  Storage Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Browser LocalStorage                    │   │
│  │  - UI language preference                            │   │
│  │  - Immersion mode state                              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                Translation Files                             │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   en.json    │         │   it.json    │                  │
│  │              │         │              │                  │
│  │ - UI strings │         │ - UI strings │                  │
│  │ - Messages   │         │ - Messages   │                  │
│  └──────────────┘         └──────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

### Component Integration

Transloco integrates with components through:
1. **Transloco Pipe**: `{{ 'key' | transloco }}` in templates
2. **Transloco Directive**: `*transloco="let t"` for scoped translations
3. **TranslocoService**: Direct injection for programmatic access

## Components and Interfaces

### 1. Transloco Configuration

**File**: `src/app/transloco.config.ts`

```typescript
export const translocoConfig: TranslocoConfig = {
  availableLangs: ['en', 'it'],
  defaultLang: 'en',
  fallbackLang: 'en',
  reRenderOnLangChange: true,
  prodMode: environment.production,
  missingHandler: {
    useFallbackTranslation: true,
    logMissingKey: !environment.production
  }
}
```

### 2. HTTP Loader

**File**: `src/app/transloco-loader.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  constructor(private http: HttpClient) {}
  
  getTranslation(lang: string): Observable<Translation> {
    return this.http.get<Translation>(`/assets/i18n/${lang}.json`);
  }
}
```

### 3. Language Service

**File**: `src/app/services/language.service.ts`

```typescript
interface LanguagePreferences {
  uiLanguage: string;
  immersionMode: boolean;
  learningLanguage?: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'language_preferences';
  private readonly UNDO_DURATION = 5000;
  
  // Signals for reactive state
  uiLanguage = signal<string>('en');
  immersionMode = signal<boolean>(false);
  showUndoNotification = signal<boolean>(false);
  previousLanguage = signal<string | null>(null);
  
  constructor(
    private transloco: TranslocoService,
    private sessionStore: SessionStore
  ) {
    this.initializeLanguage();
  }
  
  // Initialize language from storage or system
  private initializeLanguage(): void
  
  // Detect browser/system language
  private detectSystemLanguage(): string
  
  // Change UI language with undo support
  changeLanguage(lang: string): void
  
  // Undo language change
  undoLanguageChange(): void
  
  // Toggle immersion mode
  toggleImmersionMode(): void
  
  // Get language display name
  getLanguageDisplayName(code: string, inLanguage?: string): string
  
  // Persist preferences
  private savePreferences(): void
  
  // Load preferences
  private loadPreferences(): LanguagePreferences | null
}
```

### 4. Language Switcher Component

**File**: `src/app/components/language-switcher/language-switcher.component.ts`

```typescript
@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: `
    <div class="language-switcher">
      <button (click)="toggleDropdown()">
        <span class="fi fi-{{ currentLanguageFlag() }}"></span>
        <span>{{ currentLanguageName() }}</span>
      </button>
      
      @if (isOpen()) {
        <div class="dropdown">
          @for (lang of availableLanguages; track lang.code) {
            <button (click)="selectLanguage(lang.code)">
              <span class="fi fi-{{ lang.flag }}"></span>
              <span>{{ lang.displayName }} ({{ lang.nativeName }})</span>
            </button>
          }
        </div>
      }
    </div>
  `
})
export class LanguageSwitcherComponent {
  languageService = inject(LanguageService);
  
  isOpen = signal(false);
  currentLanguageFlag = computed(() => ...);
  currentLanguageName = computed(() => ...);
  
  availableLanguages = [
    { code: 'en', flag: 'gb', displayName: 'English', nativeName: 'English' },
    { code: 'it', flag: 'it', displayName: 'Italian', nativeName: 'Italiano' }
  ];
  
  selectLanguage(code: string): void {
    this.languageService.changeLanguage(code);
    this.isOpen.set(false);
  }
  
  toggleDropdown(): void {
    this.isOpen.update(v => !v);
  }
}
```

### 5. Undo Notification Component

**File**: `src/app/components/undo-notification/undo-notification.component.ts`

```typescript
@Component({
  selector: 'app-undo-notification',
  standalone: true,
  template: `
    @if (languageService.showUndoNotification()) {
      <div class="undo-notification">
        <span>{{ 'language.changed' | transloco }}</span>
        <button (click)="undo()">{{ 'common.undo' | transloco }}</button>
      </div>
    }
  `
})
export class UndoNotificationComponent {
  languageService = inject(LanguageService);
  
  undo(): void {
    this.languageService.undoLanguageChange();
  }
}
```

## Data Models

### Translation File Structure

**File**: `src/assets/i18n/en.json`

```json
{
  "common": {
    "undo": "Undo",
    "save": "Save",
    "cancel": "Cancel",
    "close": "Close"
  },
  "language": {
    "changed": "App language changed",
    "select": "Select language",
    "immersion_mode": "Immersion mode",
    "immersion_desc": "Use learning language for interface"
  },
  "home": {
    "hero_title": "Speak a New Language with Confidence",
    "hero_subtitle": "Join millions of learners...",
    "start_trial": "Start Your Free Trial"
  },
  "header": {
    "home": "Home",
    "languages": "Languages",
    "features": "Features",
    "pricing": "Pricing",
    "about": "About",
    "login": "Login",
    "signup": "Sign Up Free"
  }
}
```

### Language Preferences Model

```typescript
interface LanguagePreferences {
  uiLanguage: string;           // Current UI language code
  immersionMode: boolean;        // Immersion mode enabled
  learningLanguage?: string;     // User's learning language
  systemLanguage?: string;       // Detected system language
  lastChanged?: number;          // Timestamp of last change
}
```

### Language Definition Model

```typescript
interface LanguageDefinition {
  code: string;                  // ISO 639-1 code (e.g., 'en', 'it')
  flag: string;                  // Flag icon code (e.g., 'gb', 'it')
  displayName: string;           // Name in current UI language
  nativeName: string;            // Name in its own language
  rtl?: boolean;                 // Right-to-left language
}
```

## Error Handling

### Missing Translation Keys

When a translation key is missing:
1. Transloco logs a warning in development mode
2. Returns the key itself as fallback text
3. Falls back to English translation if available
4. Displays the key in brackets: `[missing.key]`

### Failed Translation Loading

When translation file fails to load:
1. Retry loading once after 1 second delay
2. Fall back to default language (English)
3. Show user-friendly error notification
4. Log error details for debugging

### Invalid Language Code

When an invalid language code is provided:
1. Validate against `availableLangs` list
2. Fall back to default language
3. Log warning with invalid code
4. Update stored preferences to valid code

## Testing Strategy

### Unit Tests

**Language Service Tests** (`language.service.spec.ts`):
- System language detection logic
- Language switching with undo functionality
- LocalStorage persistence and retrieval
- Immersion mode toggle
- Language display name resolution

**Transloco Loader Tests** (`transloco-loader.spec.ts`):
- HTTP request for translation files
- Error handling for failed requests
- Caching behavior

**Language Switcher Component Tests** (`language-switcher.component.spec.ts`):
- Dropdown toggle functionality
- Language selection
- Display of language names in both formats
- Integration with LanguageService

### Integration Tests

**End-to-End Language Switching**:
1. Load application with default language
2. Switch to Italian
3. Verify all UI text updates
4. Verify undo notification appears
5. Click undo and verify language reverts
6. Reload page and verify language persists

**Immersion Mode Flow**:
1. Set learning language to Italian
2. Enable immersion mode
3. Verify UI switches to Italian
4. Disable immersion mode
5. Verify UI reverts to previous language

**System Language Detection**:
1. Mock browser language to Italian
2. Load application for first time
3. Verify UI initializes in Italian
4. Clear storage and mock English
5. Verify UI initializes in English

### Manual Testing Checklist

- [ ] All hardcoded text replaced with translation keys
- [ ] Language switcher displays correctly in header
- [ ] Undo notification appears and functions correctly
- [ ] Language preference persists across sessions
- [ ] System language detection works on first visit
- [ ] Immersion mode toggles correctly
- [ ] All components re-render on language change
- [ ] No console errors for missing keys
- [ ] RTL support works (if applicable)
- [ ] Translation files are properly formatted JSON

## Performance Considerations

### Lazy Loading

Transloco loads translation files on-demand:
- Only active language is loaded initially
- Switching languages triggers async load
- Cached translations avoid redundant requests

### Bundle Size

- Transloco core: ~5KB gzipped
- Translation files: ~2-5KB per language
- Total overhead: ~10-15KB for two languages

### Change Detection

- Use `OnPush` change detection strategy where possible
- Transloco pipe is pure and optimized
- Signal-based reactivity minimizes re-renders

## Security Considerations

### XSS Prevention

- All translations are sanitized by Angular
- No HTML injection in translation values
- Use `innerHTML` only with trusted content

### Data Privacy

- Language preferences stored locally only
- No transmission of language data to servers
- Clear preferences on logout (optional)

## Migration Strategy

### Phase 1: Setup and Configuration
1. Install Transloco packages
2. Configure Transloco module
3. Create translation files with initial keys
4. Set up HTTP loader

### Phase 2: Core Components
1. Update Header component
2. Update Home component hero section
3. Add Language Switcher component
4. Add Undo Notification component

### Phase 3: Remaining Components
1. Update all remaining components
2. Replace hardcoded strings with translation keys
3. Test each component individually

### Phase 4: Polish and Testing
1. Complete all translation files
2. Run full test suite
3. Manual testing of all flows
4. Performance testing

## Future Enhancements

1. **Additional Languages**: Add more UI languages (Spanish, French, German)
2. **Translation Management**: Integrate with translation management platform
3. **Pluralization**: Add support for plural forms
4. **Date/Number Formatting**: Locale-specific formatting
5. **Dynamic Content Translation**: Translate user-generated content
6. **A/B Testing**: Test different translations for effectiveness
7. **Translation Analytics**: Track which translations are most viewed
