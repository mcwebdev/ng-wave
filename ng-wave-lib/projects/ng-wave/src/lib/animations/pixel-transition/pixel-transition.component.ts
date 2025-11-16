import { Component, input, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, inject, effect, EffectRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'ngw-pixel-transition',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pixel-transition.component.html',
  styleUrl: './pixel-transition.component.css'
})
export class PixelTransitionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;
  @ViewChild('pixelGrid', { static: false }) pixelGridRef!: ElementRef<HTMLElement>;
  @ViewChild('active', { static: false }) activeRef!: ElementRef<HTMLElement>;

  // Content projection handled via ng-content in template
  readonly gridSize = input<number>(7);
  readonly pixelColor = input<string>('currentColor');
  readonly animationStepDuration = input<number>(0.3);
  readonly once = input<boolean>(false);
  readonly aspectRatio = input<string>('100%');
  readonly className = input<string>('');
  readonly style = input<Record<string, string>>({});

  private readonly platformId = inject(PLATFORM_ID);
  isActive = false;
  private delayedCall: gsap.core.Tween | null = null;
  readonly isTouchDevice: boolean = false;
  private effectCleanup: EffectRef | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.isTouchDevice =
        'ontouchstart' in window ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        window.matchMedia('(pointer: coarse)').matches;

      const cleanup = effect(() => {
        this.gridSize();
        this.pixelColor();
        if (this.pixelGridRef?.nativeElement) {
          this.createPixelGrid();
        }
      });
      this.effectCleanup = cleanup;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.createPixelGrid();
    }
  }

  private createPixelGrid(): void {
    if (!this.pixelGridRef?.nativeElement || !isPlatformBrowser(this.platformId)) return;

    const pixelGridEl = this.pixelGridRef.nativeElement;
    pixelGridEl.innerHTML = '';

    const gridSize = this.gridSize();
    const pixelColor = this.pixelColor();

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const pixel = document.createElement('div');
        pixel.classList.add('pixelated-image-card__pixel');
        pixel.style.backgroundColor = pixelColor;

        const size = 100 / gridSize;
        pixel.style.width = `${size}%`;
        pixel.style.height = `${size}%`;
        pixel.style.left = `${col * size}%`;
        pixel.style.top = `${row * size}%`;
        pixelGridEl.appendChild(pixel);
      }
    }
  }

  private animatePixels(activate: boolean): void {
    this.isActive = activate;

    const pixelGridEl = this.pixelGridRef?.nativeElement;
    const activeEl = this.activeRef?.nativeElement;
    if (!pixelGridEl || !activeEl) return;

    const pixels = pixelGridEl.querySelectorAll<HTMLElement>('.pixelated-image-card__pixel');
    if (!pixels.length) return;

    gsap.killTweensOf(pixels);
    if (this.delayedCall) {
      this.delayedCall.kill();
    }

    gsap.set(pixels, { display: 'none' });

    const totalPixels = pixels.length;
    const staggerDuration = this.animationStepDuration() / totalPixels;

    gsap.to(pixels, {
      display: 'block',
      duration: 0,
      stagger: {
        each: staggerDuration,
        from: 'random'
      }
    });

    this.delayedCall = gsap.delayedCall(this.animationStepDuration(), () => {
      if (activeEl) {
        activeEl.style.display = activate ? 'block' : 'none';
        activeEl.style.pointerEvents = activate ? 'none' : '';
      }
    });

    gsap.to(pixels, {
      display: 'none',
      duration: 0,
      delay: this.animationStepDuration(),
      stagger: {
        each: staggerDuration,
        from: 'random'
      }
    });
  }

  handleEnter(): void {
    if (!this.isActive) {
      this.animatePixels(true);
    }
  }

  handleLeave(): void {
    if (this.isActive && !this.once()) {
      this.animatePixels(false);
    }
  }

  handleClick(): void {
    if (!this.isActive) {
      this.animatePixels(true);
    } else if (this.isActive && !this.once()) {
      this.animatePixels(false);
    }
  }

  ngOnDestroy(): void {
    if (this.effectCleanup) {
      this.effectCleanup.destroy();
    }
    if (this.delayedCall) {
      this.delayedCall.kill();
    }
  }
}

