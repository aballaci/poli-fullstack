import { Component, EventEmitter, Output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ExerciseService } from '../../services/exercise.service';
import { SessionStore } from '../../state/session.store';
import { ExerciseType, ExerciseTypeInfo } from '../../models/exercise.models';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exercises.component.html',
})
export class ExercisesComponent implements OnInit {
  @Output() next = new EventEmitter<void>();

  private exerciseService = inject(ExerciseService);
  private sessionStore = inject(SessionStore);
  private router = inject(Router);

  // Exercise type definitions
  readonly exerciseTypes = signal<ExerciseTypeInfo[]>([
    {
      type: 'fillInBlank',
      displayName: 'Fill in the Blank',
      icon: '📝',
      description: 'Complete sentences by selecting the correct word'
    },
    {
      type: 'matchingPairs',
      displayName: 'Matching Pairs',
      icon: '🔗',
      description: 'Match source language sentences with translations'
    },
    {
      type: 'sentenceScramble',
      displayName: 'Sentence Scramble',
      icon: '🔀',
      description: 'Arrange words in the correct order'
    },
    {
      type: 'swipe',
      displayName: 'Swipe Cards',
      icon: '👆',
      description: 'Swipe right for correct translations, left for incorrect'
    }
  ]);

  // Scenario ID from session store
  readonly scenarioId = computed(() => this.sessionStore.activeScenario()?.id);

  // Loading state
  readonly isLoading = signal<boolean>(true);

  // Available exercises (exercises that have data)
  readonly availableExercises = signal<Set<ExerciseType>>(new Set());

  // Completed exercises count
  readonly completedCount = computed(() => this.exerciseService.getCompletionCount());

  // Total exercises count
  readonly totalCount = computed(() => this.exerciseTypes().length);

  ngOnInit(): void {
    this.checkExerciseAvailability();
  }

  /**
   * Check which exercises have data available for the current scenario
   */
  private checkExerciseAvailability(): void {
    const currentScenarioId = this.scenarioId();

    if (!currentScenarioId) {
      console.warn('No active scenario found');
      this.isLoading.set(false);
      return;
    }

    // Check availability for all exercise types
    const availabilityChecks = this.exerciseTypes().map(exerciseType =>
      this.exerciseService.getExercise(currentScenarioId, exerciseType.type).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(availabilityChecks).subscribe(results => {
      const available = new Set<ExerciseType>();

      results.forEach((data, index) => {
        if (data !== null) {
          available.add(this.exerciseTypes()[index].type);
        }
      });

      this.availableExercises.set(available);
      this.isLoading.set(false);
    });
  }

  /**
   * Check if an exercise is available (has data)
   */
  isExerciseAvailable(exerciseType: ExerciseType): boolean {
    return this.availableExercises().has(exerciseType);
  }

  /**
   * Check if an exercise is completed
   */
  isExerciseCompleted(exerciseType: ExerciseType): boolean {
    return this.exerciseService.isExerciseCompleted(exerciseType);
  }

  /**
   * Navigate to an individual exercise component
   */
  startExercise(exerciseType: ExerciseType): void {
    if (!this.isExerciseAvailable(exerciseType)) {
      return;
    }

    const currentScenarioId = this.scenarioId();
    if (!currentScenarioId) {
      console.error('No active scenario');
      return;
    }

    // Map exercise type to route path
    const routeMap: Record<ExerciseType, string> = {
      'fillInBlank': '/exercises/fill-in-blank',
      'matchingPairs': '/exercises/matching-pairs',
      'sentenceScramble': '/exercises/sentence-scramble',
      'swipe': '/exercises/swipe'
    };

    const route = routeMap[exerciseType];
    if (route) {
      this.router.navigate([route]);
    }
  }
}
