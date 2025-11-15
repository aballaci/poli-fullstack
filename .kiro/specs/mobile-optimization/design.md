# Design Document

## Overview

This design document outlines the technical approach for optimizing the Poli language learning application for mobile devices. The optimization addresses three primary areas: touch interaction improvements for drag-and-drop exercises, responsive header design with mobile-specific adaptations, and overall mobile UX enhancements. The solution leverages Angular's reactive patterns, CSS media queries, and touch event handling to create a seamless mobile experience without compromising desktop functionality.

## Architecture

### Component Structure

The mobile optimization will be implemented across multiple layers:

1. **Header Component Layer**: Responsive navigation with mobile menu drawer
2. **Exercise Component Layer**: Touch-aware drag-and-drop and swipe interactions
3. **Shared Service Layer**: Touch detection and gesture recognition utilities
4. **Styling Layer**: Responsive CSS with mobile-first breakpoints

### Key Design Decisions

- **Progressive Enhancement**: Desktop functionality remains unchanged; mobile enhancements are additive
- **Touch-First Interaction**: Implement touch event handlers alongside existing mouse events
- **Responsive Breakpoints**: Use Tailwind's standard breakpoints (sm: 640px, md: 768px)
- **No External Dependencies**: Utilize native browser APIs for touch handling
- **Signal-Based Reactivity**: Leverage Angular signals for responsive state management

## Components and Interfaces

### 1. Touch Service

A new shared service to handle touch gesture detection and differentiation.

```typescript
interface TouchGestureConfig {
  scrollThreshold: number;      // Pixels of vertical movement to trigger scroll
  dragHoldDelay: number;         // Milliseconds to hold before drag
  swipeThreshold: number;        // Pixels of horizontal movement for swipe
}

interface TouchGestureResult {
  type: 'scroll' | 'drag' | 'swipe' | 'tap';
  direction?: 'horizontal' | 'vertical';
  deltaX: number;
  deltaY: number;
}

class TouchService {
  detectGesture(
    startEvent: TouchEvent,
    moveEvent: TouchEvent,
    config: TouchGestureConfig
  ): TouchGestureResult;
  
  preventDefaultDrag(element: HTMLElement): void;
  enableTouchDrag(element: HTMLElement): void;
}
```

### 2. Header Component Updates

**Mobile Menu State Management**:
```typescript
interface HeaderMobileState {
  isMenuOpen: boolean;
  isMobileView: boolean;
}
```

**Template Structure**:
- Desktop navigation (hidden on mobile)
- Hamburger menu button (visible on mobile)
- Mobile drawer overlay with navigation links
- Responsive app name display
- Optimized control spacing

### 3. Exercise Component Enhancements

**Sentence Scramble Component**:
- Add touch event handlers (`touchstart`, `touchmove`, `touchend`)
- Implement gesture detection to differentiate scroll from drag
- Add visual feedback for touch interactions
- Prevent text selection during drag operations

**Swipe Exercise Component**:
- Already has touch support; optimize threshold values
- Improve touch responsiveness timing
- Add haptic feedback (if available)

**Matching Pairs Component**:
- Ensure tap targets meet minimum size requirements
- Add touch-specific visual feedback
- Optimize for single-column layout on mobile

### 4. Responsive Utilities

**Viewport Detection Service**:
```typescript
class ViewportService {
  isMobile: Signal<boolean>;
  isTablet: Signal<boolean>;
  isDesktop: Signal<boolean>;
  width: Signal<number>;
  
  constructor() {
    // Use ResizeObserver or window resize events
    // Update signals reactively
  }
}
```

## Data Models

### Touch Interaction State

```typescript
interface DragState {
  isDragging: boolean;
  draggedElement: HTMLElement | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  gestureType: 'pending' | 'scroll' | 'drag';
  holdTimer: number | null;
}
```

### Mobile Menu State

```typescript
interface MobileMenuState {
  isOpen: boolean;
  activeSection: string | null;
  animationState: 'opening' | 'open' | 'closing' | 'closed';
}
```

## Error Handling

### Touch Event Fallbacks

1. **Browser Compatibility**: Check for touch event support; fall back to mouse events
2. **Gesture Conflicts**: Prevent default browser gestures (pull-to-refresh, swipe navigation)
3. **Performance**: Throttle touch move events to prevent performance degradation

### Responsive Layout Issues

1. **Viewport Meta Tag**: Ensure proper viewport configuration in index.html
2. **Orientation Changes**: Handle device rotation gracefully
3. **Safe Areas**: Account for notches and system UI on modern devices

## Testing Strategy

### Unit Tests

1. **Touch Service**:
   - Test gesture detection logic
   - Verify threshold calculations
   - Test edge cases (rapid touches, multi-touch)

2. **Header Component**:
   - Test mobile menu open/close
   - Verify responsive text display
   - Test navigation link functionality

3. **Exercise Components**:
   - Test touch event handlers
   - Verify drag state management
   - Test gesture differentiation

### Integration Tests

1. **Touch Interactions**:
   - Test scroll vs. drag detection in sentence scramble
   - Verify swipe gesture accuracy
   - Test tap target sizes

2. **Responsive Behavior**:
   - Test layout at various viewport sizes
   - Verify breakpoint transitions
   - Test orientation changes

### Manual Testing Checklist

