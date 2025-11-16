import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { PwaUpdateService } from './pwa-update.service';
import { Subject, of } from 'rxjs';

/**
 * Integration tests for PWA service worker update flow
 * Tests update detection, notification, and activation
 */
describe('PWA Update Integration Tests', () => {
    let pwaUpdateService: PwaUpdateService;
    let swUpdateMock: jasmine.SpyObj<SwUpdate>;
    let appRefMock: jasmine.SpyObj<ApplicationRef>;
    let versionUpdatesSubject: Subject<any>;

    beforeEach(() => {
        // Create mock subjects
        versionUpdatesSubject = new Subject();
        const unrecoverableSubject = new Subject();

        // Create SwUpdate mock
        swUpdateMock = jasmine.createSpyObj('SwUpdate', [
            'checkForUpdate',
            'activateUpdate'
        ], {
            isEnabled: true,
            versionUpdates: versionUpdatesSubject.asObservable(),
            unrecoverable: unrecoverableSubject.asObservable()
        });

        // Create ApplicationRef mock
        appRefMock = jasmine.createSpyObj('ApplicationRef', [], {
            isStable: of(true)
        });

        TestBed.configureTestingModule({
            providers: [
                PwaUpdateService,
                { provide: SwUpdate, useValue: swUpdateMock },
                { provide: ApplicationRef, useValue: appRefMock }
            ]
        });

        pwaUpdateService = TestBed.inject(PwaUpdateService);
    });

    afterEach(() => {
        versionUpdatesSubject.complete();
    });

    describe('Update Detection', () => {
        it('should detect when new version is available', fakeAsync(() => {
            // Initially no update
            expect(pwaUpdateService.updateAvailable()).toBe(false);

            // Simulate version ready event
            const versionReadyEvent: VersionReadyEvent = {
                type: 'VERSION_READY',
                currentVersion: { hash: 'v1', appData: {} },
                latestVersion: { hash: 'v2', appData: {} }
            };

            versionUpdatesSubject.next(versionReadyEvent);
            tick();

            // Update should be available
            expect(pwaUpdateService.updateAvailable()).toBe(true);

            flush();
        }));

        it('should handle VERSION_DETECTED event', fakeAsync(() => {
            const versionDetectedEvent = {
                type: 'VERSION_DETECTED',
                version: { hash: 'v2', appData: {} }
            };

            // Should not throw error
            expect(() => {
                versionUpdatesSubject.next(versionDetectedEvent);
                tick();
            }).not.toThrow();

            flush();
        }));

        it('should handle NO_NEW_VERSION_DETECTED event', fakeAsync(() => {
            const noNewVersionEvent = {
                type: 'NO_NEW_VERSION_DETECTED',
                version: { hash: 'v1', appData: {} }
            };

            versionUpdatesSubject.next(noNewVersionEvent);
            tick();

            // Update should not be available
            expect(pwaUpdateService.updateAvailable()).toBe(false);

            flush();
        }));

        it('should handle VERSION_INSTALLATION_FAILED event', fakeAsync(() => {
            const installFailedEvent = {
                type: 'VERSION_INSTALLATION_FAILED',
                version: { hash: 'v2', appData: {} },
                error: 'Installation failed'
            };

            // Should not throw error
            expect(() => {
                versionUpdatesSubject.next(installFailedEvent);
                tick();
            }).not.toThrow();

            flush();
        }));
    });

    describe('Manual Update Check', () => {
        it('should check for updates manually', fakeAsync(async () => {
            swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(true));

            const updateFound = await pwaUpdateService.checkForUpdate();
            tick();

            expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
            expect(updateFound).toBe(true);

            flush();
        }));

        it('should return false when no update is available', fakeAsync(async () => {
            swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(false));

            const updateFound = await pwaUpdateService.checkForUpdate();
            tick();

            expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
            expect(updateFound).toBe(false);

            flush();
        }));

        it('should handle check for update errors', fakeAsync(async () => {
            swUpdateMock.checkForUpdate.and.returnValue(Promise.reject(new Error('Check failed')));

            const updateFound = await pwaUpdateService.checkForUpdate();
            tick();

            expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
            expect(updateFound).toBe(false);

            flush();
        }));

        it('should set updateCheckInProgress during check', fakeAsync(async () => {
            let checkInProgress = false;
            swUpdateMock.checkForUpdate.and.callFake(() => {
                checkInProgress = pwaUpdateService.updateCheckInProgress();
                return Promise.resolve(true);
            });

            await pwaUpdateService.checkForUpdate();
            tick();

            expect(checkInProgress).toBe(true);
            expect(pwaUpdateService.updateCheckInProgress()).toBe(false);

            flush();
        }));
    });

    describe('Update Activation', () => {
        it('should activate pending update', fakeAsync(async () => {
            swUpdateMock.activateUpdate.and.returnValue(Promise.resolve(true));

            // Mock window.location.reload
            const reloadSpy = spyOn(window.location, 'reload');

            await pwaUpdateService.activateUpdate();
            tick();

            expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
            expect(reloadSpy).toHaveBeenCalled();

            flush();
        }));

        it('should handle activation errors', fakeAsync(async () => {
            swUpdateMock.activateUpdate.and.returnValue(Promise.reject(new Error('Activation failed')));

            try {
                await pwaUpdateService.activateUpdate();
                tick();
                fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).toBe('Activation failed');
            }

            flush();
        }));
    });

    describe('Update Dismissal', () => {
        it('should dismiss update notification', fakeAsync(() => {
            // Set update available
            const versionReadyEvent: VersionReadyEvent = {
                type: 'VERSION_READY',
                currentVersion: { hash: 'v1', appData: {} },
                latestVersion: { hash: 'v2', appData: {} }
            };

            versionUpdatesSubject.next(versionReadyEvent);
            tick();

            expect(pwaUpdateService.updateAvailable()).toBe(true);

            // Dismiss update
            pwaUpdateService.dismissUpdate();
            tick();

            expect(pwaUpdateService.updateAvailable()).toBe(false);

            flush();
        }));
    });

    describe('Service Worker Disabled', () => {
        beforeEach(() => {
            // Recreate service with disabled SW
            const versionUpdatesSubject = new Subject();
            const unrecoverableSubject = new Subject();

            const disabledSwUpdateMock = jasmine.createSpyObj('SwUpdate', [
                'checkForUpdate',
                'activateUpdate'
            ], {
                isEnabled: false,
                versionUpdates: versionUpdatesSubject.asObservable(),
                unrecoverable: unrecoverableSubject.asObservable()
            });

            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    PwaUpdateService,
                    { provide: SwUpdate, useValue: disabledSwUpdateMock },
                    { provide: ApplicationRef, useValue: appRefMock }
                ]
            });

            swUpdateMock = disabledSwUpdateMock;
            pwaUpdateService = TestBed.inject(PwaUpdateService);
        });

        it('should skip update check when service worker is disabled', fakeAsync(async () => {
            const updateFound = await pwaUpdateService.checkForUpdate();
            tick();

            expect(swUpdateMock.checkForUpdate).not.toHaveBeenCalled();
            expect(updateFound).toBe(false);

            flush();
        }));

        it('should skip activation when service worker is disabled', fakeAsync(async () => {
            await pwaUpdateService.activateUpdate();
            tick();

            expect(swUpdateMock.activateUpdate).not.toHaveBeenCalled();

            flush();
        }));
    });

    describe('Complete Update Flow', () => {
        it('should handle complete update workflow: detect, notify, activate', fakeAsync(async () => {
            // Step 1: Detect new version
            const versionReadyEvent: VersionReadyEvent = {
                type: 'VERSION_READY',
                currentVersion: { hash: 'v1', appData: {} },
                latestVersion: { hash: 'v2', appData: {} }
            };

            versionUpdatesSubject.next(versionReadyEvent);
            tick();

            // Step 2: Verify update is available
            expect(pwaUpdateService.updateAvailable()).toBe(true);

            // Step 3: Activate update
            swUpdateMock.activateUpdate.and.returnValue(Promise.resolve(true));
            const reloadSpy = spyOn(window.location, 'reload');

            await pwaUpdateService.activateUpdate();
            tick();

            // Step 4: Verify activation and reload
            expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
            expect(reloadSpy).toHaveBeenCalled();

            flush();
        }));

        it('should handle update detection followed by dismissal', fakeAsync(() => {
            // Detect update
            const versionReadyEvent: VersionReadyEvent = {
                type: 'VERSION_READY',
                currentVersion: { hash: 'v1', appData: {} },
                latestVersion: { hash: 'v2', appData: {} }
            };

            versionUpdatesSubject.next(versionReadyEvent);
            tick();

            expect(pwaUpdateService.updateAvailable()).toBe(true);

            // User dismisses
            pwaUpdateService.dismissUpdate();
            tick();

            expect(pwaUpdateService.updateAvailable()).toBe(false);

            // Later, user can still manually check
            swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(true));
            pwaUpdateService.checkForUpdate();
            tick();

            expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();

            flush();
        }));

        it('should handle multiple version updates', fakeAsync(() => {
            // First update
            versionUpdatesSubject.next({
                type: 'VERSION_READY',
                currentVersion: { hash: 'v1', appData: {} },
                latestVersion: { hash: 'v2', appData: {} }
            });
            tick();

            expect(pwaUpdateService.updateAvailable()).toBe(true);

            // Dismiss first update
            pwaUpdateService.dismissUpdate();
            tick();

            // Second update
            versionUpdatesSubject.next({
                type: 'VERSION_READY',
                currentVersion: { hash: 'v2', appData: {} },
                latestVersion: { hash: 'v3', appData: {} }
            });
            tick();

            expect(pwaUpdateService.updateAvailable()).toBe(true);

            flush();
        }));
    });

    describe('Unrecoverable State', () => {
        it('should handle unrecoverable state with user confirmation', fakeAsync(() => {
            const unrecoverableSubject = swUpdateMock.unrecoverable as Subject<any>;
            const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
            const reloadSpy = spyOn(window.location, 'reload');

            // Trigger unrecoverable state
            unrecoverableSubject.next({ reason: 'Test error' });
            tick();

            expect(confirmSpy).toHaveBeenCalled();
            expect(reloadSpy).toHaveBeenCalled();

            flush();
        }));

        it('should handle unrecoverable state with user rejection', fakeAsync(() => {
            const unrecoverableSubject = swUpdateMock.unrecoverable as Subject<any>;
            const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
            const reloadSpy = spyOn(window.location, 'reload');

            // Trigger unrecoverable state
            unrecoverableSubject.next({ reason: 'Test error' });
            tick();

            expect(confirmSpy).toHaveBeenCalled();
            expect(reloadSpy).not.toHaveBeenCalled();

            flush();
        }));
    });
});
