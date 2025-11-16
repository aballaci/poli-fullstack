# Design Document: Offline Storage

## Overview

The offline storage feature enables users to save scenarios and exercises locally for access without network connectivity. The design leverages browser storage APIs (localStorage for metadata, IndexedDB for large data) and implements a service-based architecture that integrates seamlessly with the existing Angular application structure.

The solution provides automatic session state persistence to protect against page refreshes, visual indicators for offline status, and intelligent syncing when connectivity is restored. AI-powered features are gracefully disabled in offline mode while maintaining full access to saved content.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Angular Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │   Guards     │  │    Store     │      │
│  │              │  │              │  │              │      │
│  │ - Catalog    │  │ - Offline    │  │ - Session    │      │
│  │ - Settings   │  │   Guard      │  │   Store      │      │
│  │ - Exercises  │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│  ┌────────────────────────┴────────────────────────┐       │
│  │           Offline Storage Service                │       │
│  │                                                   │       │
│  │  - Scenario Management                           │       │
│  │  - Exercise Caching                              │       │
│  │  - Session State Persistence                     │       │
│  │  - Sync Management                               │       │
│  │  - Network Detection                             │       │
│  └────────────┬──────────────────┬──────────────────┘       │
│               │                  │                          │
└───────────────┼──────────────────┼──────────────────────────┘
                │                  │
     ┌──────────┴────────┐  ┌──────┴──────────┐
     │   localStorage    │  │   IndexedDB     │
     │                   │  │                 │
     │ - Settings        │  │ - Scenarios     │
     │ - Metadata        │  │ - Exercises     │
     │ - Session State   │  │ - Large Data    │
     └───────────────────┘  └─────────────────┘
```

### Storage Strategy

**localStorage** (for small, frequently accessed data):
- User preferences (save for offline enabled/disabled)
- Offline scenario metadata (IDs, names, sizes, timestamps)
- Session state (active scenario ID, current position)
- Network status cache

**IndexedDB** (for large structured data):
- Complete scenario objects with all sentences
- Pre-generated exercise data
- Conversation history for saved scenarios
- Cached API responses

### Network Detection Strategy

The application will use multiple signals to detect offline status:
1. `navigator.onLine` API for initial state
2. `online`/`offline` event listeners for state changes
3. Periodic connectivity checks via lightweight API ping
4. Failed API request detection as fallback indicator

## Components and Interfaces

### 1. OfflineStorageService

Core service managing all offline storage operations.

```typescript
@Injectable({ providedIn: 'root' })
export class OfflineStorageService {
  // Signals for reactive state
  private isOfflineSignal = signal<boolean>(!navigator.onLine);
  private savedScenariosSignal = signal<OfflineScenarioMetadata[]>([]);
  private storageUsageSignal = signal<StorageUsage>({ used: 0, available: 0 });
  private isSyncingSignal = signal<boolean>(false);
  
  // Public readonly computed signals
  readonly isOffline = this.isOfflineSignal.asReadonly();
  readonly savedScenarios = this.savedScenariosSignal.asReadonly();
  readonly storageUsage = this.storageUsageSignal.asReadonly();
  readonly isSyncing = this.isSyncingSignal.asReadonly();
  
  // Core methods
  async saveScenarioForOffline(scenario: ConversationScenario): Promise<void>
  async removeScenarioFromOffline(scenarioId: string): Promise<void>
  async getOfflineScenario(scenarioId: string): Promise<ConversationScenario | null>
  async isScenarioSavedOffline(scenarioId: string): Promise<boolean>
  
  // Exercise caching
  async cacheExercise(scenarioId: string, exerciseType: ExerciseType, data: ExerciseData): Promise<void>
  async getCachedExercise(scenarioId: string, exerciseType: ExerciseType): Promise<ExerciseData | null>
  
  // Session state management
  async saveSessionState(state: SessionState): Promise<void>
  async restoreSessionState(): Promise<SessionState | null>
  async clearSessionState(): Promise<void>
  
  // Sync operations
  async syncOfflineScenarios(): Promise<SyncResult>
  
  // Storage management
  async calculateStorageUsage(): Promise<StorageUsage>
  async clearAllOfflineData(): Promise<void>
}
```

### 2. IndexedDB Schema

Database name: `poli-offline-db`
Version: 1

**Object Stores:**

```typescript
// scenarios store
{
  keyPath: 'id',
  indexes: [
    { name: 'difficulty', keyPath: 'difficulty_level' },
    { name: 'savedAt', keyPath: 'savedAt' },
    { name: 'lastModified', keyPath: 'lastModified' }
  ]
}

// exercises store
{
  keyPath: ['scenarioId', 'exerciseType'],
  indexes: [
    { name: 'scenarioId', keyPath: 'scenarioId' }
  ]
}

