import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { LanguageService } from '../../services/language.service';

@Component({
    selector: 'app-language-switcher',
    standalone: true,
    imports: [CommonModule, TranslocoModule],
    templateUrl: './language-switcher.component.html',
    styleUrl: './language-switcher.component.css'
})
export class LanguageSwitcherComponent {
    languageService = inject(LanguageService);

    isOpen = signal(false);

    currentLanguageFlag = computed(() => {
        return this.languageService.getLanguageFlag(this.languageService.uiLanguage());
    });

    currentLanguageName = computed(() => {
        return this.languageService.getLanguageDisplayName(this.languageService.uiLanguage());
    });

    get availableLanguages() {
        return this.languageService.availableUiLanguages;
    }

    selectLanguage(code: string): void {
        this.languageService.changeLanguage(code);
        this.isOpen.set(false);
    }

    toggleDropdown(): void {
        this.isOpen.update(v => !v);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const clickedInside = target.closest('.language-switcher');
        if (!clickedInside && this.isOpen()) {
            this.isOpen.set(false);
        }
    }
}
