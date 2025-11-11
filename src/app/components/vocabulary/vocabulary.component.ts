import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vocabulary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vocabulary.component.html',
})
export class VocabularyComponent {
  @Output() next = new EventEmitter<void>();
}
