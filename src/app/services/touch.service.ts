import { Injectable } from '@angular/core';

export interface TouchGestureConfig {
    scrollThreshold: number;      // Pixels of vertical movement to trigger scroll
    dragHoldDelay: number;         // Milliseconds to hold before drag
    swipeThreshold: number;        // Pixels of horizontal movement for swipe
}

export interface TouchGestureResult {
    type: 'scroll' | 'drag' | 'swipe' | 'tap';
    direction?: 'horizontal' | 'vertical';
    deltaX: number;
    deltaY: number;
}

@Injectable({
    providedIn: 'root'
})
export class TouchService {
    private readonly defaultConfig: TouchGestureConfig = {
        scrollThreshold: 10,
        dragHoldDelay: 200,
        swipeThreshold: 100
    };

    /**
     * Detect the type of gesture based on touch events
     */
    detectGesture(
        startX: number,
        startY: number,
        currentX: number,
        currentY: number,
        config: Partial<TouchGestureConfig> = {}
    ): TouchGestureResult {
        const finalConfig = { ...this.defaultConfig, ...config };

        const deltaX = currentX - startX;
        const deltaY = currentY - startY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Determine if movement is primarily vertical or horizontal
        const isVertical = absDeltaY > absDeltaX;
        const isHorizontal = absDeltaX > absDeltaY;

        // Check for scroll gesture (vertical movement exceeds threshold)
        if (isVertical && absDeltaY > finalConfig.scrollThreshold) {
            return {
                type: 'scroll',
                direction: 'vertical',
                deltaX,
                deltaY
            };
        }

        // Check for swipe gesture (horizontal movement exceeds threshold)
        if (isHorizontal && absDeltaX > finalConfig.swipeThreshold) {
            return {
                type: 'swipe',
                direction: 'horizontal',
                deltaX,
                deltaY
            };
        }

        // Check for drag gesture (movement but not scroll or swipe)
        if (absDeltaX > 5 || absDeltaY > 5) {
            return {
                type: 'drag',
                direction: isHorizontal ? 'horizontal' : 'vertical',
                deltaX,
                deltaY
            };
        }

        // Default to tap if minimal movement
        return {
            type: 'tap',
            deltaX,
            deltaY
        };
    }

    /**
     * Prevent default drag behavior on an element
     */
    preventDefaultDrag(element: HTMLElement): void {
        element.style.userSelect = 'none';
        element.style.webkitUserSelect = 'none';
        element.style.touchAction = 'none';

        // Prevent default drag events
        element.addEventListener('dragstart', (e) => e.preventDefault());
    }

    /**
     * Enable touch drag on an element
     */
    enableTouchDrag(element: HTMLElement): void {
        element.style.cursor = 'grab';
        element.style.touchAction = 'none';

        element.addEventListener('touchstart', () => {
            element.style.cursor = 'grabbing';
        });

        element.addEventListener('touchend', () => {
            element.style.cursor = 'grab';
        });
    }

    /**
     * Check if the device supports touch
     */
    hasTouchSupport(): boolean {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Check if the device supports pointer events
     */
    hasPointerEvents(): boolean {
        return 'PointerEvent' in window;
    }
}
