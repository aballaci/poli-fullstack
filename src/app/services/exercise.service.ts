import { Injectable, inject, signal, computed } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError, retry, switchMap } from 'rxjs/operators';
import {
    ExerciseType,
    ExerciseData,
    FillInBlankExercises,
    MatchingPairsExercise,
    SentenceScrambleExercises,
    SwipeExercise
} from '../models/exercise.models';
import { SessionStore } from '../state/session.store';
import { OfflineStorageService } from './offline-storage.service';

@Injectable({
    providedIn: 'root'
})
export class ExerciseService {
    private client = generateClient<Schema>();
    private sessionStore = inject(SessionStore);
    private offlineService = inject(OfflineStorageService);

    // Track completed exercises using signals
    private completedExercisesSignal = signal<Set<ExerciseType>>(new Set());

    // Computed signal for easy access
    readonly completedExercises = computed(() =>
        Array.from(this.completedExercisesSignal())
    );

    /**
     * Fetch exercise data by scenario ID and exercise type
     */
    getExercise(scenarioId: string, exerciseType: ExerciseType): Observable<ExerciseData | null> {
        // Check if offline first
        if (this.offlineService.isOffline()) {
            console.warn(`[ExerciseService] ⚠ Operating in offline mode - retrieving exercise from cache: ${scenarioId} - ${exerciseType}`);
            return from(this.offlineService.getCachedExercise(scenarioId, exerciseType));
        }

        // Try cache first even when online
        return from(this.offlineService.getCachedExercise(scenarioId, exerciseType)).pipe(
            switchMap(cachedData => {
                if (cachedData) {
                    return of(cachedData);
                }

                // Fetch from server if not cached
                return from(
                    this.client.queries.getExerciseForScenario({
                        scenarioId,
                        exerciseType
                    })
                ).pipe(
                    map(response => {
                        if (!response.data) {
                            console.warn(`No exercise data found for scenario ${scenarioId} and type ${exerciseType}`);
                            return null;
                        }

                        // Parse the JSON response
                        const exerciseData = this.parseExerciseData(response.data, exerciseType);

                        // Cache the exercise data for offline use
                        if (exerciseData) {
                            this.offlineService.cacheExercise(scenarioId, exerciseType, exerciseData).catch(err => {
                                console.warn('Failed to cache exercise:', err);
                            });
                        }

                        return exerciseData;
                    }),
                    retry({
                        count: 2,
                        delay: 1000
                    }),
                    catchError(error => {
                        console.error(`Error fetching exercise for scenario ${scenarioId}:`, error);
                        return of(null);
                    })
                );
            })
        );
    }

    /**
     * Parse exercise data from JSON response
     */
    private parseExerciseData(data: any, exerciseType: ExerciseType): ExerciseData | null {
        try {
            // The data is already parsed JSON from the GraphQL response
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

            // Validate the structure based on exercise type
            switch (exerciseType) {
                case 'fillInBlank':
                    return this.validateFillInBlankExercises(parsedData) ? parsedData : null;
                case 'matchingPairs':
                    return this.validateMatchingPairsExercise(parsedData) ? parsedData : null;
                case 'sentenceScramble':
                    return this.validateSentenceScrambleExercises(parsedData) ? parsedData : null;
                case 'swipe':
                    return this.validateSwipeExercise(parsedData) ? parsedData : null;
                default:
                    console.error(`Unknown exercise type: ${exerciseType}`);
                    return null;
            }
        } catch (error) {
            console.error(`Error parsing exercise data for type ${exerciseType}:`, error);
            return null;
        }
    }

    /**
     * Validate fill-in-blank exercises structure
     */
    private validateFillInBlankExercises(data: any): data is FillInBlankExercises {
        return (
            data &&
            Array.isArray(data.exercises) &&
            data.exercises.every((ex: any) =>
                typeof ex.sentenceId === 'string' &&
                typeof ex.sentenceWithBlank === 'string' &&
                typeof ex.correctAnswer === 'string' &&
                Array.isArray(ex.options)
            )
        );
    }

    /**
     * Validate matching pairs exercise structure
     */
    private validateMatchingPairsExercise(data: any): data is MatchingPairsExercise {
        return (
            data &&
            Array.isArray(data.sourceWords) &&
            Array.isArray(data.targetWords) &&
            Array.isArray(data.correctPairs) &&
            data.sourceWords.every((s: any) => typeof s.id === 'string' && typeof s.word === 'string') &&
            data.targetWords.every((t: any) => typeof t.id === 'string' && typeof t.word === 'string')
        );
    }

    /**
     * Validate sentence scramble exercises structure
     */
    private validateSentenceScrambleExercises(data: any): data is SentenceScrambleExercises {
        return (
            data &&
            Array.isArray(data.exercises) &&
            data.exercises.every((ex: any) =>
                typeof ex.sentenceId === 'string' &&
                typeof ex.sourceText === 'string' &&
                Array.isArray(ex.scrambledWords) &&
                Array.isArray(ex.correctOrder)
            )
        );
    }

    /**
     * Validate swipe exercise structure
     */
    private validateSwipeExercise(data: any): data is SwipeExercise {
        return (
            data &&
            Array.isArray(data.cards) &&
            data.cards.every((card: any) =>
                typeof card.id === 'string' &&
                typeof card.word === 'string' &&
                typeof card.translation === 'string' &&
                typeof card.isCorrect === 'boolean'
            )
        );
    }

    /**
     * Mark an exercise as completed
     */
    markExerciseCompleted(exerciseType: ExerciseType): void {
        this.completedExercisesSignal.update(completed => {
            const newSet = new Set(completed);
            newSet.add(exerciseType);
            return newSet;
        });
    }

    /**
     * Check if an exercise is completed
     */
    isExerciseCompleted(exerciseType: ExerciseType): boolean {
        return this.completedExercisesSignal().has(exerciseType);
    }

    /**
     * Get all completed exercises
     */
    getCompletedExercises(): ExerciseType[] {
        return Array.from(this.completedExercisesSignal());
    }

    /**
     * Reset completion state (for new scenario)
     */
    resetCompletionState(): void {
        this.completedExercisesSignal.set(new Set());
    }

    /**
     * Get completion count
     */
    getCompletionCount(): number {
        return this.completedExercisesSignal().size;
    }
}
