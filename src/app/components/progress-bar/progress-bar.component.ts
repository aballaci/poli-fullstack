import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Step } from '../conversation-view/conversation-view.component';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.css']
})
export class ProgressBarComponent {
  @Input() steps: Step[] = [];
}
