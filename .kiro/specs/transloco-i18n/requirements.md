# Requirements Document

## Introduction

This feature adds internationalization (i18n) support to the Angular application using @jsverse/transloco library. The system will support multiple languages, starting with English as the default and Italian as an additional language. Users will be able to switch between languages, and all UI text will be translated accordingly.

## Glossary

- **Transloco**: The internationalization library used for managing translations in the Angular application
- **Translation Service**: The service provided by Transloco that manages language switching and text translation
- **Translation File**: JSON files containing key-value pairs of translation strings for each supported language
- **UI Language**: The language used for the application interface (menus, buttons, labels)
- **Native Language**: The user's first language, used for translations and explanations
- **Learning Language**: The language the user is studying
- **System Language**: The language detected from the user's browser or operating system settings
- **Language Switcher**: A UI component that allows users to change the UI language
- **Immersion Mode**: An optional feature where the UI language matches the learning language for enhanced practice

## Requirements

### Requirement 1

**User Story:** As a user, I want the application to automatically detect my preferred language on first run, so that I can start using the app in a familiar language

#### Acceptance Criteria

1. THE Translation Service SHALL load translation files for English and Italian languages
2. WHEN the application initializes for the first time, THE Translation Service SHALL detect the System Language from the browser
3. IF the System Language matches a supported UI Language, THEN THE Translation Service SHALL set the UI Language to the System Language
4. IF the System Language does not match a supported UI Language, THEN THE Translation Service SHALL set the UI Language to English
5. WHEN a translation key is requested, THE Translation Service SHALL return the translated text in the UI Language
6. IF a translation key does not exist in the UI Language, THEN THE Translation Service SHALL return the translation key itself as fallback text

### Requirement 2

**User Story:** As a user, I want to switch between English and Italian for the app interface, so that I can view the application content in either language

#### Acceptance Criteria

1. THE Language Switcher SHALL display language names in both the current UI Language and the native language name
2. WHEN the user selects a UI Language, THE Language Switcher SHALL update the UI Language in the Translation Service
3. WHEN the UI Language changes, THE Translation Service SHALL reload all visible translations with the new language
4. WHEN the UI Language changes, THE Language Switcher SHALL display an undo notification for five seconds
5. THE Translation Service SHALL persist the user's UI Language preference across browser sessions

### Requirement 3

**User Story:** As a developer, I want all UI text to be translatable, so that new languages can be added without code changes

#### Acceptance Criteria

1. THE application components SHALL use translation keys instead of hardcoded text strings
2. THE Translation Service SHALL provide a translation pipe for use in component templates
3. THE Translation Service SHALL provide a translation method for use in component TypeScript code
4. WHEN a new translation key is added to translation files, THE Translation Service SHALL make it available without requiring code changes

### Requirement 4

**User Story:** As a user, I want the application to remember my language preference, so that I don't have to select it every time I visit

#### Acceptance Criteria

1. WHEN the user selects a UI Language, THE Translation Service SHALL store the preference in browser local storage
2. WHEN the application initializes, THE Translation Service SHALL retrieve the stored UI Language preference from local storage
3. IF a stored UI Language preference exists, THEN THE Translation Service SHALL set it as the UI Language
4. IF no stored UI Language preference exists, THEN THE Translation Service SHALL detect and set the UI Language based on System Language

### Requirement 5

**User Story:** As an advanced user, I want to enable immersion mode to use my learning language for the app interface, so that I can practice the language more intensively

#### Acceptance Criteria

1. THE Language Switcher SHALL provide an immersion mode toggle in the settings
2. THE immersion mode toggle SHALL be disabled by default
3. WHEN immersion mode is enabled and a Learning Language is set, THE Translation Service SHALL set the UI Language to match the Learning Language
4. WHEN immersion mode is disabled, THE Translation Service SHALL restore the previously selected UI Language
5. THE Translation Service SHALL persist the immersion mode preference across browser sessions
