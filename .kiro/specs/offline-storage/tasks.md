# Implementation Plan

- [x] 1. Set up offline storage infrastructure
  - Install and configure the `idb` library for IndexedDB operations
  - Create IndexedDB database schema with scenarios, exercises, and sessionState object stores
  - Add appropriate indexes for efficient querying (difficulty, savedAt, lastModified)
  - _Requirements: 7.4_

- [x] 2. Implement core OfflineStorageService
  - [x] 2.1 Create OfflineStorageService with signal-based reactive state
    - Implement signals for isOffline, savedScenarios, storageUsage, and isSyncing
    - Set up IndexedDB connection and database initialization
    - Create helper methods for database transactions
    - _Requirements: 1.3, 1.4, 7.5_

  - [x] 2.2 Implement scenario save and retrieval methods
    - Write `saveScenarioForOffline()` to persist scenarios to IndexedDB
    - Write `getOfflineScenario()` to retrieve scenarios from IndexedDB
    - Write `removeScenarioFromOffline()` to delete scenarios from storage
    - Write `isScenarioSavedOffline()` to check if scenario exists offline
    - Add data validation for all read operations
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 2.3 Implement exercise caching methods
    - Write `cacheExercise()` to save exercise data to IndexedDB
    - Write `getCachedExercise()` to retrieve cached exercises
    - Implement batch caching for multiple exercises
    - Add cache invalidation logic
    - _Requirements: 1.4, 2.4_

  - [x] 2.4 Implement session state persistence
    - Write `saveSessionState()` to persist current session to IndexedDB
    - Write `restoreSessionState()` to load saved session on app initialization
    - Write `clearSessionState()` to remove session data
    - Implement debounced auto-save for session state changes
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.5 Implement storage management utilities
    - Write `calculateStorageUsage()` to compute used and available storage
    - Write `clearAllOfflineData()` to remove all offline content
    - Implement quota exceeded error handling
    - Add automatic cleanup of old scenarios when storage is low
    - _Requirements: 5.1, 5.5_

- [x] 3. Implement network detection and offline mode
  - [x] 3.1 Create network detection logic
    - Set up event listeners for online/offline events
    - Implement periodic connectivity checks with API ping
    - Update isOffline signal based on network status
    - Handle edge cases (slow connections, intermittent connectivity)
    - _Requirements: 2.1, 4.4_

  - [x] 3.2 Implement offline mode state management
    - Create computed signals for offline-dependent UI states
    - Add methods to check feature availability in offline mode
    - Implement graceful degradation for AI features when offline
    - _Requirements: 2.5, 4.3_

- [x] 4. Integrate offline storage with ExerciseService
  - Modify `getExercise()` to check cache first when offline
  - Add automatic caching when exercises are generated online
  - Update exercise loading to use cached data in offline mode
  - Add error handling for missing cached exercises
  - _Requirements: 2.4, 7.2_

- [x] 5. Integrate offline storage with SessionStore
  - Add effect to auto-save session state on changes
  - Implement session restoration on app initialization
  - Update `startConversation()` to save scenario for offline if enabled
  - Add method to check if current scenario is available offline
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Update Settings component for offline controls
  - [x] 6.1 Add offline storage settings UI
    - Add toggle switch for "Save for Offline" feature
    - Display storage usage with progress bar
    - Show count of saved scenarios
    - Add "Manage Offline Scenarios" button
    - Add "Clear All Offline Data" button with confirmation
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 6.2 Implement settings component logic
    - Wire up toggle for save-for-offline preference
    - Implement storage usage display with real-time updates
    - Add handlers for clearing offline data
    - Persist save-for-offline preference to localStorage
    - _Requirements: 5.1, 5.4_

