# Design Document

## Overview

This feature implements interactive, visually compelling Angular components for language learning exercises. The system consists of a main exercise hub component that displays styled buttons for each exercise type, four specialized exercise components with drag-and-drop interactions, an Angular service for fetching exercise data from the GraphQL API, and navigation logic to move between exercises and back to the main view. The design follows Angular best practices with standalone components, signals for reactive state management, and Tailwind CSS for styling consistent with the existing application design system.

## Architecture

### High-Level Architecture

```
Main Exercise View (Hub)
    ↓
Exercise Service (GraphQL API)
    ↓
Individual Exercise Components
    ├── Fill-in-the-Blank
    ├── Matching Pairs
    ├── Sentence Scramble
    └── Swipe
    ↓
Answer Validation & Reveal
    ↓
Back to Main Exercise View
```

### Component Hierarchy

```
ConversationViewComponent
  └── ExercisesComponent (Main Hub)
      ├── FillInBlankExerciseComponent
      ├── MatchingPairsExerciseComponent
      ├── SentenceScrambleExerciseComponent
      └── SwipeExerciseComponent
```

## Components and Interfaces

### 1. Exercise Service

**Location**: `src/app/services/exercise.service.ts`

**Purpose**: Fetch exercise data from the GraphQL API and manage exercise completion state

**Methods**:
```typescript
class ExerciseService {
  // Fetch exercise data by scenario ID and type
  getExercise(scenarioId: string, exerciseType: ExerciseType): Observable<ExerciseData | null>
  
  // Mark exercise as completed
  markExerciseCompleted(exerciseType: ExerciseType): void
  
  // Check if exercise is completed
  isExerciseCompleted(exerciseType: ExerciseType): boolean
  
  // Get all completed exercises
  getCompletedExercises(): ExerciseType[]
  
  // Reset completion state (for new scenario)
  resetCompletionState(): void
}
```

**State Management**:
- Uses signals to track completed exercises
- Completion state persists during session but resets on new scenario
- Integrates with SessionStore for scenario ID

### 2. Main Exercise View Component

**Location**: `src/app/components/exercises/exercises.component.ts`

**Purpose**: Display exercise type buttons and navigate to individual exercises

**Template Structure**:
```html
<div class="exercise-hub">
  <h2>Choose an Exercise</h2>
  <div class="exercise-grid">
    <button *ngFor="let type of exerciseTypes" 
            (click)="startExercise(type)"
            [disabled]="!isExerciseAvailable(type)"
            [class.completed]="isExerciseCompleted(type)">
      <icon [type]="type"></icon>
      <span>{{ type.displayName }}</span>
      <checkmark *ngIf="isExerciseCompleted(type)"></checkmark>
    </button>
  </div>
  <progress-indicator [completed]="completedCount" [total]="totalCount"></progress-indicator>
</div>
```

**State**:
```typescript
exerciseTypes = signal<ExerciseTypeInfo[]>([...])
scenarioId = computed(() => this.store.activeScenario()?.id)
completedExercises = this.exerciseService.getCompletedExercises
availableExercises = signal<ExerciseType[]>([])
```

**Styling**: Uses Tailwind CSS with sky-500 primary color, responsive grid layout, hover effects

### 3. Fill-in-the-Blank Exercise Component

**Location**: `src/app/components/exercises/fill-in-blank/fill-in-blank-exercise.component.ts`

**Purpose**: Display sentences with blanks and multiple choice options

**Template Structure**:
```html
<div class="exercise-container">
  <header>
    <h3>Fill in the Blank</h3>
    <button (click)="goBack()">Back to Exercises</button>
  </header>
  
  <div class="exercise-content">
    <div class="sentence-display">
      <p>{{ sentenceWithBlank }}</p>
    </div>
    
    <div class="options-grid">
      <button *ngFor="let option of currentOptions"
              (click)="selectOption(option)"
              [class.selected]="selectedOption === option"
              [class.correct]="showAnswer && option === correctAnswer"
              [class.incorrect]="showAnswer && selectedOption === option && option !== correctAnswer"
              [disabled]="showAnswer">
        {{ option }}
      </button>
    </div>
  </div>
  
  <footer>
    <button *ngIf="!showAnswer" (click)="checkAnswer()" [disabled]="!selectedOption">
      Check Answer
    </button>
    <button *ngIf="showAnswer && !isLastExercise" (click)="nextExercise()">
      Next
    </button>
    <button *ngIf="showAnswer && isLastExercise" (click)="finish()">
      Finish
    </button>
  </footer>
</div>
```

