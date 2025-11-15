// FIX: Convert to standalone component with an inline template.
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Language } from '../../models';
import { LanguageService } from '../../services/language.service';
import { SessionStore } from '../../state/session.store';

@Component({
  selector: 'app-language-wizard',
  templateUrl: './language-wizard.component.html',
  styleUrl: './language-wizard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, TranslocoModule]
})
export class LanguageWizardComponent implements OnInit {
  languageService = inject(LanguageService);
  store = inject(SessionStore);
  router = inject(Router);
  route = inject(ActivatedRoute);

  step = signal<'source' | 'target' | 'difficulty'>('source');

  ngOnInit(): void {
    // Check for target language in query params
    this.route.queryParams.subscribe(params => {
      const targetCode = params['target'];
      if (targetCode) {
        // Map some language codes that might not match exactly
        const codeMap: { [key: string]: string } = {
          'jp': 'ja', // Japanese might be 'ja' in the service
          'cn': 'zh', // Chinese might be 'zh' in the service
          'sa': 'ar'  // Arabic might be 'ar' in the service
        };
        const mappedCode = codeMap[targetCode] || targetCode;
        const targetLang = this.languageService.availableLanguages.find(l => l.code === mappedCode);

        if (targetLang) {
          // Set a default source language (English) if not set
          const defaultSource = this.languageService.availableLanguages.find(l => l.code === 'en');
          if (defaultSource && !this.store.sourceLanguage()) {
            this.store.setSourceLanguage(defaultSource);
          }
          // Set the target language and move to difficulty step
          this.store.setTargetLanguage(targetLang);
          this.step.set('difficulty');
        }
      }
    });
  }

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

  getLevelName(level: string): string {
    const levelMap: { [key: string]: string } = {
      'A1': 'wizard.level_a1',
      'A2': 'wizard.level_a2',
      'B1': 'wizard.level_b1',
      'B2': 'wizard.level_b2',
      'C1': 'wizard.level_c1',
      'C2': 'wizard.level_c2'
    };
    return levelMap[level] || level;
  }
}