# Implementation Plan

- [x] 1. Internationalize conversation-view component


  - Extract all hardcoded text from conversation-view.component.html
  - Add translation keys to en.json under "conversation" namespace
  - Create Italian translations in it.json
  - Update template to use Transloco pipes
  - Test language switching and dynamic content
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.4, 3.5_



- [ ] 2. Internationalize reading-mode component
  - Extract hardcoded text from reading-mode.component.html
  - Add translation keys to en.json under "reading" namespace
  - Create Italian translations in it.json
  - Update template with Transloco pipes
  - Test instructions and tooltips in both languages


  - _Requirements: 1.1, 1.2, 1.3, 3.3_

- [ ] 3. Internationalize summary-view component
  - Extract hardcoded text from summary-view.component.html
  - Add translation keys to en.json under "summary" namespace
  - Create Italian translations in it.json


  - Update template with Transloco pipes including interpolation for scores
  - Test congratulations messages and score displays
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.3, 5.4, 5.5_

- [ ] 4. Internationalize vocabulary component
  - Extract hardcoded text from vocabulary.component.html


  - Add translation keys to en.json under "vocabulary" namespace
  - Create Italian translations in it.json
  - Update template with Transloco pipes
  - Test placeholder content and button labels
  - _Requirements: 1.1, 1.2, 1.3, 5.2_



- [ ] 5. Internationalize scenario-catalog component
  - Extract hardcoded text from scenario-catalog.component.html
  - Add translation keys to en.json under "scenario_catalog" namespace
  - Create Italian translations in it.json
  - Update template with Transloco pipes
  - Test filter labels, empty states, and loading messages


  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.4, 4.5_

- [ ] 6. Internationalize scenario-history component
  - Extract hardcoded text from scenario-history.component.html
  - Add translation keys to en.json under "scenario_history" namespace
  - Create Italian translations in it.json


  - Update template with Transloco pipes
  - Test history labels and empty states
  - _Requirements: 1.1, 1.2, 1.3, 4.2, 4.4, 4.5_

- [ ] 7. Complete internationalization of scenario-selector component
  - Extract remaining hardcoded text from scenario-selector.component.html

  - Add missing translation keys to en.json under "scenario_selector" namespace
  - Create Italian translations in it.json
  - Update template with Transloco pipes
  - Test category names, instructions, and matching scenarios section
  - _Requirements: 1.1, 1.2, 1.3, 4.3, 4.4, 4.5_

- [x] 8. Internationalize cost-summary component

  - Extract hardcoded text from cost-summary.component.html
  - Add translation keys to en.json under "cost_summary" namespace
  - Create Italian translations in it.json
  - Update template with Transloco pipes
  - Test tab labels, metric labels, table headers, and error messages
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.4, 6.5_


- [ ] 9. Internationalize footer component
  - Extract hardcoded text from footer.component.html
  - Add translation keys to en.json under "footer" namespace
  - Create Italian translations in it.json
  - Update template with Transloco pipes
  - Test all section headings, links, and mission statement
  - _Requirements: 1.1, 1.2, 1.3, 8.1, 8.2, 8.3, 8.4, 8.5_



- [ ] 10. Internationalize intro component
  - Extract hardcoded text from intro.component.html
  - Add translation keys to en.json under "intro" namespace
  - Create Italian translations in it.json
  - Update template with Transloco pipes
  - Test all step titles and descriptions

  - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.3_

- [ ] 11. Internationalize welcome component
  - Extract hardcoded text from welcome.component.html
  - Add translation keys to en.json under "welcome" namespace
  - Create Italian translations in it.json

  - Update template with Transloco pipes
  - Test checkbox label and button text
  - _Requirements: 1.1, 1.2, 1.3, 7.2, 7.4, 7.5_

- [ ] 12. Internationalize exercise components
  - [x] 12.1 Internationalize exercises.component.html

    - Extract hardcoded text from exercises.component.html
    - Add translation keys to en.json under "exercises" namespace
    - Create Italian translations in it.json
    - Update template with Transloco pipes
    - _Requirements: 1.1, 1.2, 1.3_
  

  - [ ] 12.2 Internationalize fill-in-blank-exercise.component.html
    - Extract hardcoded text from fill-in-blank-exercise.component.html
    - Add translation keys to en.json under "exercises.fill_in_blank" namespace
    - Create Italian translations in it.json
    - Update template with Transloco pipes

    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 12.3 Internationalize matching-pairs-exercise.component.html
    - Extract hardcoded text from matching-pairs-exercise.component.html
    - Add translation keys to en.json under "exercises.matching_pairs" namespace
    - Create Italian translations in it.json
    - Update template with Transloco pipes

    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 12.4 Internationalize sentence-scramble-exercise.component.html
    - Extract hardcoded text from sentence-scramble-exercise.component.html
    - Add translation keys to en.json under "exercises.sentence_scramble" namespace
    - Create Italian translations in it.json
    - Update template with Transloco pipes


    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 12.5 Internationalize swipe-exercise.component.html
    - Extract hardcoded text from swipe-exercise.component.html
    - Add translation keys to en.json under "exercises.swipe" namespace
    - Create Italian translations in it.json
    - Update template with Transloco pipes
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 13. Internationalize flash-cards component
  - Extract hardcoded text from flash-cards.component.html
  - Add translation keys to en.json under "flash_cards" namespace
  - Create Italian translations in it.json
  - Update template with Transloco pipes
  - Test navigation labels and instructions
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 14. Internationalize progress-bar component
  - Extract hardcoded text from progress-bar.component.html
  - Add translation keys to en.json under "progress_bar" namespace
  - Create Italian translations in it.json
  - Update template with Transloco pipes
  - Test step labels in both languages
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 15. Verify and test all internationalized components
  - Test language switching across all components
  - Verify no hardcoded English text remains
  - Check UI layout with Italian text (longer strings)
  - Test dynamic content interpolation
  - Verify accessibility (aria-labels, screen readers)
  - Test empty states and error messages
  - Validate translation key consistency
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_