// sessionState store
{
  keyPath: 'key',
  // Single entry with key 'current'
}
```

### 3. Data Models

```typescript
interface OfflineScenarioMetadata {
  id: string;
  name: string;
  difficulty_level: string;
  savedAt: string; // ISO timestamp
  lastModified: string; // ISO timestamp from server
  size: number; // bytes
  hasExercises: boolean;
}

interface StorageUsage {
  used: number; // bytes
  available: number; // bytes
  percentage: number;
}

interface SessionState {
  activeScenarioId: string | null;
  conversationHistory: SentenceResult[];
  currentSentenceIndex: number;
  currentRoute: string;
  exerciseProgress: {
    [exerciseType: string]: {
      completed: boolean;
      currentIndex: number;
    };
  };
  timestamp: string;
}

interface SyncResult {
  updated: string[]; // scenario IDs
  failed: string[]; // scenario IDs
  removed: string[]; // scenario IDs (deleted from server)
}

interface OfflineScenarioData extends ConversationScenario {
  savedAt: string;
  lastModified: string;
  exercises: {
    [key in ExerciseType]?: ExerciseData;
  };
}
```

### 4. Settings Component Integration

Add offline storage controls to the existing settings component:

```typescript
// New properties
readonly saveForOfflineEnabled = signal<boolean>(false);
readonly offlineStorageUsage = this.offlineStorageService.storageUsage;
readonly savedScenariosCount = computed(() => 
  this.offlineStorageService.savedScenarios().length
);

// New methods
toggleSaveForOffline(): void
clearOfflineStorage(): void
viewOfflineScenarios(): void
```

### 5. Scenario Catalog Component Integration

Add offline indicators and save buttons:

```typescript
// New methods
async saveScenarioForOffline(scenarioId: string): Promise<void>
async removeFromOffline(scenarioId: string): Promise<void>
isScenarioOffline(scenarioId: string): boolean

