# Implementation Plan

- [x] 1. Create Exercise Service and data models





  - Create `src/app/services/exercise.service.ts` with methods to fetch exercise data from GraphQL API
  - Create `src/app/models/exercise.models.ts` with TypeScript interfaces for all exercise types
  - Implement completion state management using signals
  - Implement GraphQL query integration for getExerciseForScenario
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Update Main Exercise View component





  - [x] 2.1 Update exercises.component.ts with exercise type buttons logic


    - Inject ExerciseService and SessionStore
    - Create signals for exercise types, scenario ID, and completion state
    - Implement methods to check exercise availability and completion
    - Implement navigation to individual exercise components
    - _Requirements: 1.1, 1.3, 1.4, 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 2.2 Update exercises.component.html with styled exercise buttons


    - Create responsive grid layout for exercise type buttons
    - Add button styling consistent with application design system (sky-500)
    - Add completion indicators (checkmarks) for completed exercises
    - Add loading state while checking availability
    - Add progress indicator showing completed/total exercises
    - _Requirements: 1.1, 1.2, 1.5, 8.1, 8.5, 9.1_

- [x] 3. Create Fill-in-the-Blank Exercise component




  - [x] 3.1 Generate fill-in-blank-exercise component


    - Create `src/app/components/exercises/fill-in-blank/fill-in-blank-exercise.component.ts`
    - Create `src/app/components/exercises/fill-in-blank/fill-in-blank-exercise.component.html`
    - Set up component as standalone with necessary imports
    - _Requirements: 3.1_
  

  - [x] 3.2 Implement fill-in-blank component logic










    - Fetch exercise data using ExerciseService on component init
    - Create signals for exercises, current index, selected option, and answer reveal state
    - Implement option selection handler
    - Implement answer checking logic with visual feedback
    - Implement navigation to next exercise
    - Implement back to main view navigation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1_

  -


  - [x] 3.3 Create fill-in-blank component template



    - Display sentence with blank space
    - Create option buttons grid with hover effects
    - Add visual feedback for correct/incorrect answers (green/red)
    - Add "Check Answer" and "Next" buttons
    - Add "Back to Exercises" button
    - Implement responsive layout for mobile/tablet/desktop
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 9.1, 9.4_

- [x] 4. Create Matching Pairs Exercise component




  - [x] 4.1 Generate matching-pairs-exercise component
    - Create `src/app/components/exercises/matching-pairs/matching-pairs-exercise.component.ts`
    - Create `src/app/components/exercises/matching-pairs/matching-pairs-exercise.component.html`
    - Set up component as standalone with necessary imports
    - _Requirements: 4.1_
  
  - [ ] 4.2 Implement matching-pairs component logic with click-based selection
    - Fetch exercise data using ExerciseService on component init
    - Create signals for source/target words, correct pairs, selected card, hearts, and completion states
    - Randomize target words order on initialization
    - Implement click handler for card selection
    - Implement match validation logic (check if selected cards form correct pair)
    - Implement heart removal on incorrect match
    - Implement card removal on correct match with order preservation
    - Implement retry functionality
    - Implement back to main view navigation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.2_
  
  - [ ] 4.3 Create matching-pairs component template with hearts display
    - Create two-column layout for source and target word cards
    - Add click event bindings to word cards
    - Add hearts display in top right corner (4 hearts)
    - Add visual feedback for selected cards
    - Add visual feedback for incorrect matches (brief animation)
    - Add success message when all pairs matched
    - Add failure message when hearts depleted
    - Add "Retry", "Finish", and "Back to Exercises" buttons
    - Implement responsive layout that stacks on mobile
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.2, 9.1_


- [ ] 5. Create Sentence Scramble Exercise component
  - [x] 5.1 Generate sentence-scramble-exercise component


    - Create `src/app/components/exercises/sentence-scramble/sentence-scramble-exercise.component.ts`
    - Create `src/app/components/exercises/sentence-scramble/sentence-scramble-exercise.component.html`
    - Set up component as standalone with necessary imports
    - _Requirements: 5.1_
  
  - [x] 5.2 Implement sentence-scramble component logic


    - Fetch exercise data using ExerciseService on component init
    - Create signals for exercises, current index, scrambled words, correct order, and answer reveal state
    - Implement drag-and-drop event handlers for word reordering
    - Implement touch event handlers for mobile support
    - Implement word order validation logic
    - Implement navigation to next exercise
    - Implement back to main view navigation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3, 9.2_
  
  - [x] 5.3 Create sentence-scramble component template


    - Display source language sentence as reference
    - Create draggable word chips with scrambled words
    - Add drop zone for word arrangement
    - Add visual feedback for correct/incorrect positions
    - Display correct sentence after validation
    - Add "Check Order", "Next", and "Finish" buttons
    - Add "Back to Exercises" button
    - Implement responsive layout with word wrapping
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3, 9.1, 9.2, 9.4_


