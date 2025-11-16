import { Component, input, computed, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, inject, effect, EffectRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

@Component({
  selector: 'ngw-sticker-peel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sticker-peel.component.html',
  styleUrl: './sticker-peel.component.css'
})
export class StickerPeelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dragTarget', { static: false }) dragTargetRef!: ElementRef<HTMLElement>;
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;
  @ViewChild('pointLight', { static: false }) pointLightRef!: ElementRef<SVGElement>;
  @ViewChild('pointLightFlipped', { static: false }) pointLightFlippedRef!: ElementRef<SVGElement>;

  readonly imageSrc = input.required<string>();
  readonly rotate = input<number>(30);
  readonly peelBackHoverPct = input<number>(30);
  readonly peelBackActivePct = input<number>(40);
  readonly peelEasing = input<string>('power3.out');
  readonly peelHoverEasing = input<string>('power2.out');
  readonly width = input<number>(200);
  readonly shadowIntensity = input<number>(0.6);
  readonly lightingIntensity = input<number>(0.1);
  readonly initialPosition = input<'center' | { x: number; y: number }>('center');
  readonly peelDirection = input<number>(0);
  readonly className = input<string>('');

  private readonly platformId = inject(PLATFORM_ID);
  private draggableInstance: Draggable | null = null;
  private effectCleanup: EffectRef | null = null;
  private defaultPadding = 10;

  readonly cssVars = computed(() => ({
    '--sticker-rotate': `${this.rotate()}deg`,
    '--sticker-p': `${this.defaultPadding}px`,
    '--sticker-peelback-hover': `${this.peelBackHoverPct()}%`,
    '--sticker-peelback-active': `${this.peelBackActivePct()}%`,
    '--sticker-peel-easing': this.peelEasing(),
    '--sticker-peel-hover-easing': this.peelHoverEasing(),
    '--sticker-width': `${this.width()}px`,
    '--sticker-shadow-opacity': this.shadowIntensity(),
    '--sticker-lighting-constant': this.lightingIntensity(),
    '--peel-direction': `${this.peelDirection()}deg`
  }));

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const cleanup = effect(() => {
        this.lightingIntensity();
        this.shadowIntensity();
        this.updateFilters();
      });
      this.effectCleanup = cleanup;
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.setInitialPosition();
    this.setupDraggable();
    this.setupLightTracking();
    this.setupTouchHandlers();
  }

  private setInitialPosition(): void {
    const target = this.dragTargetRef?.nativeElement;
    if (!target) return;

    const initialPos = this.initialPosition();
    if (initialPos === 'center') return;

    if (typeof initialPos === 'object' && initialPos.x !== undefined && initialPos.y !== undefined) {
      gsap.set(target, { x: initialPos.x, y: initialPos.y });
    }
  }

  private setupDraggable(): void {
    const target = this.dragTargetRef?.nativeElement;
    if (!target) return;

    const boundsEl = target.parentNode as HTMLElement;
    if (!boundsEl) return;

    this.draggableInstance = Draggable.create(target, {
      type: 'x,y',
      bounds: boundsEl,
      inertia: true,
      onDrag: () => {
        const rot = gsap.utils.clamp(-24, 24, (this.draggableInstance as any).deltaX * 0.4);
        gsap.to(target, { rotation: rot, duration: 0.15, ease: 'power1.out' });
      },
      onDragEnd: () => {
        gsap.to(target, { rotation: 0, duration: 0.8, ease: 'power2.out' });
      }
    })[0];

    const handleResize = () => {
      if (this.draggableInstance) {
        this.draggableInstance.update();

        const currentX = gsap.getProperty(target, 'x') as number;
        const currentY = gsap.getProperty(target, 'y') as number;

        const boundsRect = boundsEl.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const maxX = boundsRect.width - targetRect.width;
        const maxY = boundsRect.height - targetRect.height;

        const newX = Math.max(0, Math.min(currentX, maxX));
        const newY = Math.max(0, Math.min(currentY, maxY));

        if (newX !== currentX || newY !== currentY) {
          gsap.to(target, {
            x: newX,
            y: newY,
            duration: 0.3,
            ease: 'power2.out'
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
  }

  private setupLightTracking(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) return;

    const updateLight = (e: MouseEvent) => {
      const container = this.containerRef?.nativeElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.pointLightRef?.nativeElement) {
        gsap.set(this.pointLightRef.nativeElement, { attr: { x, y } });
      }

      const normalizedAngle = Math.abs(this.peelDirection() % 360);
      if (normalizedAngle !== 180 && this.pointLightFlippedRef?.nativeElement) {
        gsap.set(this.pointLightFlippedRef.nativeElement, { attr: { x, y: rect.height - y } });
      } else if (this.pointLightFlippedRef?.nativeElement) {
        gsap.set(this.pointLightFlippedRef.nativeElement, { attr: { x: -1000, y: -1000 } });
      }
    };

    const container = this.containerRef.nativeElement;
    if (container) {
      container.addEventListener('mousemove', updateLight);
    }
  }

  private setupTouchHandlers(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) return;

    const container = this.containerRef.nativeElement;

    const handleTouchStart = () => {
      container.classList.add('touch-active');
    };

    const handleTouchEnd = () => {
      container.classList.remove('touch-active');
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);
  }

  private updateFilters(): void {
    // Filters are updated via CSS variables, this is a placeholder for any JS updates needed
  }

  ngOnDestroy(): void {
    if (this.draggableInstance) {
      this.draggableInstance.kill();
    }
    if (this.effectCleanup) {
      this.effectCleanup.destroy();
    }
  }
}

