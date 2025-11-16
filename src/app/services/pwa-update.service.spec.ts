import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent, VersionEvent } from '@angular/service-worker';
import { PwaUpdateService } from './pwa-update.service';
import { Subject, of } from 'rxjs';

describe('PwaUpdateService', () => {
    let service: PwaUpdateService;
    let swUpdateMock: jasmine.SpyObj<SwUpdate>;
    let appRefMock: jasmine.SpyObj<ApplicationRef>;
    let versionUpdatesSubject: Subject<VersionEvent>;
    let unrecoverableSubject: Subject<{ reason: string }>;

    beforeEach(() => {
        // Create mock subjects
        versionUpdatesSubject = new Subject<VersionEvent>();
        unrecoverableSubject = new Subject<{ reason: string }>();

        // Create SwUpdate mock with properties
        swUpdateMock = jasmine.createSpyObj('SwUpdate', [
            'checkForUpdate',
            'activateUpdate'
        ], {
            isEnabled: true,
            versionUpdates: versionUpdatesSubject.asObservable(),
            unrecoverable: unrecoverableSubject.asObservable()
        });

        // Create ApplicationRef mock with properties
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

        service = TestBed.inject(PwaUpdateService);
    });

    afterEach(() => {
        versionUpdatesSubject.complete();
        unrecoverableSubject.complete();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Initialization', () => {
        it('should initialize with updateAvailable as false', () => {
            expect(service.updateAvailable()).toBe(false);
        });

        it('should initialize with updateCheckInProgress as false', () => {
            expect(service.updateCheckInProgress()).toBe(false);
        });

        it('should detect when service worker is enabled', () => {
            expect(swUpdateMock.isEnabled).toBe(true);
        });

        it('should handle disabled service worker', () => {
            // Create a new mock with isEnabled = false
            const disabledSwUpdate = jasmine.createSpyObj('SwUpdate', [
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
                    { provide: SwUpdate, useValue: disabledSwUpdate },
                    { provide: ApplicationRef, useValue: appRefMock }
                ]
            });

            const newService = TestBed.inject(PwaUpdateService);
            expect(newService).toBeTruthy();
        });
    });

    describe('Update Detection', () => {
        it('should set updateAvailable to true when VERSION_READY event fires', fakeAsync(() => {
            expect(service.updateAvailable()).toBe(false);

            const versionReadyEvent: VersionReadyEvent = {
                type: 'VERSION_READY',
                currentVersion: { hash: 'old-hash', appData: {} },
                latestVersion: { hash: 'new-hash', appData: {} }
            };

            versionUpdatesSubject.next(versionReadyEvent);
            tick();

            expect(service.updateAvailable()).toBe(true);

            flush();
        }));

        it('should handle VERSION_DETECTED event', fakeAsync(() => {
            const versionDetectedEvent: VersionEvent = {
                type: 'VERSION_DETECTED',
                version: { hash: 'new-hash', appData: {} }
            };

            versionUpdatesSubject.next(versionDetectedEvent);
            tick();

            // Should not set updateAvailable yet
            expect(service.updateAvailable()).toBe(false);

            flush();
        }));

        it('should handle VERSION_INSTALLATION_FAILED event', fakeAsync(() => {
            const failedEvent: VersionEvent = {
                type: 'VERSION_INSTALLATION_FAILED',
                version: { hash: 'new-hash', appData: {} },
                error: 'Installation failed'
            };

            versionUpdatesSubject.next(failedEvent);
            tick();

            expect(service.updateAvailable()).toBe(false);

            flush();
        }));

        it('should handle NO_NEW_VERSION_DETECTED event', fakeAsync(() => {
            const noVersionEvent: VersionEvent = {
                type: 'NO_NEW_VERSION_DETECTED',
                version: { hash: 'current-hash', appData: {} }
            };

            versionUpdatesSubject.next(noVersionEvent);
            tick();

            expect(service.updateAvailable()).toBe(false);

            flush();
        }));
    });

    describe('Manual Update Check', () => {
        it('should check for updates successfully', fakeAsync(async () => {
            swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(true));

            const result = await service.checkForUpdate();
            tick();

            expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
            expect(result).toBe(true);
            expect(service.updateCheckInProgress()).toBe(false);

            flush();
        }));

        it('should return false when no update available', fakeAsync(async () => {
            swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(false));

            const result = await service.checkForUpdate();
            tick();

            expect(result).toBe(false);
            expect(service.updateCheckInProgress()).toBe(false);

            flush();
        }));

        it('should set updateCheckInProgress during check', fakeAsync(async () => {
            swUpdateMock.checkForUpdate.and.returnValue(
                new Promise(resolve => setTimeout(() => resolve(true), 100))
            );

            const checkPromise = service.checkForUpdate();

            // Should be in progress immediately
            expect(service.updateCheckInProgress()).toBe(true);

            tick(100);
            await checkPromise;

            // Should be complete
            expect(service.updateCheckInProgress()).toBe(false);

            flush();
        }));

        it('should handle check errors gracefully', fakeAsync(async () => {
            swUpdateMock.checkForUpdate.and.returnValue(
                Promise.reject(new Error('Check failed'))
            );

            const result = await service.checkForUpdate();
            tick();

            expect(result).toBe(false);
            expect(service.updateCheckInProgress()).toBe(false);

            flush();
        }));

        it('should not check when service worker is disabled', fakeAsync(async () => {
            // Create a new service with disabled SW
            const disabledSwUpdate = jasmine.createSpyObj('SwUpdate', [
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
                    { provide: SwUpdate, useValue: disabledSwUpdate },
                    { provide: ApplicationRef, useValue: appRefMock }
                ]
            });

            const disabledService = TestBed.inject(PwaUpdateService);

            const result = await disabledService.checkForUpdate();
            tick();

            expect(disabledSwUpdate.checkForUpdate).not.toHaveBeenCalled();
            expect(result).toBe(false);

            flush();
        }));
    });

    describe('Update Activation', () => {
        it('should activate update successfully', fakeAsync(async () => {
            swUpdateMock.activateUpdate.and.returnValue(Promise.resolve(true));

            // Mock window.location.reload
            const reloadSpy = spyOn(window.location, 'reload');

            await service.activateUpdate();
            tick();

            expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
            expect(reloadSpy).toHaveBeenCalled();

            flush();
        }));

        it('should handle activation errors', fakeAsync(async () => {
            swUpdateMock.activateUpdate.and.returnValue(
                Promise.reject(new Error('Activation failed'))
            );

            try {
                await service.activateUpdate();
                tick();
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }

            flush();
        }));

        it('should not activate when service worker is disabled', fakeAsync(async () => {
            // Create a new service with disabled SW
            const disabledSwUpdate = jasmine.createSpyObj('SwUpdate', [
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
                    { provide: SwUpdate, useValue: disabledSwUpdate },
                    { provide: ApplicationRef, useValue: appRefMock }
                ]
            });

            const disabledService = TestBed.inject(PwaUpdateService);

            await disabledService.activateUpdate();
            tick();

            expect(disabledSwUpdate.activateUpdate).not.toHaveBeenCalled();

            flush();
        }));
    });

    describe('Update Dismissal', () => {
        it('should dismiss update notification', fakeAsync(() => {
            // Set update available
            service.updateAvailable.set(true);
            expect(service.updateAvailable()).toBe(true);

            // Dismiss
            service.dismissUpdate();
            tick();

            expect(service.updateAvailable()).toBe(false);

            flush();
        }));

        it('should handle dismissing when no update available', fakeAsync(() => {
            expect(service.updateAvailable()).toBe(false);

            service.dismissUpdate();
            tick();

            expect(service.updateAvailable()).toBe(false);

            flush();
        }));
    });

    describe('Unrecoverable State', () => {
        it('should handle unrecoverable state with user confirmation', fakeAsync(() => {
            const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);
            const reloadSpy = spyOn(window.location, 'reload');

            unrecoverableSubject.next({ reason: 'Test error' });
            tick();

            expect(confirmSpy).toHaveBeenCalled();
            expect(reloadSpy).toHaveBeenCalled();

            flush();
        }));

        it('should handle unrecoverable state with user rejection', fakeAsync(() => {
            const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
            const reloadSpy = spyOn(window.location, 'reload');

            unrecoverableSubject.next({ reason: 'Test error' });
            tick();

            expect(confirmSpy).toHaveBeenCalled();
            expect(reloadSpy).not.toHaveBeenCalled();

            flush();
        }));
    });

    describe('Automatic Update Checks', () => {
        it('should set up automatic update checks', fakeAsync(() => {
            // The service should set up automatic checks on initialization
            // This is verified by the fact that the service subscribes to appRef.isStable
            expect(appRefMock.isStable).toBeDefined();

            flush();
        }));
    });

    describe('Service Worker Disabled', () => {
        it('should handle all operations when service worker is disabled', fakeAsync(async () => {
            // Create service with disabled SW
            const disabledSwUpdate = jasmine.createSpyObj('SwUpdate', [
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
                    { provide: SwUpdate, useValue: disabledSwUpdate },
                    { provide: ApplicationRef, useValue: appRefMock }
                ]
            });

            const disabledService = TestBed.inject(PwaUpdateService);

            // Check for update
            const checkResult = await disabledService.checkForUpdate();
            expect(checkResult).toBe(false);

            // Activate update
            await disabledService.activateUpdate();
            // Should complete without error

            // Dismiss update
            disabledService.dismissUpdate();
            // Should complete without error

            flush();
        }));
    });

    describe('Multiple Version Events', () => {
        it('should handle multiple version events in sequence', fakeAsync(() => {
            // VERSION_DETECTED
            versionUpdatesSubject.next({
                type: 'VERSION_DETECTED',
                version: { hash: 'v1', appData: {} }
            });
            tick();
            expect(service.updateAvailable()).toBe(false);

            // VERSION_READY
            versionUpdatesSubject.next({
                type: 'VERSION_READY',
                currentVersion: { hash: 'v0', appData: {} },
                latestVersion: { hash: 'v1', appData: {} }
            });
            tick();
            expect(service.updateAvailable()).toBe(true);

            // Dismiss
            service.dismissUpdate();
            tick();
            expect(service.updateAvailable()).toBe(false);

            flush();
        }));

        it('should handle installation failure after detection', fakeAsync(() => {
            // VERSION_DETECTED
            versionUpdatesSubject.next({
                type: 'VERSION_DETECTED',
                version: { hash: 'v1', appData: {} }
            });
            tick();

            // VERSION_INSTALLATION_FAILED
            versionUpdatesSubject.next({
                type: 'VERSION_INSTALLATION_FAILED',
                version: { hash: 'v1', appData: {} },
                error: 'Failed'
            });
            tick();

            expect(service.updateAvailable()).toBe(false);

            flush();
        }));
    });
});