**State**:
```typescript
exercises = signal<FillInBlankExercise[]>([])
currentIndex = signal(0)
selectedOption = signal<string | null>(null)
showAnswer = signal(false)
```

**Interaction Flow**:
1. Display sentence with blank
2. User selects option
3. User clicks "Check Answer"
4. Show visual feedback (green for correct, red for incorrect)
5. Reveal correct answer
6. User proceeds to next or finishes

### 4. Matching Pairs Exercise Component

**Location**: `src/app/components/exercises/matching-pairs/matching-pairs-exercise.component.ts`

**Purpose**: Drag-and-drop matching of source and target language sentences

**Template Structure**:
```html
<div class="exercise-container">
  <header>
    <h3>Match the Pairs</h3>
    <button (click)="goBack()">Back to Exercises</button>
  </header>
  
  <div class="matching-grid">
    <div class="source-column">
      <div *ngFor="let source of sourceSentences"
           [attr.data-id]="source.id"
           class="sentence-card"
           [class.matched]="isMatched(source.id)">
        {{ source.text }}
      </div>
    </div>
    
    <div class="target-column">
      <div *ngFor="let target of targetSentences"
           [attr.data-id]="target.id"
           class="sentence-card draggable"
           draggable="true"
           (dragstart)="onDragStart($event, target.id)"
           (drop)="onDrop($event, target.id)"
           (dragover)="onDragOver($event)"
           [class.matched]="isMatched(target.id)"
           [class.correct]="showAnswer && isCorrectMatch(target.id)"
           [class.incorrect]="showAnswer && !isCorrectMatch(target.id)">
        {{ target.text }}
      </div>
    </div>
  </div>
  
  <footer>
    <button *ngIf="!showAnswer" (click)="checkMatches()" [disabled]="!allMatched()">
      Check Matches
    </button>
    <button *ngIf="showAnswer" (click)="finish()">
      Finish
    </button>
  </footer>
</div>
```

**State**:
```typescript
sourceSentences = signal<SentenceItem[]>([])
targetSentences = signal<SentenceItem[]>([])
userMatches = signal<Map<string, string>>(new Map())
correctPairs = signal<Map<string, string>>(new Map())
showAnswer = signal(false)
draggedItemId = signal<string | null>(null)
```

**Drag-and-Drop Logic**:
- Use HTML5 Drag and Drop API
- Support touch events for mobile (using touch event polyfill)
- Visual feedback during drag (opacity, cursor)
- Connect lines between matched pairs
- Validate all matches on submit

### 5. Sentence Scramble Exercise Component

**Location**: `src/app/components/exercises/sentence-scramble/sentence-scramble-exercise.component.ts`

**Purpose**: Drag-and-drop word ordering to form correct sentences

**Template Structure**:
```html
<div class="exercise-container">
  <header>
    <h3>Unscramble the Sentence</h3>
    <button (click)="goBack()">Back to Exercises</button>
  </header>
  
  <div class="exercise-content">
    <div class="reference-sentence">
      <p class="label">{{ sourceLanguage }}:</p>
      <p class="text">{{ sourceText }}</p>
    </div>
    
    <div class="scrambled-words">
      <div *ngFor="let word of scrambledWords; let i = index"
           class="word-chip draggable"
           draggable="true"
           (dragstart)="onDragStart($event, i)"
           (drop)="onDrop($event, i)"
           (dragover)="onDragOver($event)"
           [class.correct]="showAnswer && isCorrectPosition(i)"
           [class.incorrect]="showAnswer && !isCorrectPosition(i)">
        {{ word }}
      </div>
    </div>
    
    <div class="answer-zone" *ngIf="showAnswer">
      <p class="label">Correct order:</p>
      <p class="text">{{ correctSentence }}</p>
    </div>
  </div>
  
  <footer>
    <button *ngIf="!showAnswer" (click)="checkOrder()">
      Check Order
    </button>
    <button *ngIf="showAnswer && !isLastExercise" (click)="nextExercise()">
      Next
    </button>
    <button *ngIf="showAnswer && isLastExercise" (click)="finish()">
      Finish
    </button>
  </footer>
</div>
```

**State**:
```typescript
exercises = signal<SentenceScrambleExercise[]>([])
currentIndex = signal(0)
scrambledWords = signal<string[]>([])
correctOrder = signal<number[]>([])
showAnswer = signal(false)
```

