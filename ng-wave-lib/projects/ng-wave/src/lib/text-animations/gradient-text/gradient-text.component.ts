import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ngw-gradient-text',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gradient-text.component.html',
  styleUrl: './gradient-text.component.css'
})
export class GradientTextComponent {
  @Input() className = '';
  @Input() colors: string[] = ['#40ffaa', '#4079ff', '#40ffaa', '#4079ff', '#40ffaa'];
  @Input() animationSpeed = 8;
  @Input() showBorder = false;

  readonly gradientStyle = computed(() => {
    return {
      backgroundImage: `linear-gradient(to right, ${this.colors.join(', ')})`,
      animationDuration: `${this.animationSpeed}s`
    };
  });
}

