# Implementation Plan

- [x] 1. Install and configure Angular PWA package
  - Install @angular/pwa schematic using Angular CLI
  - Verify generated files (ngsw-config.json, manifest.webmanifest, service worker assets)
  - Update angular.json to include service worker in production builds
  - _Requirements: 1.1, 1.3_

- [x] 2. Configure web app manifest and icons
  - Update manifest.webmanifest with application metadata (name, theme colors, display mode)
  - Create or source PWA icons in required sizes (192x192, 512x512, maskable variants)
  - Add manifest link to index.html
  - Configure theme-color meta tags in index.html
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Configure service worker caching strategies
  - Define asset groups in ngsw-config.json for application shell (prefetch strategy)
  - Configure asset groups for static assets (lazy loading with cache-first)
  - Define data groups for API endpoints (network-first with cache fallback)
  - Configure data groups for translation files (cache-first with background update)
  - Set cache size limits and expiration policies (7 days for API responses)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 6.5_

- [x] 4. Register service worker in application bootstrap
  - Update main.ts to register service worker after application bootstrap
  - Add environment-based conditional registration (production only)
  - Implement error handling for service worker registration failures
  - _Requirements: 2.1_

- [x] 5. Create offline status monitoring service
  - Create OfflineStatusService with signals for online/offline state
  - Implement connectivity detection using navigator.onLine and online/offline events
  - Add periodic connectivity checks with actual network requests
  - Provide methods for adding/removing connectivity listeners
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Create offline indicator UI component
  - Create OfflineIndicatorComponent with visual offline status display
  - Implement non-intrusive banner or icon showing offline state
  - Add show/hide animations based on connectivity changes
  - Integrate with OfflineStatusService for reactive updates
  - Style component to match application theme
  - _Requirements: 5.2, 5.3_

- [x] 7. Integrate offline indicator into app layout
  - Add offline-indicator component to app.component.html
  - Position indicator appropriately (top banner or corner icon)
  - Ensure indicator doesn't interfere with navigation or content
  - _Requirements: 5.2, 5.3_
  - _Note: Existing offline-banner component already provides this functionality_

- [x] 8. Enhance offline storage service for PWA
  - Add getCacheSize() method to calculate total IndexedDB storage usage
  - Implement getCachedScenarioIds() to list all cached scenario IDs
  - Add pruneOldCache() method to remove entries older than specified age
  - Create clearCache() method to remove all cached data
  - Add visual indicator metadata to cached items (for offline availability display)
  - _Requirements: 3.5, 8.1, 8.2, 8.3, 8.4_

- [x] 9. Update GeminiService for offline-first operation
  - Wrap API calls with offline detection checks
  - Implement automatic fallback to cached data when offline
  - Add caching of successful API responses to OfflineStorageService
  - Update error handling to distinguish between network errors and other failures
  - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 6.3, 6.4_
  - _Note: Already implemented in existing codebase_

- [x] 10. Update ExerciseService for offline support
  - Enhance existing offline checks in getExercise() method
  - Ensure exercises are cached after successful generation
  - Implement cache-first strategy for previously loaded exercises
  - Add offline error handling with user-friendly messages
  - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 6.3, 6.4_
  - _Note: Already implemented in existing codebase_

- [x] 11. Implement background sync service
  - Create BackgroundSyncService with sync queue management
  - Add IndexedDB store for pending sync operations
  - Implement queueForSync() method to add operations to sync queue
  - Create performSync() method to process queued operations when online
  - Add retry logic with exponential backoff (max 3 attempts)
  - Implement conflict resolution for sync operations (most recent timestamp wins)
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12. Integrate background sync with user actions





  - Update GeminiService.saveToHistory() to queue for sync when offline
  - Add sync queue integration for progress tracking operations
  - Implement automatic sync trigger when connectivity is restored
  - Add visual feedback during background synchronization
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 13. Create PWA update notification service
  - Create PwaUpdateService using Angular's SwUpdate
  - Implement update detection and notification signals
  - Add checkForUpdate() method to manually check for updates
  - Create activateUpdate() method to apply pending updates
  - _Requirements: 2.5_