**Drag-and-Drop Logic**:
- Reorder words by dragging
- Swap positions on drop
- Visual feedback for correct/incorrect positions
- Support touch gestures on mobile

### 6. Swipe Exercise Component

**Location**: `src/app/components/exercises/swipe/swipe-exercise.component.ts`

**Purpose**: Swipe-based rapid review of translations

**Template Structure**:
```html
<div class="exercise-container">
  <header>
    <h3>Swipe to Review</h3>
    <button (click)="goBack()">Back to Exercises</button>
  </header>
  
  <div class="swipe-area">
    <div *ngIf="currentCard()" 
         class="swipe-card"
         (touchstart)="onTouchStart($event)"
         (touchmove)="onTouchMove($event)"
         (touchend)="onTouchEnd($event)"
         [style.transform]="cardTransform()">
      <div class="card-content">
        <p class="word">{{ currentCard().word }}</p>
        <p class="translation">{{ currentCard().translation }}</p>
      </div>
    </div>
    
    <div class="swipe-indicators">
      <div class="indicator left">
        <i class="fa-solid fa-times"></i>
        <span>Incorrect</span>
      </div>
      <div class="indicator right">
        <i class="fa-solid fa-check"></i>
        <span>Correct</span>
      </div>
    </div>
  </div>
  
  <div class="button-controls">
    <button (click)="swipeLeft()" class="swipe-btn incorrect">
      <i class="fa-solid fa-times"></i>
    </button>
    <button (click)="swipeRight()" class="swipe-btn correct">
      <i class="fa-solid fa-check"></i>
    </button>
  </div>
  
  <div class="progress">
    {{ currentCardIndex() + 1 }} / {{ totalCards() }}
  </div>
  
  <div *ngIf="showSummary()" class="summary">
    <h4>Results</h4>
    <p>Correct: {{ correctCount() }} / {{ totalCards() }}</p>
    <button (click)="finish()">Finish</button>
  </div>
</div>
```

**State**:
```typescript
cards = signal<SwipeCard[]>([])
currentCardIndex = signal(0)
userAnswers = signal<boolean[]>([])
showSummary = signal(false)
cardTransform = signal('translate(0, 0)')
swipeThreshold = 100 // pixels
```

**Swipe Logic**:
- Track touch/mouse position
- Calculate swipe distance and direction
- Animate card movement
- Trigger answer on threshold
- Show immediate feedback (green/red overlay)
- Auto-advance to next card

## Data Models

### Exercise Type Enum
```typescript
export type ExerciseType = 'fillInBlank' | 'matchingPairs' | 'sentenceScramble' | 'swipe';

export interface ExerciseTypeInfo {
  type: ExerciseType;
  displayName: string;
  icon: string;
  description: string;
}
```

### Fill-in-the-Blank Models
```typescript
export interface FillInBlankExercise {
  sentenceId: string;
  sentenceWithBlank: string;
  blankPosition: number;
  correctAnswer: string;
  options: string[];
  targetLanguage: string;
}

export interface FillInBlankExercises {
  exercises: FillInBlankExercise[];
}
```

### Matching Pairs Models
```typescript
export interface SentenceItem {
  id: string;
  text: string;
}

export interface MatchingPairsExercise {
  sourceSentences: SentenceItem[];
  targetSentences: SentenceItem[];
  correctPairs: Array<{ sourceId: string; targetId: string }>;
}
```

### Sentence Scramble Models
```typescript
export interface SentenceScrambleExercise {
  sentenceId: string;
  sourceText: string;
  scrambledWords: string[];
  correctOrder: number[];
  targetLanguage: string;
}

export interface SentenceScrambleExercises {
  exercises: SentenceScrambleExercise[];
}
```

### Swipe Models
```typescript
export interface SwipeCard {
  id: string;
  word: string;
  translation: string;
  isCorrect: boolean;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface SwipeExercise {
  cards: SwipeCard[];
}
```

## Styling and Visual Design

### Design System Integration

