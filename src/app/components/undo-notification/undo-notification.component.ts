import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';
import { LanguageService } from '../../services/language.service';

@Component({
    selector: 'app-undo-notification',
    standalone: true,
    imports: [CommonModule, TranslocoModule],
    templateUrl: './undo-notification.component.html',
    styleUrl: './undo-notification.component.css'
})
export class UndoNotificationComponent {
    languageService = inject(LanguageService);

    undo(): void {
        this.languageService.undoLanguageChange();
    }
}
