# Implementation Plan

- [x] 1. Install and configure Transloco


  - Install @jsverse/transloco and @jsverse/transloco-locale packages
  - Create transloco.config.ts with configuration for English and Italian
  - Create transloco-loader.ts to load translation files via HTTP
  - Update app.config.ts to provide Transloco configuration
  - _Requirements: 1.1, 1.2_

- [x] 2. Create translation files structure


  - Create assets/i18n directory
  - Create en.json with English translations for common, language, home, and header sections
  - Create it.json with Italian translations for common, language, home, and header sections
  - _Requirements: 1.1, 3.1_

- [x] 3. Implement Language Service


- [x] 3.1 Create LanguageService with core functionality


  - Create services/language.service.ts
  - Implement signal-based state management for uiLanguage, immersionMode, showUndoNotification
  - Implement initializeLanguage method to load preferences from localStorage
  - Implement detectSystemLanguage method using navigator.language
  - _Requirements: 1.2, 1.3, 4.2, 4.3_

- [x] 3.2 Implement language switching with undo support

  - Implement changeLanguage method that updates TranslocoService and shows undo notification
  - Implement undoLanguageChange method to revert to previous language
  - Add 5-second timer to hide undo notification automatically
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 3.3 Implement preferences persistence

  - Implement savePreferences method to store language preferences in localStorage
  - Implement loadPreferences method to retrieve stored preferences
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.4 Implement immersion mode


  - Implement toggleImmersionMode method
  - Integrate with SessionStore to get learning language
  - Switch UI language to learning language when immersion mode is enabled
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.5 Implement language display utilities

  - Implement getLanguageDisplayName method to return language names
  - Support displaying names in both current UI language and native language
  - _Requirements: 2.1_

- [x] 4. Create Language Switcher Component


- [x] 4.1 Create component structure


  - Create components/language-switcher directory
  - Create language-switcher.component.ts with standalone configuration
  - Create language-switcher.component.html template
  - Create language-switcher.component.css with dropdown styles
  - _Requirements: 2.1, 2.2_

- [x] 4.2 Implement dropdown functionality

  - Add signal for dropdown open/closed state
  - Implement toggleDropdown method
  - Add click-outside directive to close dropdown
  - _Requirements: 2.1_

- [x] 4.3 Implement language selection

  - Create availableLanguages array with English and Italian definitions
  - Implement selectLanguage method that calls LanguageService.changeLanguage
  - Display language names in format "English (English)" and "Italiano (Italian)"
  - Add flag icons using flag-icons library
  - _Requirements: 2.1, 2.2_

- [x] 5. Create Undo Notification Component


  - Create components/undo-notification directory
  - Create undo-notification.component.ts with standalone configuration
  - Create template with notification message and undo button
  - Style notification as toast at bottom of screen
  - Implement undo method that calls LanguageService.undoLanguageChange
  - _Requirements: 2.4_

- [x] 6. Update Header Component


- [x] 6.1 Add Language Switcher to header


  - Import LanguageSwitcherComponent
  - Add language switcher button next to theme toggle
  - Position appropriately in header layout
  - _Requirements: 2.1_

- [x] 6.2 Replace hardcoded text with translation keys

  - Replace "Home", "Languages", "Features", "Pricing", "About" with transloco pipe
  - Replace "Login" and "Sign Up Free" with transloco pipe
  - Update aria-labels to use translations
  - _Requirements: 3.1, 3.2_

- [x] 7. Update Home Component


- [x] 7.1 Replace hero section text


  - Replace hero title with transloco pipe
  - Replace hero subtitle with transloco pipe
  - Replace "Start Your Free Trial" button text
  - _Requirements: 3.1, 3.2_

- [x] 7.2 Replace languages section text


  - Replace "Start Your Journey" heading
  - Replace section description
  - Replace lesson count labels
  - Replace "Beginner" and "Advanced" badges
  - _Requirements: 3.1, 3.2_

- [x] 7.3 Replace features section text


  - Replace "A Better Way to Learn" heading
  - Replace section description
  - Replace all 6 feature titles and descriptions
  - _Requirements: 3.1, 3.2_

- [x] 7.4 Replace how it works section text


  - Replace "How It Works" heading
  - Replace section description
  - Replace all 3 step titles and descriptions
  - _Requirements: 3.1, 3.2_

- [x] 7.5 Replace testimonials section text


  - Replace "What Our Users Say" heading
  - Replace section description
  - Replace testimonial quotes (keep names as-is)
  - _Requirements: 3.1, 3.2_

- [x] 7.6 Replace pricing section text


  - Replace "Choose Your Plan" heading
  - Replace section description
  - Replace plan names, descriptions, and feature lists
  - Replace "Get Started" button text
  - _Requirements: 3.1, 3.2_

- [x] 7.7 Replace CTA section text


  - Replace "Ready to Start Your Language Journey?" heading
  - Replace CTA description
  - Replace button text
  - _Requirements: 3.1, 3.2_

- [x] 8. Add Undo Notification to App Component


  - Import UndoNotificationComponent in app.component.ts
  - Add undo notification component to app.component.html template
  - Position at bottom-right of viewport
  - _Requirements: 2.4_

- [x] 9. Update remaining components with translations

  - Identify all components with hardcoded text
  - Add translation keys to translation files
  - Replace hardcoded text with transloco pipe
  - Test each component for proper translation display
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 10. Add immersion mode toggle to Settings

  - Update settings component to include immersion mode section
  - Add toggle switch for immersion mode
  - Add description explaining immersion mode
  - Connect toggle to LanguageService.toggleImmersionMode
  - Show current learning language when immersion mode is enabled
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 11. Verify and test implementation



  - Test language switching between English and Italian
  - Test undo functionality with 5-second timeout
  - Test system language detection on first load
  - Test localStorage persistence across page reloads
  - Test immersion mode toggle
  - Verify all UI text is translated
  - Check for missing translation keys in console
  - Test with browser language set to Italian
  - Test with browser language set to unsupported language
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_