- [x] 14. Create update notification UI component
  - Create UpdateNotificationComponent for displaying update availability
  - Implement "Update Now" and "Dismiss" actions
  - Add styling for update notification banner
  - Integrate with PwaUpdateService for reactive updates
  - _Requirements: 2.5_

- [x] 15. Add update notification to app layout
  - Add update-notification component to app.component.html
  - Position notification appropriately (top banner)
  - Ensure notification is visible but not intrusive
  - _Requirements: 2.5_

- [x] 16. Create cache management service
  - Create CacheManagementService for cache statistics and management
  - Implement getCacheStats() to calculate cache sizes and item counts
  - Add clearAllCaches() method to clear both Cache Storage and IndexedDB
  - Implement clearServiceWorkerCache() for Cache Storage only
  - Add clearIndexedDBCache() for IndexedDB only
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 17. Create cache settings UI component
  - Create CacheSettingsComponent for displaying cache statistics
  - Show total cache size, item count, and oldest/newest items
  - Add "Clear Cache" button with confirmation dialog
  - Display loading state during cache operations
  - Show success/error messages after cache operations
  - _Requirements: 8.3, 8.4_

- [x] 18. Add cache settings to application settings/menu





  - Integrate cache-settings component into application settings page or menu
  - Add navigation route if needed
  - Ensure settings are accessible to users
  - _Requirements: 8.3, 8.4_

- [x] 19. Update scenario components to show offline availability




  - Add visual indicators to scenario lists showing which scenarios are cached
  - Display offline-available badge or icon on cached scenarios
  - Update scenario-catalog component to show offline status
  - Update scenario-history component to show offline status
  - _Requirements: 3.5_

- [x] 20. Disable online-only features when offline





  - Update scenario generation UI to disable when offline
  - Show informative messages for unavailable features
  - Disable custom text processing when offline
  - Update pronunciation assessment to show offline message
  - _Requirements: 5.4, 5.5_

- [x] 21. Add translation file precaching




  - Update ngsw-config.json to precache all translation JSON files
  - Ensure translation files are available offline immediately after installation
  - Verify translation loading works offline
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 22. Implement cache size monitoring and automatic pruning




  - Add cache size monitoring to OfflineStorageService
  - Implement automatic pruning when cache exceeds 50MB limit
  - Use LRU (Least Recently Used) strategy for cache eviction
  - Ensure minimum 10 most recent scenarios are always kept
  - Log pruning operations for debugging
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 23. Add service worker registration logging








  - Log service worker registration success/failure
  - Log service worker update events
  - Log cache operations for debugging
  - Add console warnings for offline operations
  - _Requirements: 2.1_

- [x] 24. Update build configuration for PWA
  - Verify angular.json includes serviceWorker: true for production
  - Add PWA-specific build scripts to package.json if needed
  - Configure proper cache headers for hosting (no-cache for index.html, long cache for assets)
  - _Requirements: 1.1, 2.1_

- [x] 25. Write unit tests for offline services





  - Write unit tests for OfflineStatusService (connectivity detection, event listeners)
  - Write unit tests for BackgroundSyncService (queue operations, retry logic)
  - Write unit tests for CacheManagementService (cache stats, clearing)
  - Write unit tests for PwaUpdateService (update detection, activation)
  - _Requirements: All_


- [x] 26. Write integration tests for offline scenarios



  - Test scenario loading while offline (load online, go offline, verify cache access)
  - Test exercise caching and offline access
  - Test background sync after connectivity restoration
  - Test service worker update flow
  - _Requirements: All_

- [ ] 27. Create PWA testing documentation
  - Document manual testing procedures for PWA features
  - Create checklist for installation testing
  - Document offline functionality testing steps
  - Add troubleshooting guide for common PWA issues
  - _Requirements: All_
