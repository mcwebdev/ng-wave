import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ngw-star-border',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-border.component.html',
  styleUrl: './star-border.component.css'
})
export class StarBorderComponent {
  @Input() tag: 'button' | 'div' | 'span' | 'a' = 'button';
  @Input() className = '';
  @Input() color = 'white';
  @Input() speed = '6s';
  @Input() thickness = 1;
  @Input() style: Record<string, string> = {};

  readonly containerStyle = computed(() => ({
    padding: `${this.thickness}px 0`,
    ...this.style
  }));

  readonly gradientStyle = computed(() => ({
    background: `radial-gradient(circle, ${this.color}, transparent 10%)`,
    animationDuration: this.speed
  }));
}

