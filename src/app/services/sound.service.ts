import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class SoundService {
    private successSound: HTMLAudioElement | null = null;
    private failureSound: HTMLAudioElement | null = null;
    private isBrowser: boolean;
    private audioContext: AudioContext | null = null;
    private isEnabled = true;

    constructor() {
        const platformId = inject(PLATFORM_ID);
        this.isBrowser = isPlatformBrowser(platformId);

        if (this.isBrowser) {
            this.initializeSounds();
        }
    }

    private initializeSounds(): void {
        try {
            // Create audio elements with proper paths for deployment
            this.successSound = new Audio();
            this.failureSound = new Audio();

            // Set sources - use relative paths that work in both dev and production
            this.successSound.src = 'assets/sounds/chime-success.mp3';
            this.failureSound.src = 'assets/sounds/chime-failure.mp3';

            // Set attributes for better mobile support
            this.successSound.preload = 'auto';
            this.failureSound.preload = 'auto';

            // Set volume to reasonable level
            this.successSound.volume = 0.5;
            this.failureSound.volume = 0.5;

            // Preload sounds
            this.successSound.load();
            this.failureSound.load();

            // Initialize AudioContext on first user interaction (helps with autoplay policies)
            if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
                const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                this.audioContext = new AudioContextClass();
            }
        } catch (err) {
            console.warn('Failed to initialize sounds:', err);
            this.isEnabled = false;
        }
    }

    private async ensureAudioContextResumed(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (err) {
                console.warn('Failed to resume audio context:', err);
            }
        }
    }

    async playSuccess(): Promise<void> {
        if (!this.isBrowser || !this.isEnabled || !this.successSound) {
            return;
        }

        try {
            await this.ensureAudioContextResumed();
            this.successSound.currentTime = 0;
            await this.successSound.play();
        } catch (err) {
            // Silently fail on autoplay restrictions
            if ((err as Error).name !== 'NotAllowedError') {
                console.warn('Failed to play success sound:', err);
            }
        }
    }

    async playFailure(): Promise<void> {
        if (!this.isBrowser || !this.isEnabled || !this.failureSound) {
            return;
        }

        try {
            await this.ensureAudioContextResumed();
            this.failureSound.currentTime = 0;
            await this.failureSound.play();
        } catch (err) {
            // Silently fail on autoplay restrictions
            if ((err as Error).name !== 'NotAllowedError') {
                console.warn('Failed to play failure sound:', err);
            }
        }
    }

    // Method to enable sounds after user interaction (helps with autoplay policies)
    enableSounds(): void {
        this.isEnabled = true;
        if (this.isBrowser && this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(err => {
                console.warn('Failed to resume audio context:', err);
            });
        }
    }

    disableSounds(): void {
        this.isEnabled = false;
    }
}
