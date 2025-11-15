import { ChangeDetectionStrategy, Component, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationScenario, Language, Sentence } from '../../models';
import { SessionStore } from '../../state/session.store';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-reading-mode',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './reading-mode.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadingModeComponent {
  scenario = input.required<ConversationScenario>();
  targetLang = input.required<Language | null>();
  store = inject(SessionStore);
  
  fontSize = this.store.readingFontSize;

  speak(text: string, langCode: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map to specific locales if necessary
    const localeMap: {[key: string]: string} = {
      'en': 'en-GB', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE',
      'it': 'it-IT', 'pt': 'pt-BR', 'ja': 'ja-JP', 'ko': 'ko-KR'
    };
    utterance.lang = localeMap[langCode] || langCode;
    
    window.speechSynthesis.speak(utterance);
  }

  getSentenceHtml(sentence: Sentence, side: 'source' | 'target'): string {
    const sentencePart = sentence[side];
    let text = this.escapeHtml(sentencePart.text);

    if (!sentencePart.highlighted_words || sentencePart.highlighted_words.length === 0) {
      return text;
    }

    // Sort words by length descending to match longer phrases first
    const sortedWords = [...sentencePart.highlighted_words].sort((a, b) => b.word.length - a.word.length);

    sortedWords.forEach(word => {
        const escapedWord = this.escapeHtml(word.word);
        const regex = new RegExp(`\\b${this.escapeRegex(escapedWord)}\\b`, 'g');
        text = text.replace(regex, (match) => {
            const tooltipId = `tooltip-${sentence.id}-${side}-${word.word.replace(/\s/g, '-')}`;
            const examplesHtml = word.examples.map(ex => `<li>${this.escapeHtml(ex)}</li>`).join('');
            
            return `
                <span class="group relative font-semibold cursor-pointer text-sky-600 dark:text-sky-400">
                    ${match}
                    <span id="${tooltipId}" role="tooltip" class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-900 text-slate-200 rounded-lg shadow-2xl p-4 z-20 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-slate-700">
                        <strong class="block text-lg font-bold text-white">${this.escapeHtml(word.word)}</strong>
                        <em class="text-base font-normal text-slate-300 not-italic">${this.escapeHtml(word.translation)}</em>
                        ${examplesHtml ? `<ul class="mt-3 list-disc list-inside text-sm text-slate-300 space-y-1.5">${examplesHtml}</ul>` : ''}
                        <span class="absolute left-1/2 -translate-x-1/2 bottom-[-8px] w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900"></span>
                    </span>
                </span>
            `;
        });
    });

    return text;
  }
  
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeHtml(str: string): string {
    return str
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }
}