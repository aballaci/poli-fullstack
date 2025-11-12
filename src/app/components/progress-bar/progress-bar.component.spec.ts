import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ProgressBarComponent } from './progress-bar.component';

describe('ProgressBarComponent', () => {
    let component: ProgressBarComponent;
    let fixture: ComponentFixture<ProgressBarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ProgressBarComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(ProgressBarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Step Circle Backgrounds', () => {
        it('should have white background for upcoming steps', () => {
            component.currentStep = 'Reading';
            fixture.detectChanges();

            const upcomingSteps = fixture.debugElement.queryAll(
                By.css('.bg-white')
            );

            expect(upcomingSteps.length).toBeGreaterThan(0);

            upcomingSteps.forEach((step: DebugElement) => {
                const classes = step.nativeElement.className;
                expect(classes).toContain('bg-white');
                expect(classes).not.toContain('dark:bg-slate-700');
                expect(classes).not.toContain('dark:bg-slate-800');
            });
        });

        it('should have gradient background for active step', () => {
            component.currentStep = 'Vocabulary';
            fixture.detectChanges();

            const activeStep = fixture.debugElement.query(
                By.css('.bg-gradient-to-br.from-primary-600')
            );

            expect(activeStep).toBeTruthy();
            const classes = activeStep.nativeElement.className;
            expect(classes).toContain('bg-gradient-to-br');
            expect(classes).toContain('from-primary-600');
            expect(classes).toContain('via-lilac-600');
            expect(classes).toContain('to-primary-700');
        });

        it('should have emerald gradient for completed steps', () => {
            component.currentStep = 'Practice';
            fixture.detectChanges();

            const completedSteps = fixture.debugElement.queryAll(
                By.css('.bg-gradient-to-br.from-emerald-500')
            );

            expect(completedSteps.length).toBeGreaterThan(0);

            completedSteps.forEach((step: DebugElement) => {
                const classes = step.nativeElement.className;
                expect(classes).toContain('from-emerald-500');
                expect(classes).toContain('to-emerald-600');
            });
        });

        it('should not have any dark mode background classes', () => {
            component.currentStep = 'Exercises';
            fixture.detectChanges();

            const allStepCircles = fixture.debugElement.queryAll(
                By.css('.rounded-full.w-12')
            );

            allStepCircles.forEach((circle: DebugElement) => {
                const classes = circle.nativeElement.className;
                expect(classes).not.toContain('dark:bg-slate-700');
                expect(classes).not.toContain('dark:bg-slate-800');
            });
        });
    });
});
