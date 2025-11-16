import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ngw-glare-hover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './glare-hover.component.html',
  styleUrl: './glare-hover.component.css'
})
export class GlareHoverComponent {
  @Input() width = '500px';
  @Input() height = '500px';
  @Input() background = '#000';
  @Input() borderRadius = '10px';
  @Input() borderColor = '#333';
  @Input() glareColor = '#ffffff';
  @Input() glareOpacity = 0.5;
  @Input() glareAngle = -45;
  @Input() glareSize = 250;
  @Input() transitionDuration = 650;
  @Input() playOnce = false;
  @Input() className = '';
  @Input() style: Record<string, string> = {};

  readonly cssVars = computed(() => {
    const hex = this.glareColor.replace('#', '');
    let rgba = this.glareColor;
    
    if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      rgba = `rgba(${r}, ${g}, ${b}, ${this.glareOpacity})`;
    } else if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      rgba = `rgba(${r}, ${g}, ${b}, ${this.glareOpacity})`;
    }

    return {
      '--gh-width': this.width,
      '--gh-height': this.height,
      '--gh-bg': this.background,
      '--gh-br': this.borderRadius,
      '--gh-angle': `${this.glareAngle}deg`,
      '--gh-duration': `${this.transitionDuration}ms`,
      '--gh-size': `${this.glareSize}%`,
      '--gh-rgba': rgba,
      '--gh-border': this.borderColor
    };
  });

  readonly mergedStyles = computed(() => {
    return { ...this.cssVars(), ...this.style };
  });
}

