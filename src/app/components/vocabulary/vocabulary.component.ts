import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-vocabulary',
  standalone: true,
    imports: [CommonModule, TranslocoModule],
  templateUrl: './vocabulary.component.html',
})
export class VocabularyComponent {
  @Output() next = new EventEmitter<void>();
}