// Template additions
// - Offline badge on saved scenarios
// - "Save for Offline" button on each scenario card
// - Filter to show only offline scenarios when offline
```

### 6. Offline Guard

New route guard to handle offline navigation:

```typescript
export const offlineGuard: CanActivateFn = async (route, state) => {
  const offlineService = inject(OfflineStorageService);
  const sessionStore = inject(SessionStore);
  const router = inject(Router);
  
  const isOffline = offlineService.isOffline();
  const activeScenario = sessionStore.activeScenario();
  
  if (isOffline && activeScenario) {
    // Check if scenario is available offline
    const isAvailable = await offlineService.isScenarioSavedOffline(activeScenario.id);
    if (!isAvailable) {
      // Redirect to catalog with offline filter
      return router.parseUrl('/selector?offline=true');
    }
  }
  
  return true;
};
```

## Error Handling

### Storage Quota Exceeded

```typescript
try {
  await offlineStorageService.saveScenarioForOffline(scenario);
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    // Show user-friendly message
    // Offer to clear old scenarios
    // Display storage usage
  }
}
```

### Corrupted Data Recovery

```typescript
async getOfflineScenario(scenarioId: string): Promise<ConversationScenario | null> {
  try {
    const data = await this.db.get('scenarios', scenarioId);
    // Validate data structure
    if (!this.validateScenarioData(data)) {
      console.error('Corrupted scenario data, removing from storage');
      await this.removeScenarioFromOffline(scenarioId);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error reading offline scenario:', error);
    return null;
  }
}
```

### Network Transition Handling

```typescript
private setupNetworkListeners(): void {
  window.addEventListener('online', () => {
    this.isOfflineSignal.set(false);
    // Trigger sync after short delay
    setTimeout(() => this.syncOfflineScenarios(), 2000);
  });
  
  window.addEventListener('offline', () => {
    this.isOfflineSignal.set(true);
    // Save current session state immediately
    this.saveCurrentSessionState();
  });
}
```

## Testing Strategy

### Unit Tests

1. **OfflineStorageService Tests**
   - Test scenario save/retrieve/delete operations
   - Test exercise caching
   - Test session state persistence
   - Test storage quota calculations
   - Test data validation
   - Mock IndexedDB using fake-indexeddb

2. **Network Detection Tests**
   - Test online/offline event handling
   - Test connectivity check logic
   - Mock navigator.onLine

3. **Sync Logic Tests**
   - Test scenario update detection
   - Test conflict resolution
   - Test retry logic with exponential backoff

### Integration Tests

1. **Component Integration**
   - Test settings component offline controls
   - Test catalog component offline indicators
   - Test exercise components with cached data

2. **Guard Integration**
   - Test offline guard with various scenarios
   - Test navigation restrictions when offline

3. **End-to-End Scenarios**
   - Save scenario → go offline → access scenario
   - Refresh page during exercise → restore state
   - Go offline → attempt AI feature → see error message
   - Return online → auto-sync scenarios

### Performance Tests

1. **Storage Operations**
   - Measure save time for various scenario sizes
   - Measure load time from IndexedDB
   - Test with 50+ saved scenarios

2. **Memory Usage**
   - Monitor memory during bulk operations
   - Test cleanup after scenario deletion

## UI/UX Considerations

### Visual Indicators

1. **Offline Status Banner**
   - Persistent banner at top when offline
   - Shows "Offline Mode - AI features unavailable"
   - Dismissible but reappears on page load

2. **Scenario Cards**
   - Cloud icon with checkmark for saved scenarios
   - "Save for Offline" button on unsaved scenarios
   - Grayed out scenarios when offline and not saved

3. **Settings Panel**
   - Toggle switch for "Auto-save for offline"
   - Storage usage progress bar
   - "Manage Offline Scenarios" button

4. **Exercise Pages**
   - Badge showing "Offline Mode" when applicable
   - Disabled AI assessment button with tooltip

### User Flows

**Flow 1: Enable Offline Mode**
1. User opens Settings
2. Toggles "Save for Offline" switch
3. Sees confirmation message
4. All future scenarios auto-save

**Flow 2: Save Specific Scenario**
1. User browses catalog
2. Clicks "Save for Offline" on scenario card
3. Sees loading indicator
4. Card updates with offline badge

**Flow 3: Access Offline**
1. User loses connectivity
2. Sees offline banner appear
3. Opens catalog (filtered to offline scenarios)
4. Selects and loads saved scenario
5. Completes exercises with cached data

**Flow 4: Page Refresh Protection**
1. User is mid-exercise
2. Accidentally refreshes page
3. App detects session state in storage
4. Restores to exact same position
5. User continues without interruption

## Performance Optimizations

### Lazy Loading

```typescript
// Only load scenario data when needed
async loadScenarioOnDemand(scenarioId: string): Promise<ConversationScenario> {
  // Check memory cache first
  if (this.scenarioCache.has(scenarioId)) {
    return this.scenarioCache.get(scenarioId)!;
  }
  
  // Load from IndexedDB
  const scenario = await this.getOfflineScenario(scenarioId);
  
  // Cache in memory with size limit
  this.addToMemoryCache(scenarioId, scenario);
  
  return scenario;
}
```

### Batch Operations

```typescript
// Save multiple exercises in single transaction
async cacheAllExercises(
  scenarioId: string, 
  exercises: Map<ExerciseType, ExerciseData>
): Promise<void> {
  const tx = this.db.transaction('exercises', 'readwrite');
  const store = tx.objectStore('exercises');
  
  const promises = Array.from(exercises.entries()).map(([type, data]) =>
    store.put({ scenarioId, exerciseType: type, data })
  );
  
  await Promise.all([...promises, tx.done]);
}
```

### Debounced Session State Saves

```typescript
private sessionStateSaveDebounce = debounce(() => {
  this.saveSessionState(this.getCurrentSessionState());
}, 1000);

// Call on every state change
onSessionStateChange(): void {
  this.sessionStateSaveDebounce();
}
```

## Migration Strategy

### Phase 1: Core Infrastructure
- Implement OfflineStorageService
- Set up IndexedDB schema
- Add network detection

### Phase 2: Basic Offline Support
- Implement scenario save/load
- Add offline indicators to catalog
- Implement session state persistence

### Phase 3: Exercise Caching
- Integrate with ExerciseService
- Cache exercises on generation
- Load from cache when offline

### Phase 4: Sync & Management
- Implement sync logic
- Add settings UI controls
- Add storage management features

### Phase 5: Polish & Optimization
- Add loading states and animations
- Optimize performance
- Add comprehensive error handling

## Security Considerations

1. **Data Validation**
   - Validate all data read from storage
   - Sanitize before rendering
   - Check data integrity with checksums

2. **Storage Limits**
   - Enforce maximum scenario count
   - Prevent storage exhaustion
   - Clear old data automatically

3. **Sensitive Data**
   - Don't store authentication tokens in IndexedDB
   - Keep user credentials in secure storage only
   - Clear session state on logout

## Dependencies

- **idb** (^7.1.1): Promise-based IndexedDB wrapper
- **lodash-es** (existing): For debounce utility
- Existing Angular dependencies (signals, inject, etc.)

## Backward Compatibility

- Feature is opt-in, doesn't affect existing users
- Graceful degradation if IndexedDB unavailable
- Falls back to online-only mode if storage fails
- No breaking changes to existing APIs