- [x] 7. Update Scenario Catalog component for offline support
  - [x] 7.1 Add offline indicators to catalog UI
    - Add offline badge/icon to saved scenarios
    - Add "Save for Offline" button to scenario cards
    - Show visual indicator for scenarios requiring network
    - Add filter toggle to show only offline scenarios
    - Update card styling for offline/online states
    - _Requirements: 4.2, 4.5_

  - [x] 7.2 Implement catalog offline functionality
    - Write `saveScenarioForOffline()` method with loading states
    - Write `removeFromOffline()` method with confirmation
    - Write `isScenarioOffline()` helper method
    - Filter catalog list based on offline mode and availability
    - Handle auto-save when "Save for Offline" setting is enabled
    - _Requirements: 1.1, 1.2, 2.2, 5.2, 5.3_

- [x] 8. Add offline status indicators to app UI
  - Create offline status banner component
  - Add banner to app.component.html with conditional display
  - Style banner with appropriate colors and dismiss functionality
  - Add offline badge to exercise pages
  - Update AI feature buttons with disabled state and tooltips when offline
  - _Requirements: 4.1, 4.3_

- [x] 9. Implement offline guard for route protection
  - Create `offline.guard.ts` with CanActivateFn
  - Check scenario availability when navigating in offline mode
  - Redirect to catalog with offline filter if scenario unavailable
  - Add guard to exercise routes in app.routes.ts
  - _Requirements: 2.2, 2.3_

- [ ] 10. Implement scenario sync functionality
  - [ ] 10.1 Create sync service methods
    - Write `syncOfflineScenarios()` to check for server updates
    - Implement timestamp comparison logic for update detection
    - Add retry logic with exponential backoff for failed syncs
    - Update local scenarios with server changes
    - Remove scenarios deleted from server
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ] 10.2 Integrate sync with network state changes
    - Trigger automatic sync when coming back online
    - Add sync progress indicator to UI
    - Display sync results (updated, failed scenarios)
    - Handle sync conflicts gracefully
    - _Requirements: 6.4, 6.5_

- [x] 11. Add session state restoration on app initialization
  - Update app.component.ts to check for saved session on init
  - Restore active scenario from session state if present
  - Restore conversation history and exercise progress
  - Navigate to saved route if applicable
  - Clear stale session state (older than 24 hours)
  - _Requirements: 3.2, 3.3, 3.5_

- [ ] 12. Implement error handling and user feedback
  - Add error handling for quota exceeded errors
  - Create user-friendly error messages for storage failures
  - Add toast notifications for save/delete operations
  - Implement corrupted data detection and recovery
  - Add fallback behavior when IndexedDB is unavailable
  - _Requirements: 5.5, 7.1, 7.2, 7.3_

- [ ] 13. Add performance optimizations
  - Implement in-memory cache for frequently accessed scenarios
  - Add lazy loading for scenario data
  - Implement batch operations for multiple exercises
  - Add debouncing for session state saves
  - Optimize IndexedDB queries with proper indexes
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 14. Create comprehensive tests
  - [ ] 14.1 Write unit tests for OfflineStorageService
    - Test scenario save/retrieve/delete operations
    - Test exercise caching functionality
    - Test session state persistence
    - Test storage quota calculations
    - Test data validation logic
    - Mock IndexedDB using fake-indexeddb library
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 14.2 Write integration tests
    - Test settings component offline controls
    - Test catalog component offline indicators and actions
    - Test exercise components with cached data
    - Test offline guard behavior
    - Test sync functionality with mock server responses
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 14.3 Write end-to-end tests

    - Test complete offline workflow (save → offline → access)
    - Test page refresh during exercise with state restoration
    - Test network transition scenarios
    - Test storage quota exceeded handling
    - Test sync after returning online
    - _Requirements: 3.2, 3.5, 6.1_

- [x] 15. Add internationalization for offline features

  - Add translation keys for offline status messages
  - Add translations for storage management UI
  - Add translations for error messages
  - Add translations for sync notifications
  - Update all language files (en, es, fr, de, it, pt, ar, zh, ja)
  - _Requirements: 4.1, 4.3, 5.1_

- [ ] 16. Create documentation

  - Document OfflineStorageService API
  - Create user guide for offline features
  - Document IndexedDB schema
  - Add troubleshooting guide for storage issues
  - Document performance considerations
  - _Requirements: 5.1, 7.1_