1. **Mobile Devices**:
   - Test on iOS Safari (iPhone)
   - Test on Chrome Android
   - Test on various screen sizes (small, medium, large phones)

2. **Tablet Devices**:
   - Test on iPad Safari
   - Test on Android tablets
   - Verify landscape and portrait modes

3. **Interaction Scenarios**:
   - Scroll through exercise pages without triggering drag
   - Complete sentence scramble exercise using touch
   - Navigate using mobile menu
   - Verify all touch targets are easily tappable

## Implementation Details

### CSS Responsive Patterns

```css
/* Mobile-first approach */
.header-title {
  /* Mobile: Show short name */
  content: "Poli";
}

@media (min-width: 640px) {
  .header-title {
    /* Desktop: Show full name */
    content: "Poli /ˈpɒ.lɪ.ɡlɒt/";
  }
}

/* Touch target sizing */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}

/* Prevent text selection during drag */
.draggable-element {
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
```

### Touch Event Handling Pattern

```typescript
// In sentence scramble component
onTouchStart(event: TouchEvent, word: string, from: string, index: number): void {
  this.touchState.set({
    startX: event.touches[0].clientX,
    startY: event.touches[0].clientY,
    startTime: Date.now(),
    element: event.target as HTMLElement,
    word,
    from,
    index
  });
  
  // Start hold timer for drag activation
  this.holdTimer = setTimeout(() => {
    this.enableDragMode();
  }, 200);
}

onTouchMove(event: TouchEvent): void {
  const state = this.touchState();
  const deltaX = Math.abs(event.touches[0].clientX - state.startX);
  const deltaY = Math.abs(event.touches[0].clientY - state.startY);
  
  // Detect scroll intent
  if (deltaY > 10 && deltaY > deltaX) {
    clearTimeout(this.holdTimer);
    this.disableDragMode();
    return; // Allow scroll
  }
  
  // Continue with drag if enabled
  if (this.dragMode()) {
    event.preventDefault();
    // Update drag position
  }
}

onTouchEnd(event: TouchEvent): void {
  clearTimeout(this.holdTimer);
  
  if (this.dragMode()) {
    // Complete drag operation
    this.handleDrop();
  }
  
  this.resetTouchState();
}
```

### Mobile Menu Implementation

```typescript
// In header component
toggleMobileMenu(): void {
  this.mobileMenuOpen.update(open => !open);
  
  if (this.mobileMenuOpen()) {
    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

closeMobileMenu(): void {
  this.mobileMenuOpen.set(false);
  document.body.style.overflow = '';
}

// Close menu when clicking outside
@HostListener('document:click', ['$event'])
handleClickOutside(event: Event): void {
  const target = event.target as HTMLElement;
  if (this.mobileMenuOpen() && !target.closest('.mobile-menu')) {
    this.closeMobileMenu();
  }
}
```

### Viewport Meta Tag Configuration

```html
<!-- Update in index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
```

This configuration:
- Sets initial scale to 1.0 (no zoom)
- Allows user scaling up to 5x for accessibility
- Prevents automatic zoom on input focus (iOS)
- Maintains readable text sizes

## Performance Considerations

### Touch Event Optimization

1. **Passive Event Listeners**: Use passive listeners for scroll performance
2. **Event Throttling**: Throttle `touchmove` events to 60fps
3. **GPU Acceleration**: Use CSS transforms for animations
4. **Debounce Resize**: Debounce viewport resize detection

### CSS Performance

1. **Hardware Acceleration**: Use `transform` and `opacity` for animations
2. **Minimize Reflows**: Batch DOM updates
3. **CSS Containment**: Use `contain` property for isolated components

## Accessibility Considerations

1. **Touch Target Sizes**: Minimum 44x44px per WCAG guidelines
2. **Keyboard Navigation**: Maintain keyboard accessibility on mobile browsers
3. **Screen Reader Support**: Ensure ARIA labels work with mobile screen readers
4. **Zoom Support**: Allow pinch-to-zoom for users with visual impairments
5. **Focus Indicators**: Visible focus states for keyboard/switch control users

## Browser Compatibility

### Supported Browsers

- iOS Safari 14+
- Chrome Android 90+
- Samsung Internet 14+
- Firefox Android 90+

### Feature Detection

```typescript
const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const hasPointerEvents = 'PointerEvent' in window;

// Use Pointer Events API if available (better for hybrid devices)
if (hasPointerEvents) {
  // Use pointerdown, pointermove, pointerup
} else if (hasTouchSupport) {
  // Use touchstart, touchmove, touchend
} else {
  // Fall back to mouse events
}
```

## Migration Strategy

### Phase 1: Foundation (Requirements 2, 4, 7)
- Update viewport meta tag
- Implement responsive header with mobile menu
- Add responsive app name display
- Optimize header control spacing

### Phase 2: Touch Interactions (Requirements 1, 5)
- Create TouchService
- Add touch event handlers to sentence scramble
- Implement gesture detection
- Add visual feedback for touch

### Phase 3: Exercise Optimization (Requirements 6)
- Update exercise component layouts for mobile
- Adjust spacing and sizing
- Optimize font sizes
- Test on various devices

### Phase 4: Polish and Testing
- Cross-browser testing
- Performance optimization
- Accessibility audit
- User acceptance testing