**Color Palette** (from tailwind.config.js):
- Primary: sky-500 (#0EA5E9)
- Success: emerald-500 (#10B981)
- Error: coral-500 (#FF6B6B)
- Neutral: slate-200/700

**Button Styles**:
```css
.exercise-button {
  @apply px-6 py-3 font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors;
}

.exercise-button-secondary {
  @apply px-4 py-2 font-semibold rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors;
}
```

**Card Styles**:
```css
.exercise-card {
  @apply rounded-xl shadow-lg border border-[var(--c-border-subtle)] bg-[var(--c-bg-surface)] p-6;
}
```

### Responsive Design

**Breakpoints**:
- Mobile: < 640px (sm)
- Tablet: 640px - 1024px (md)
- Desktop: > 1024px (lg)

**Grid Layouts**:
- Exercise buttons: 1 column (mobile), 2 columns (tablet), 4 columns (desktop)
- Matching pairs: Stack vertically (mobile), side-by-side (tablet+)
- Sentence scramble: Wrap words (mobile), grid (desktop)

### Animations

**Transitions**:
- Fade in: 300ms ease-in-out
- Slide in: 400ms ease-out
- Card swipe: 200ms ease-in-out
- Button hover: 150ms ease

**Feedback Animations**:
- Correct answer: Green pulse + checkmark
- Incorrect answer: Red shake + X icon
- Card swipe: Rotate + translate
- Drag: Opacity 0.7 + scale 1.05

## Error Handling

### Missing Exercise Data

**Scenario**: Exercise data is null or undefined for a scenario

**Handling**:
1. Exercise Service returns null
2. Main Exercise View disables/hides button
3. Display message: "This exercise is not available yet"
4. Log error to console for debugging

### Network Errors

**Scenario**: GraphQL query fails

**Handling**:
1. Show error toast notification
2. Provide retry button
3. Allow navigation back to main view
4. Log error details

### Malformed Data

**Scenario**: Exercise data structure is invalid

**Handling**:
1. Validate data structure in service
2. Return null if invalid
3. Log validation error
4. Display user-friendly message

## Testing Strategy

### Unit Tests

**Exercise Service**:
- Test GraphQL query execution
- Test completion state management
- Test null handling
- Test data parsing

**Components**:
- Test button click handlers
- Test state updates
- Test answer validation logic
- Test navigation

### Integration Tests

**End-to-End Flow**:
- Navigate from main view to exercise
- Complete exercise
- Verify answer reveal
- Navigate back to main view
- Verify completion indicator

**Drag-and-Drop**:
- Simulate drag events
- Verify reordering logic
- Test touch event handling

### Accessibility Tests

- Keyboard navigation
- Screen reader compatibility
- Focus management
- ARIA labels

## Performance Considerations

### Lazy Loading

Load exercise components only when needed using Angular's lazy loading:
```typescript
const routes: Routes = [
  {
    path: 'exercises',
    loadComponent: () => import('./exercises.component').then(m => m.ExercisesComponent)
  }
];
```

### Data Caching

Cache exercise data in service to avoid redundant API calls:
```typescript
private exerciseCache = new Map<string, ExerciseData>();
```

### Animation Performance

Use CSS transforms (translate, scale) instead of position properties for smooth 60fps animations.

## Accessibility

### Keyboard Navigation

- Tab through exercise buttons
- Enter/Space to select options
- Arrow keys for word reordering
- Escape to go back

### Screen Reader Support

- ARIA labels for all interactive elements
- Announce answer feedback
- Describe drag-and-drop interactions
- Progress indicators

### Focus Management

- Focus first option after exercise loads
- Focus "Next" button after answer reveal
- Return focus to exercise button after completion

## Security Considerations

1. **Input Validation**: Validate all exercise data from API
2. **XSS Prevention**: Sanitize user-generated content (if any)
3. **Authentication**: Ensure GraphQL queries require auth
4. **Data Integrity**: Verify exercise data structure before rendering

## Deployment Strategy

1. **Phase 1**: Implement Exercise Service and Main Exercise View
2. **Phase 2**: Implement Fill-in-the-Blank component
3. **Phase 3**: Implement Matching Pairs component
4. **Phase 4**: Implement Sentence Scramble component
5. **Phase 5**: Implement Swipe component
6. **Phase 6**: Polish animations and responsive design
7. **Phase 7**: Accessibility audit and fixes

## Monitoring and Observability

### Metrics to Track

- Exercise completion rates by type
- Average time per exercise
- Error rates (missing data, network failures)
- User interaction patterns (swipe vs button)

### Analytics Events

- Exercise started
- Exercise completed
- Answer submitted (correct/incorrect)
- Navigation back to main view
- Error encountered

### Logging

- Log exercise data fetch
- Log validation errors
- Log user interactions (for debugging)
- Use structured logging format
