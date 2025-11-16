import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
  HostListener,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'ngw-magnet',
  standalone: true,
  imports: [],
  templateUrl: './magnet.component.html',
  styleUrl: './magnet.component.css'
})
export class MagnetComponent implements AfterViewInit, OnDestroy {
  @ViewChild('magnet', { static: false }) magnetRef!: ElementRef<HTMLDivElement>;

  @Input() padding = 100;
  @Input() disabled = false;
  @Input() magnetStrength = 2;
  @Input() activeTransition = 'transform 0.3s ease-out';
  @Input() inactiveTransition = 'transform 0.5s ease-in-out';
  @Input() wrapperClassName = '';
  @Input() innerClassName = '';

  private readonly platformId = inject(PLATFORM_ID);
  readonly isActive = signal(false);
  readonly position = signal({ x: 0, y: 0 });

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
  }

  ngOnDestroy(): void {
    // HostListener cleanup is automatic
  }

  @HostListener('window:mousemove', ['$event'])
  handleMouseMove(event: MouseEvent): void {
    if (this.disabled || !isPlatformBrowser(this.platformId) || !this.magnetRef?.nativeElement) {
      return;
    }

    const rect = this.magnetRef.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distX = Math.abs(centerX - event.clientX);
    const distY = Math.abs(centerY - event.clientY);

    if (distX < rect.width / 2 + this.padding && distY < rect.height / 2 + this.padding) {
      this.isActive.set(true);

      const offsetX = (event.clientX - centerX) / this.magnetStrength;
      const offsetY = (event.clientY - centerY) / this.magnetStrength;
      this.position.set({ x: offsetX, y: offsetY });
    } else {
      this.isActive.set(false);
      this.position.set({ x: 0, y: 0 });
    }
  }

  readonly transitionStyle = signal(this.inactiveTransition);

  constructor() {
    // Update transition when active state changes
    if (isPlatformBrowser(this.platformId)) {
      // Use effect would be better but keeping it simple
    }
  }

  getTransition(): string {
    return this.isActive() ? this.activeTransition : this.inactiveTransition;
  }

  getTransform(): string {
    const pos = this.position();
    return `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  }
}

