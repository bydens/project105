import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreviewSection } from '../../core/models/ui.model';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview.component.html',
})
export class PreviewComponent {
  @Input() previewSections: PreviewSection[] = [];
  @Input() systemId = '';
}
