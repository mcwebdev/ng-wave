import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  HostListener,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'ngw-spotlight-card',
  standalone: true,
  imports: [],
  templateUrl: './spotlight-card.component.html',
  styleUrl: './spotlight-card.component.css'
})
export class SpotlightCardComponent {
  @ViewChild('card', { static: false }) cardRef!: ElementRef<HTMLDivElement>;

  @Input() className = '';
  @Input() spotlightColor = 'rgba(255, 255, 255, 0.25)';

  private readonly platformId = inject(PLATFORM_ID);

  @HostListener('mousemove', ['$event'])
  handleMouseMove(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.cardRef?.nativeElement) {
      return;
    }

    const rect = this.cardRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.cardRef.nativeElement.style.setProperty('--mouse-x', `${x}px`);
    this.cardRef.nativeElement.style.setProperty('--mouse-y', `${y}px`);
    this.cardRef.nativeElement.style.setProperty('--spotlight-color', this.spotlightColor);
  }
}

