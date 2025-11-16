import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
    private http = inject(HttpClient);

    getTranslation(lang: string): Observable<Translation> {
        console.log(`[TranslocoHttpLoader] Loading translation for language: ${lang}`);
        return this.http.get<Translation>(`assets/i18n/${lang}.json`).pipe(
            tap({
                next: () => {
                    console.log(`[TranslocoHttpLoader] Translation loaded successfully for: ${lang}`);
                    if (!navigator.onLine) {
                        console.log(`[TranslocoHttpLoader] ✓ Translation loaded from cache (offline mode)`);
                    }
                },
                error: (error) => {
                    console.error(`[TranslocoHttpLoader] Failed to load translation for ${lang}:`, error);
                }
            })
        );
    }
}
