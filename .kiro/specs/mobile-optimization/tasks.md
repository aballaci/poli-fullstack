# Implementation Plan

- [x] 1. Update viewport configuration and create touch service foundation


  - Update viewport meta tag in `src/index.html` to prevent double-tap zoom while allowing pinch-to-zoom
  - Create `src/app/services/touch.service.ts` with gesture detection logic
  - Implement `detectGesture()` method to differentiate between scroll, drag, swipe, and tap gestures
  - Add configuration interface for thresholds (scrollThreshold: 10px, dragHoldDelay: 200ms, swipeThreshold: 100px)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 7.4_

- [x] 2. Create viewport detection service for responsive behavior


  - Create `src/app/services/viewport.service.ts` with reactive viewport size detection
  - Implement signals for `isMobile()`, `isTablet()`, and `isDesktop()` based on breakpoints
  - Use ResizeObserver to track viewport width changes
  - Export breakpoint constants (MOBILE: 640px, TABLET: 768px, DESKTOP: 1024px)
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.2_

- [x] 3. Implement responsive header with mobile menu
  - [x] 3.1 Add mobile menu state management to header component


    - Add signals for `mobileMenuOpen()` and `isMobileView()` in `src/app/components/header/header.component.ts`
    - Inject ViewportService to detect mobile viewport
    - Implement `toggleMobileMenu()`, `closeMobileMenu()` methods
    - Add click-outside handler to close menu when clicking overlay
    - _Requirements: 3.2, 3.3, 3.5_

  - [x] 3.2 Create mobile menu UI in header template

    - Add hamburger menu button (visible only on mobile) in `src/app/components/header/header.component.html`
    - Create mobile navigation drawer with slide-in animation
    - Add overlay backdrop that closes menu on click
    - Include all navigation links (Home, Languages, Features, Pricing, About) in drawer
    - Add close button inside drawer
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [x] 3.3 Implement responsive app name display
    - Update header template to conditionally display "Poli" on mobile (< 640px)
    - Display full "Poli /ˈpɒ.lɪ.ɡlɒt/" on desktop (>= 640px)
    - Use Tailwind responsive classes or Angular conditional rendering
    - Adjust logo size to 32px on mobile devices
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Optimize header controls for mobile
    - Ensure all interactive elements have minimum 44x44px touch targets
    - Hide "Learning:" label text on mobile, show only language name
    - Adjust spacing between controls to minimum 8px on mobile
    - Stack or reduce spacing for language selector and theme toggle on small screens
    - Update button padding and sizing for touch-friendly interaction
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.5 Add mobile menu styles
    - Create mobile menu animations (slide-in from right/left) in `src/app/components/header/header.component.css`
    - Style overlay backdrop with semi-transparent background
    - Add transitions for smooth open/close animations
    - Prevent body scroll when menu is open
    - Ensure menu is accessible and properly layered (z-index)
    - _Requirements: 3.3, 3.5_

- [x] 4. Add touch support to sentence scramble exercise
  - [x] 4.1 Implement touch event handlers
    - Add `onTouchStart()`, `onTouchMove()`, `onTouchEnd()` methods to `src/app/components/exercises/sentence-scramble/sentence-scramble-exercise.component.ts`
    - Create touch state signal to track touch position, timing, and dragged element
    - Inject TouchService for gesture detection
    - Add hold timer (200ms) to activate drag mode
    - _Requirements: 1.4, 5.1, 5.3_

  - [x] 4.2 Implement scroll vs drag detection
    - In `onTouchMove()`, calculate deltaX and deltaY from touch start position
    - If vertical movement exceeds 10px before horizontal movement, treat as scroll
    - Clear hold timer and disable drag mode when scroll is detected
    - Allow native scroll behavior when scroll intent is detected
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.3 Add touch drag functionality
    - When hold timer completes and no scroll detected, enable drag mode
    - Prevent default touch behavior during drag operations
    - Update visual position of dragged element during touch move
    - Handle drop on touch end by detecting target drop zone
    - Maintain compatibility with existing mouse drag functionality
    - _Requirements: 1.4, 5.1, 5.2_

  - [x] 4.4 Add touch-specific visual feedback and styles
    - Add CSS to prevent text selection during drag in `src/app/components/exercises/sentence-scramble/sentence-scramble-exercise.component.html`
    - Add `user-select: none` and `touch-action: none` to draggable elements
    - Implement visual feedback (scale, shadow) when touch activates drag mode
    - Add active state styling for touched elements
    - _Requirements: 5.3, 5.5_

  - [x] 4.5 Optimize layout for mobile screens
    - Update template to use single-column layout for word bank and target area on mobile (< 640px)
    - Increase padding on draggable word elements to minimum 12px on mobile
    - Set minimum font size to 16px for all text on mobile
    - Reduce horizontal margins to 16px on mobile viewports
    - Ensure adequate spacing between draggable elements (minimum 12px gap)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Optimize swipe exercise for mobile
  - [x] 5.1 Improve touch responsiveness
    - Review and optimize swipe threshold value in `src/app/components/exercises/swipe/swipe-exercise.component.ts`
    - Reduce feedback delay to ensure response within 50ms of swipe completion
    - Optimize touch event handling for smoother animations
    - _Requirements: 5.2_

  - [x] 5.2 Update swipe exercise layout for mobile
    - Increase font sizes to minimum 16px on mobile
    - Adjust card size and padding for mobile screens
    - Ensure swipe indicators are clearly visible on small screens
    - Optimize button controls (✗ and ✓) for touch interaction with 44x44px minimum size
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 6. Optimize matching pairs exercise for mobile
  - [x] 6.1 Ensure touch-friendly tap targets
    - Update matching pair cards in `src/app/components/exercises/matching-pairs/matching-pairs-exercise.component.html` to have minimum 44x44px size
    - Increase padding to minimum 12px on mobile
    - Add adequate spacing between cards (minimum 8px gap)
    - _Requirements: 4.1, 6.1_

  - [x] 6.2 Add touch-specific interaction feedback
    - Implement immediate visual feedback (within 100ms) when card is tapped
    - Add active state styling for touched cards
    - Ensure selection state is clearly visible on mobile
    - _Requirements: 5.4_

  - [x] 6.3 Optimize layout for mobile screens
    - Adjust grid layout to single column on very small screens (< 640px) if needed
    - Increase font sizes to minimum 16px on mobile
    - Reduce horizontal margins to 16px on mobile
    - Ensure hearts display is visible and appropriately sized on mobile
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 7. Add global mobile optimizations
  - Add global CSS rules to prevent text selection during drag operations across all exercises
  - Implement GPU-accelerated transforms for drag animations (use `transform` instead of `top/left`)
  - Add passive event listeners for scroll performance where appropriate
  - Ensure all interactive elements across the app meet 44x44px minimum touch target size
  - _Requirements: 5.5, 4.1_

- [ ] 8. Cross-browser and device testing
  - Test on iOS Safari (iPhone 12, 13, 14 series)
  - Test on Chrome Android (various devices)
  - Test on iPad Safari (portrait and landscape)
  - Test on Android tablets
  - Verify scroll vs drag detection works correctly
  - Verify mobile menu opens and closes smoothly
  - Test all exercises with touch interactions
  - Verify responsive breakpoints work correctly
  - Test orientation changes (portrait to landscape)
  - _Requirements: All_
