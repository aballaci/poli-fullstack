// FIX: Convert to standalone component with an inline template.
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Language } from '../../models';
import { LanguageService } from '../../services/language.service';
import { SessionStore } from '../../state/session.store';

@Component({
  selector: 'app-language-wizard',
  templateUrl: './language-wizard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class LanguageWizardComponent {
  languageService = inject(LanguageService);
  store = inject(SessionStore);
  router = inject(Router);

  step = signal<'source' | 'target' | 'difficulty'>('source');

  selectSourceLanguage(lang: Language): void {
    this.store.setSourceLanguage(lang);
    this.step.set('target');
  }

  selectTargetLanguage(lang: Language): void {
    if (this.store.sourceLanguage()?.code === lang.code) {
      // Cannot select same language
      return;
    }
    this.store.setTargetLanguage(lang);
    this.step.set('difficulty');
  }

  selectDifficulty(level: string): void {
    this.store.setDifficulty(level);
    this.router.navigate(['/selector']);
  }
  
  get availableTargetLanguages(): Language[] {
    const sourceCode = this.store.sourceLanguage()?.code;
    return this.languageService.availableLanguages.filter(l => l.code !== sourceCode);
  }
}