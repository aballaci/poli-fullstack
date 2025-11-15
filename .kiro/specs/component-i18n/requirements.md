# Requirements Document

## Introduction

This document outlines the requirements for internationalizing all remaining components in the Poli language learning application. The application currently has partial internationalization support using Transloco, with some components already translated (header, home, wizard, dashboard). This feature will complete the internationalization by adding Italian translations for all remaining components, excluding the support area as specified.

## Glossary

- **Transloco**: The internationalization (i18n) library used in the Angular application for managing translations
- **Translation Key**: A unique identifier in the format "namespace.key" used to reference translated text
- **i18n Files**: JSON files located in `src/assets/i18n/` containing translations for different languages (en.json, it.json)
- **Component**: An Angular component that renders UI elements with text content
- **Hardcoded Text**: Text strings directly embedded in HTML templates that need to be extracted into translation files

## Requirements

### Requirement 1

**User Story:** As a user, I want all application components to display text in my selected language (English or Italian), so that I can use the application in my preferred language.

#### Acceptance Criteria

1. WHEN the user views any component in the application, THE Application SHALL display all text content using the Transloco translation system
2. WHEN the user switches the application language, THE Application SHALL update all visible text in all components to the selected language
3. WHERE a component contains user-facing text, THE Application SHALL retrieve that text from the translation files rather than hardcoded strings
4. THE Application SHALL maintain consistent translation key naming conventions following the pattern "componentName.keyName"
5. THE Application SHALL provide Italian translations for all English text in the identified components

### Requirement 2

**User Story:** As a developer, I want a comprehensive list of components requiring internationalization, so that I can systematically implement translations without missing any components.

#### Acceptance Criteria

1. THE System SHALL identify all components with hardcoded English text that require internationalization
2. THE System SHALL exclude support-related components (contact-us, help-center, privacy-policy, terms-of-service) from internationalization as specified
3. THE System SHALL document each component's hardcoded text strings that need translation
4. THE System SHALL organize translation keys by component namespace for maintainability
5. THE System SHALL ensure no duplicate translation keys exist across the application

### Requirement 3

**User Story:** As a user, I want the conversation and practice components to display instructions and feedback in my selected language, so that I can understand how to use the learning features.

#### Acceptance Criteria

1. WHEN the user views the conversation-view component, THE Application SHALL display all navigation labels, instructions, and status messages in the selected language
2. WHEN the user views the practice-view component, THE Application SHALL display all practice instructions and controls in the selected language
3. WHEN the user views the reading-mode component, THE Application SHALL display all reading instructions and tooltips in the selected language
4. THE Application SHALL translate all button labels including "Next Step", "Back", "Finish", "Next" in the conversation flow
5. THE Application SHALL translate all toggle labels including "AI Evaluation" and practice direction indicators

### Requirement 4

**User Story:** As a user, I want the scenario selection and management interfaces to display in my selected language, so that I can easily browse and select learning scenarios.

#### Acceptance Criteria

1. WHEN the user views the scenario-catalog component, THE Application SHALL display all catalog labels, filters, and messages in the selected language
2. WHEN the user views the scenario-history component, THE Application SHALL display all history labels and messages in the selected language
3. WHEN the user views the scenario-selector component, THE Application SHALL display all category names, instructions, and action buttons in the selected language
4. THE Application SHALL translate all difficulty level labels (Beginner, Intermediate, Advanced) consistently across all components
5. THE Application SHALL translate all empty state messages and error messages in scenario components

### Requirement 5

**User Story:** As a user, I want the summary and results screens to display in my selected language, so that I can understand my learning progress and achievements.

#### Acceptance Criteria

1. WHEN the user views the summary-view component, THE Application SHALL display all congratulatory messages, labels, and statistics in the selected language
2. WHEN the user views the vocabulary component, THE Application SHALL display all vocabulary instructions and labels in the selected language
3. THE Application SHALL translate all score labels including "Avg. Pronunciation", "Avg. Fluency", and "Sentence Summary"
4. THE Application SHALL translate all completion messages including "Congratulations!", "Keep Practicing!", and status indicators
5. THE Application SHALL translate the "Not practiced" status message for incomplete sentences

### Requirement 6

**User Story:** As a user, I want the cost summary and settings interfaces to display in my selected language, so that I can manage my account and view usage information.

#### Acceptance Criteria

1. WHEN the user views the cost-summary component, THE Application SHALL display all cost-related labels, table headers, and statistics in the selected language
2. THE Application SHALL translate all tab labels including "Overview" and "Top Users"
3. THE Application SHALL translate all metric labels including "Total Cost", "Avg Cost Per User", "Total Users"
4. THE Application SHALL translate all table column headers for feature costs and user costs
5. THE Application SHALL translate all error messages and loading states in the cost summary

### Requirement 7

**User Story:** As a user, I want the introductory and informational components to display in my selected language, so that I can understand how to use the application.

#### Acceptance Criteria

1. WHEN the user views the intro component, THE Application SHALL display all instructional content and step descriptions in the selected language
2. WHEN the user views the welcome component, THE Application SHALL display all welcome messages and checkbox labels in the selected language
3. THE Application SHALL translate all step titles and descriptions in the intro component
4. THE Application SHALL translate the "Don't show this again on startup" checkbox label
5. THE Application SHALL translate the "Got it!" button in the welcome component

### Requirement 8

**User Story:** As a user, I want the footer component to display in my selected language, so that I have a consistent language experience throughout the application.

#### Acceptance Criteria

1. WHEN the user views the footer component, THE Application SHALL display all footer links, headings, and text in the selected language
2. THE Application SHALL translate all section headings including "Quick Links" and "Support"
3. THE Application SHALL translate all link labels including "About Us", "How It Works", "Help Center", "Contact Us"
4. THE Application SHALL translate the mission statement and copyright text
5. THE Application SHALL translate all social media and contact section labels

### Requirement 9

**User Story:** As a developer, I want all translation keys to follow a consistent structure, so that the translation files are maintainable and scalable.

#### Acceptance Criteria

1. THE Application SHALL organize translation keys using component-based namespaces (e.g., "conversation.", "summary.", "footer.")
2. THE Application SHALL use descriptive key names that indicate the purpose of the text (e.g., "next_step", "back_button", "loading_message")
3. THE Application SHALL maintain alphabetical ordering within each namespace for easy lookup
4. THE Application SHALL use snake_case for multi-word translation keys
5. THE Application SHALL document any translation keys that contain dynamic interpolation values

### Requirement 10

**User Story:** As a user, I want all date formats, numbers, and dynamic content to display correctly in my selected language, so that the application feels native to my language.

#### Acceptance Criteria

1. WHERE dynamic content is displayed, THE Application SHALL use Transloco interpolation for variable values
2. THE Application SHALL maintain proper grammar and sentence structure in Italian translations
3. THE Application SHALL preserve all HTML formatting, icons, and styling when applying translations
4. THE Application SHALL ensure all aria-labels and accessibility text are translated for screen readers
5. THE Application SHALL translate all placeholder text in input fields and text areas
