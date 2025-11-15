import { provideTransloco, TranslocoModule } from '@jsverse/transloco';
import { isDevMode } from '@angular/core';
import { TranslocoHttpLoader } from './transloco-loader';

export const translocoConfig = provideTransloco({
    config: {
        availableLangs: ['en', 'it', 'de', 'fr', 'es', 'pt', 'ja'],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: {
            useFallbackTranslation: true,
            logMissingKey: true
        }
    },
    loader: TranslocoHttpLoader
});

export { TranslocoModule };
