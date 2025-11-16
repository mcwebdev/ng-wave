import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GlassIconItem {
  label: string;
  color?: string;
  icon: string;
  customClass?: string;
}

@Component({
  selector: 'ngw-glass-icons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './glass-icons.component.html',
  styleUrl: './glass-icons.component.css'
})
export class GlassIconsComponent {
  @Input() items: GlassIconItem[] = [];
  @Input() className = '';

  private readonly gradientMapping: Record<string, string> = {
    blue: 'linear-gradient(hsl(223, 90%, 50%), hsl(208, 90%, 50%))',
    purple: 'linear-gradient(hsl(283, 90%, 50%), hsl(268, 90%, 50%))',
    red: 'linear-gradient(hsl(3, 90%, 50%), hsl(348, 90%, 50%))',
    indigo: 'linear-gradient(hsl(253, 90%, 50%), hsl(238, 90%, 50%))',
    orange: 'linear-gradient(hsl(43, 90%, 50%), hsl(28, 90%, 50%))',
    green: 'linear-gradient(hsl(123, 90%, 40%), hsl(108, 90%, 40%))'
  };

  getBackgroundStyle(color?: string): Record<string, string> {
    if (!color) {
      return {};
    }

    if (this.gradientMapping[color]) {
      return { background: this.gradientMapping[color] };
    }

    return { background: color };
  }
}