- [ ] 6. Create Swipe Exercise component
  - [x] 6.1 Generate swipe-exercise component


    - Create `src/app/components/exercises/swipe/swipe-exercise.component.ts`
    - Create `src/app/components/exercises/swipe/swipe-exercise.component.html`
    - Set up component as standalone with necessary imports
    - _Requirements: 6.1_
  

  - [x] 6.2 Implement swipe component logic

    - Fetch exercise data using ExerciseService on component init
    - Create signals for cards, current index, user answers, summary state, and card transform
    - Implement touch event handlers (touchstart, touchmove, touchend)
    - Implement swipe gesture detection with threshold
    - Implement button click handlers for non-touch devices
    - Implement answer validation and immediate feedback
    - Implement summary calculation (correct/incorrect count)
    - Implement back to main view navigation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.4, 9.3_
  
  - [x] 6.3 Create swipe component template


    - Create swipe card with word and translation
    - Add swipe indicators (left/right)
    - Add button controls for non-touch devices
    - Add card animation with CSS transforms
    - Add immediate visual feedback (green/red overlay)
    - Display progress indicator (current/total)
    - Display summary with correct/incorrect count
    - Add "Back to Exercises" button
    - Implement responsive layout
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.4, 9.1, 9.3, 9.4_


- [x] 7. Implement routing and navigation

  - Update Angular routing configuration to add routes for each exercise component
  - Implement route parameters to pass scenario ID to exercise components
  - Implement navigation guards to prevent access without active scenario
  - Test navigation flow from main view to exercises and back

  - _Requirements: 1.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Implement error handling and edge cases
  - [x] 8.1 Add error handling in ExerciseService

    - Handle null/undefined exercise data
    - Handle network errors with retry logic
    - Handle malformed data with validation
    - Display user-friendly error messages
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  

  - [x] 8.2 Add error states in exercise components

    - Display error message when exercise fails to load
    - Provide "Back to Exercises" button on error
    - Handle missing exercise data gracefully
    - Prevent crashes from invalid data
    - _Requirements: 10.1, 10.2, 10.3, 10.5_


- [x] 9. Add animations and transitions

  - Implement fade-in animations for exercise components
  - Add button hover effects and transitions
  - Add card swipe animations with CSS transforms
  - Add drag-and-drop visual feedback (opacity, scale)
  - Add answer feedback animations (pulse, shake)
  - Ensure animations are smooth (60fps) using CSS transforms
  - _Requirements: 3.3, 4.4, 5.4, 6.4_


- [ ] 10. Implement responsive design
  - Test and adjust layouts for mobile (< 640px)
  - Test and adjust layouts for tablet (640px - 1024px)
  - Test and adjust layouts for desktop (> 1024px)
  - Ensure touch interactions work on mobile devices
  - Ensure button controls work on desktop
  - Test typography and spacing across screen sizes
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_




- [ ] 11. Add accessibility features
  - [ ] 11.1 Implement keyboard navigation
    - Add tab navigation for exercise buttons
    - Add Enter/Space for option selection
    - Add arrow keys for word reordering

    - Add Escape key to go back
    - _Requirements: 9.1_
  
  - [ ] 11.2 Add screen reader support
    - Add ARIA labels for all interactive elements
    - Add ARIA live regions for answer feedback

    - Add ARIA descriptions for drag-and-drop
    - Add ARIA progress indicators
    - _Requirements: 9.1_
  
  - [-] 11.3 Implement focus management

    - Focus first option after exercise loads
    - Focus "Next" button after answer reveal
    - Return focus to exercise button after completion
    - Ensure focus is visible with outline styles
    - _Requirements: 9.1_

- [x] 12. Wire up exercises component in conversation flow


  - Update ConversationViewComponent to pass scenario ID to ExercisesComponent
  - Ensure ExercisesComponent integrates with existing conversation step flow
  - Test "Next Step" button functionality from exercises
  - Verify exercises step appears in correct order in conversation flow
  - _Requirements: 1.3, 1.4_
