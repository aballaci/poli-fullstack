import { Injectable, signal, computed, effect } from '@angular/core';

// Breakpoint constants matching Tailwind's defaults
export const BREAKPOINTS = {
    MOBILE: 640,   // sm breakpoint
    TABLET: 768,   // md breakpoint
    DESKTOP: 1024  // lg breakpoint
} as const;

@Injectable({
    providedIn: 'root'
})
export class ViewportService {
    // Signal to track current viewport width
    readonly width = signal<number>(this.getViewportWidth());

    // Computed signals for responsive breakpoints
    readonly isMobile = computed(() => this.width() < BREAKPOINTS.MOBILE);
    readonly isTablet = computed(() =>
        this.width() >= BREAKPOINTS.MOBILE && this.width() < BREAKPOINTS.DESKTOP
    );
    readonly isDesktop = computed(() => this.width() >= BREAKPOINTS.DESKTOP);

    // Additional computed signals for specific breakpoints
    readonly isMobileOrTablet = computed(() => this.width() < BREAKPOINTS.DESKTOP);
    readonly isSmallMobile = computed(() => this.width() < 480);

    private resizeObserver: ResizeObserver | null = null;

    constructor() {
        this.initializeResizeObserver();

        // Also listen to window resize as fallback
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.handleResize.bind(this));
        }
    }

    /**
     * Initialize ResizeObserver to track viewport changes
     */
    private initializeResizeObserver(): void {
        if (typeof window === 'undefined' || !('ResizeObserver' in window)) {
            return;
        }

        this.resizeObserver = new ResizeObserver(() => {
            this.updateWidth();
        });

        // Observe the document body
        this.resizeObserver.observe(document.body);
    }

    /**
     * Handle window resize event
     */
    private handleResize(): void {
        this.updateWidth();
    }

    /**
     * Update the width signal with current viewport width
     */
    private updateWidth(): void {
        const newWidth = this.getViewportWidth();
        if (newWidth !== this.width()) {
            this.width.set(newWidth);
        }
    }

    /**
     * Get current viewport width
     */
    private getViewportWidth(): number {
        if (typeof window === 'undefined') {
            return BREAKPOINTS.DESKTOP; // Default for SSR
        }
        return window.innerWidth;
    }

    /**
     * Check if viewport matches a specific breakpoint
     */
    matchesBreakpoint(breakpoint: keyof typeof BREAKPOINTS): boolean {
        return this.width() >= BREAKPOINTS[breakpoint];
    }

    /**
     * Get the current breakpoint name
     */
    getCurrentBreakpoint(): 'mobile' | 'tablet' | 'desktop' {
        const w = this.width();
        if (w < BREAKPOINTS.MOBILE) return 'mobile';
        if (w < BREAKPOINTS.DESKTOP) return 'tablet';
        return 'desktop';
    }

    /**
     * Cleanup method
     */
    ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this.handleResize.bind(this));
        }
    }
}
