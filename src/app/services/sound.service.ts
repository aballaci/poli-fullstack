import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundService {
    private successSound: HTMLAudioElement;
    private failureSound: HTMLAudioElement;

    constructor() {
        this.successSound = new Audio('/assets/sounds/chime-success.mp3');
        this.failureSound = new Audio('/assets/sounds/chime-failure.mp3');

        // Preload sounds
        this.successSound.load();
        this.failureSound.load();
    }

    playSuccess(): void {
        this.successSound.currentTime = 0;
        this.successSound.play().catch(err => {
            console.warn('Failed to play success sound:', err);
        });
    }

    playFailure(): void {
        this.failureSound.currentTime = 0;
        this.failureSound.play().catch(err => {
            console.warn('Failed to play failure sound:', err);
        });
    }
}
