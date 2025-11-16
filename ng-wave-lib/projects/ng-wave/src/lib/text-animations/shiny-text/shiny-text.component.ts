import { Component, Input, computed } from '@angular/core';

@Component({
  selector: 'ngw-shiny-text',
  standalone: true,
  imports: [],
  templateUrl: './shiny-text.component.html',
  styleUrl: './shiny-text.component.css'
})
export class ShinyTextComponent {
  @Input() text = '';
  @Input() disabled = false;
  @Input() speed = 5;
  @Input() className = '';

  readonly animationDuration = computed(() => `${this.speed}s`);
}

