# Translation File Precaching Verification Guide

## Overview
This document provides steps to verify that translation files are properly precached by the service worker and available offline immediately after installation.

## Configuration Summary

### Service Worker Configuration (ngsw-config.json)
- **Asset Group**: `translations`
- **Install Mode**: `prefetch` - Translation files are cached during service worker installation
- **Update Mode**: `prefetch` - Translation updates are also prefetched
- **Pattern**: `/assets/i18n/*.json` - Matches all translation JSON files

### Supported Languages
The following 9 translation files are precached:
1. English (en.json)
2. Italian (it.json)
3. German (de.json)
4. French (fr.json)
5. Spanish (es.json)
6. Portuguese (pt.json)
7. Japanese (ja.json)
8. Chinese (zh.json)
9. Arabic (ar.json)

## Manual Verification Steps

### Step 1: Build for Production
```bash
npm run build
```

This will:
- Generate the service worker (ngsw-worker.js)
- Create the service worker manifest (ngsw.json)
- Include all translation files in the precache manifest

### Step 2: Serve Production Build
```bash
npx http-server dist/amplify-angular-template -p 8080
```

### Step 3: Verify Service Worker Installation
1. Open the application in a browser: `http://localhost:8080`
2. Open DevTools (F12)
3. Go to the **Console** tab
4. Look for service worker registration logs:
   ```
   [ServiceWorker] Service worker support detected
   [ServiceWorker] Service worker registered successfully
   [ServiceWorker] Scope: http://localhost:8080/
   ```

### Step 4: Verify Translation Files are Precached
1. In DevTools, go to **Application** tab
2. Navigate to **Cache Storage** in the left sidebar
3. Find the cache named `ngsw:/:db:translations:cache`
4. Verify all 9 translation files are listed:
   - `http://localhost:8080/assets/i18n/en.json`
   - `http://localhost:8080/assets/i18n/it.json`
   - `http://localhost:8080/assets/i18n/de.json`
   - `http://localhost:8080/assets/i18n/fr.json`
   - `http://localhost:8080/assets/i18n/es.json`
   - `http://localhost:8080/assets/i18n/pt.json`
   - `http://localhost:8080/assets/i18n/ja.json`
   - `http://localhost:8080/assets/i18n/zh.json`
   - `http://localhost:8080/assets/i18n/ar.json`

### Step 5: Test Offline Translation Loading
1. With the application still open, go to **Network** tab in DevTools
2. Check the **Offline** checkbox to simulate offline mode
3. Switch between different languages using the language switcher
4. Verify in the **Console** tab that translations load successfully:
   ```
   [TranslocoHttpLoader] Loading translation for language: it
   [TranslocoHttpLoader] Translation loaded successfully for: it
   [TranslocoHttpLoader] ✓ Translation loaded from cache (offline mode)
   ```
5. Verify the UI updates with the correct translations
6. Repeat for all 9 languages

### Step 6: Verify Network Requests
1. In the **Network** tab (while offline), filter by "i18n"
2. When switching languages, you should see:
   - Status: `200 OK` (from Service Worker)
   - Size: `(from ServiceWorker)` or `(from disk cache)`
   - Time: Very fast (< 10ms)

### Step 7: Test Fresh Installation Offline
1. Clear all site data:
   - DevTools → Application → Storage → Clear site data
2. Close and reopen the browser
3. Visit the application while **online**
4. Wait for service worker to install (check Console logs)
5. Once installed, go **offline** (Network tab → Offline checkbox)
6. Refresh the page
7. Switch between languages
8. Verify all translations work offline

## Expected Results

### ✅ Success Criteria
- [ ] Service worker registers successfully
- [ ] All 9 translation files appear in Cache Storage
- [ ] Translation files are cached during initial installation (prefetch)
- [ ] Switching languages works offline
- [ ] Console shows "Translation loaded from cache (offline mode)" when offline
- [ ] No network errors for translation files when offline
- [ ] UI displays correct translations in all languages offline

### ❌ Failure Indicators
- Service worker fails to register
- Translation files missing from Cache Storage
- Network errors when switching languages offline
- UI shows translation keys instead of translated text
- Console shows HTTP errors for translation files

## Troubleshooting

### Issue: Service Worker Not Registering
**Solution**: Ensure you're running a production build and serving over HTTPS or localhost

### Issue: Translation Files Not Cached
**Solution**: 
1. Check ngsw-config.json has the translations asset group
2. Verify the file pattern matches: `/assets/i18n/*.json`
3. Rebuild the application

### Issue: Translations Don't Load Offline
**Solution**:
1. Verify service worker is active (Application → Service Workers)
2. Check Cache Storage contains translation files
3. Clear cache and reinstall service worker
4. Check Console for error messages

### Issue: Only Some Languages Work Offline
**Solution**:
1. Verify all translation files exist in `src/assets/i18n/`
2. Check the pattern in ngsw-config.json matches all files
3. Rebuild and reinstall service worker

## Technical Details

### How It Works
1. **Installation**: When the service worker installs, it prefetches all files matching `/assets/i18n/*.json`
2. **Caching**: Translation files are stored in the `ngsw:/:db:translations:cache` cache
3. **Serving**: When the app requests a translation file, the service worker intercepts the request
4. **Offline**: If offline, the service worker serves the file from cache
5. **Updates**: When online, the service worker checks for updates and prefetches new versions

### Cache Strategy
- **Strategy**: Prefetch (install immediately)
- **Update**: Prefetch (update immediately when available)
- **Persistence**: Cached until service worker updates
- **Priority**: High (required for app functionality)

## Requirements Satisfied

This implementation satisfies the following requirements from the PWA Offline Support spec:

- **Requirement 4.1**: Translation files are cached during initial load
- **Requirement 4.2**: Translation files are served from cache when offline
- **Requirement 4.5**: Translation files for all supported languages are precached during service worker installation

## Additional Notes

- Translation files are small (typically < 50KB each), so precaching all languages has minimal impact
- The prefetch strategy ensures translations are available immediately after installation
- No additional code changes needed in components - Transloco automatically uses cached files
- The service worker handles all caching transparently
