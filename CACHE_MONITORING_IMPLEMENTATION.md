# Cache Size Monitoring and Automatic Pruning Implementation

## Overview
This document describes the implementation of cache size monitoring and automatic pruning for the OfflineStorageService, as specified in Task 22 of the PWA Offline Support specification.

## Features Implemented

### 1. Cache Size Monitoring
- **Automatic Monitoring**: Cache size is checked every 5 minutes via `CACHE_CHECK_INTERVAL_MS`
- **Initial Check**: First check occurs 10 seconds after service initialization
- **Real-time Tracking**: Cache size is calculated and tracked in the `storageUsageSignal`
- **Logging**: All monitoring operations are logged for debugging purposes

### 2. Automatic Pruning
- **Size Limit**: Maximum cache size set to 50MB (`MAX_CACHE_SIZE_BYTES`)
- **Trigger**: Automatic pruning is triggered when cache exceeds the 50MB limit
- **LRU Strategy**: Uses Least Recently Used (LRU) strategy for cache eviction
- **Minimum Retention**: Always keeps at least 10 most recent scenarios (`MIN_SCENARIOS_TO_KEEP`)

### 3. LRU (Least Recently Used) Implementation
- **Timestamp Tracking**: `lastModified` timestamp is updated on every scenario access
- **Sorting**: Scenarios are sorted by `lastModified` timestamp (oldest first)
- **Smart Eviction**: Oldest scenarios are removed first, but most recent 10 are always preserved

### 4. Enhanced Error Handling
- **Quota Exceeded**: Automatically triggers pruning when QuotaExceededError occurs
- **Retry Logic**: After pruning, the operation is retried automatically
- **Graceful Degradation**: If pruning fails, user-friendly error messages are provided

### 5. Logging and Debugging
All cache operations include comprehensive logging:
- Cache size monitoring results
- Pruning operations (which scenarios were removed and why)
- LRU tracking updates
- Error conditions and recovery attempts

## Key Methods Added/Modified

### New Methods
1. `startCacheMonitoring()` - Initializes periodic cache monitoring
2. `checkAndPruneCache()` - Checks cache size and triggers pruning if needed
3. `performAutomaticPruning()` - Executes LRU-based cache eviction
4. `checkCacheSizeAndPrune()` - Public method to manually trigger cache check
5. `getCacheStatistics()` - Returns detailed cache statistics including:
   - Total size
   - Scenario and exercise counts
   - Oldest and newest scenario dates
   - Whether cache is over limit

### Modified Methods
1. `saveScenarioForOffline()` - Now includes:
   - Automatic cache size check after save
   - Automatic pruning on QuotaExceededError
   - Retry logic after pruning

2. `cacheExercise()` - Now includes:
   - Updates `lastModified` timestamp for LRU tracking
   - Automatic pruning on QuotaExceededError
   - Retry logic after pruning

3. `getOfflineScenario()` - Now includes:
   - Updates `lastModified` timestamp on access (LRU tracking)
   - Ensures recently accessed scenarios are kept longer

4. `pruneOldCache()` - Enhanced to:
   - Respect `MIN_SCENARIOS_TO_KEEP` limit
   - Sort scenarios by date before pruning
   - Provide detailed logging

## Configuration Constants

```typescript
private readonly MAX_CACHE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
private readonly MIN_SCENARIOS_TO_KEEP = 10;
private readonly CACHE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
```

## Usage Examples

### Automatic Operation
The service automatically monitors and prunes cache in the background. No manual intervention is required.

### Manual Cache Check
```typescript
// Manually trigger cache size check and pruning
await offlineStorageService.checkCacheSizeAndPrune();
```

### Get Cache Statistics
```typescript
const stats = await offlineStorageService.getCacheStatistics();
console.log(`Cache size: ${stats.totalSize / (1024 * 1024)}MB`);
console.log(`Scenarios: ${stats.scenarioCount}`);
console.log(`Over limit: ${stats.isOverLimit}`);
```

### Age-based Pruning
```typescript
// Remove scenarios older than 7 days
const prunedCount = await offlineStorageService.pruneOldCache(7 * 24 * 60 * 60 * 1000);
console.log(`Pruned ${prunedCount} old scenarios`);
```

## Testing

A comprehensive test suite has been created in `src/app/services/offline-storage.service.spec.ts` covering:
- Cache size calculation
- Cache statistics reporting
- LRU eviction behavior
- Age-based pruning
- Minimum scenario retention
- Quota exceeded error handling
- Timestamp updates on access

## Requirements Satisfied

This implementation satisfies the following requirements from the PWA Offline Support specification:

- **Requirement 8.1**: Cache size limits with maximum of 50MB for runtime caches
- **Requirement 8.2**: LRU-based cache eviction when size exceeds limits
- **Requirement 8.5**: Automatic cache management to prevent excessive storage usage

## Logging Examples

```
[OfflineStorage] Cache monitoring: 12.45MB used (24.9%)
[OfflineStorage] Cache size (52.34MB) exceeds limit (50MB). Starting automatic pruning...
[OfflineStorage] Pruning: 15 scenarios eligible for removal, 10 will be kept
[OfflineStorage] Pruning scenario: scenario-123 (Shopping Conversation) - Last modified: 1/15/2024, Size: 234.56KB
[OfflineStorage] ✓ Automatic pruning complete: 5 scenario(s) removed, cache size now: 48.23MB
```

## Performance Considerations

1. **Minimal Overhead**: Cache monitoring runs every 5 minutes, not on every operation
2. **Efficient Sorting**: Uses native JavaScript sort with timestamp comparison
3. **Batch Operations**: Pruning is done in a single pass
4. **Memory Cache**: In-memory cache (10 scenarios) reduces IndexedDB access
5. **Lazy Evaluation**: Statistics are calculated only when requested

## Future Enhancements

Potential improvements for future iterations:
1. User-configurable cache size limits
2. Different retention policies per scenario type
3. Predictive pruning based on usage patterns
4. Cache warming for frequently accessed scenarios
5. Compression for stored scenarios
