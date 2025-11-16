import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { OfflineStatusService } from './offline-status.service';

describe('OfflineStatusService', () => {
    let service: OfflineStatusService;
    let originalNavigatorOnLine: boolean;
    let originalFetch: typeof fetch;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OfflineStatusService]
        });

        // Store original values
        originalNavigatorOnLine = navigator.onLine;
        originalFetch = window.fetch;

        service = TestBed.inject(OfflineStatusService);
    });

    afterEach(() => {
        // Restore original values
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: originalNavigatorOnLine
        });
        window.fetch = originalFetch;

        // Clean up service
        service.ngOnDestroy();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Connectivity Detection', () => {
        it('should initialize with navigator.onLine value', () => {
            const currentOnlineStatus = navigator.onLine;
            expect(service.isOnline()).toBe(currentOnlineStatus);
        });

        it('should detect online state when navigator.onLine is true', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });

            const newService = TestBed.inject(OfflineStatusService);
            expect(newService.isOnline()).toBe(true);
            newService.ngOnDestroy();
        });

        it('should detect offline state when navigator.onLine is false', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });

            const newService = TestBed.inject(OfflineStatusService);
            expect(newService.isOnline()).toBe(false);
            newService.ngOnDestroy();
        });
    });

    describe('Event Listeners', () => {
        it('should update isOnline signal when online event fires', fakeAsync(() => {
            // Set initial state to offline
            service.isOnline.set(false);
            expect(service.isOnline()).toBe(false);

            // Mock fetch to return success
            window.fetch = jasmine.createSpy('fetch').and.returnValue(
                Promise.resolve(new Response(null, { status: 200 }))
            );

            // Simulate online event
            window.dispatchEvent(new Event('online'));
            tick();

            // Should be online
            expect(service.isOnline()).toBe(true);

            flush();
        }));

        it('should update isOnline signal when offline event fires', fakeAsync(() => {
            // Set initial state to online
            service.isOnline.set(true);
            expect(service.isOnline()).toBe(true);

            // Simulate offline event
            window.dispatchEvent(new Event('offline'));
            tick();

            // Should be offline
            expect(service.isOnline()).toBe(false);

            flush();
        }));

        it('should handle multiple online/offline transitions', fakeAsync(() => {
            // Mock fetch
            window.fetch = jasmine.createSpy('fetch').and.returnValue(
                Promise.resolve(new Response(null, { status: 200 }))
            );

            // Start online
            service.isOnline.set(true);

            // Go offline
            window.dispatchEvent(new Event('offline'));
            tick();
            expect(service.isOnline()).toBe(false);

            // Go online
            window.dispatchEvent(new Event('online'));
            tick();
            expect(service.isOnline()).toBe(true);

            // Go offline again
            window.dispatchEvent(new Event('offline'));
            tick();
            expect(service.isOnline()).toBe(false);

            flush();
        }));
    });

    describe('Connectivity Verification', () => {
        it('should verify connectivity with network request', fakeAsync(async () => {
            // Mock successful fetch
            window.fetch = jasmine.createSpy('fetch').and.returnValue(
                Promise.resolve(new Response(null, { status: 200 }))
            );

            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });

            const result = await service.checkConnectivity();
            tick();

            expect(window.fetch).toHaveBeenCalledWith('/favicon.svg', {
                method: 'HEAD',
                cache: 'no-cache'
            });
            expect(result).toBe(true);
            expect(service.isOnline()).toBe(true);

            flush();
        }));

        it('should detect offline when fetch fails', fakeAsync(async () => {
            // Mock failed fetch
            window.fetch = jasmine.createSpy('fetch').and.returnValue(
                Promise.reject(new Error('Network error'))
            );

            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });

            const result = await service.checkConnectivity();
            tick();

            expect(result).toBe(false);
            expect(service.isOnline()).toBe(false);

            flush();
        }));

        it('should detect offline when navigator.onLine is false', fakeAsync(async () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });

            const result = await service.checkConnectivity();
            tick();

            expect(result).toBe(false);
            expect(service.isOnline()).toBe(false);

            flush();
        }));

        it('should detect offline when fetch returns non-ok response', fakeAsync(async () => {
            // Mock fetch with 404 response
            window.fetch = jasmine.createSpy('fetch').and.returnValue(
                Promise.resolve(new Response(null, { status: 404 }))
            );

            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });

            const result = await service.checkConnectivity();
            tick();

            expect(result).toBe(false);
            expect(service.isOnline()).toBe(false);

            flush();
        }));
    });

    describe('Cleanup', () => {
        it('should clean up event listeners on destroy', () => {
            const removeEventListenerSpy = spyOn(window, 'removeEventListener');

            service.ngOnDestroy();

            expect(removeEventListenerSpy).toHaveBeenCalled();
        });

        it('should clear periodic check interval on destroy', fakeAsync(() => {
            const clearIntervalSpy = spyOn(window, 'clearInterval');

            service.ngOnDestroy();
            tick();

            expect(clearIntervalSpy).toHaveBeenCalled();

            flush();
        }));
    });
});
