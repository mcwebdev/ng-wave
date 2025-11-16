import { Component, input, signal, computed, effect, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, inject, EffectRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

const ANIMATION_CONFIG = { SMOOTH_TAU: 0.25, MIN_COPIES: 2, COPY_HEADROOM: 2 };

function toCssLength(value: number | string | undefined): string | undefined {
  return typeof value === 'number' ? `${value}px` : (value ?? undefined);
}

export interface LogoItem {
  src?: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  alt?: string;
  title?: string;
  href?: string;
  ariaLabel?: string;
  node?: any;
}

@Component({
  selector: 'ngw-logo-loop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logo-loop.component.html',
  styleUrl: './logo-loop.component.css'
})
export class LogoLoopComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;
  @ViewChild('track', { static: false }) trackRef!: ElementRef<HTMLElement>;
  @ViewChild('seq', { static: false }) seqRef!: ElementRef<HTMLElement>;

  readonly logos = input<LogoItem[]>([]);
  readonly speed = input<number>(120);
  readonly direction = input<'left' | 'right' | 'up' | 'down'>('left');
  readonly width = input<number | string>('100%');
  readonly logoHeight = input<number>(28);
  readonly gap = input<number>(32);
  readonly pauseOnHover = input<boolean | undefined>(undefined);
  readonly hoverSpeed = input<number | undefined>(undefined);
  readonly fadeOut = input<boolean>(false);
  readonly fadeOutColor = input<string | undefined>(undefined);
  readonly scaleOnHover = input<boolean>(false);
  readonly ariaLabel = input<string>('Partner logos');
  readonly className = input<string>('');
  readonly style = input<Record<string, string>>({});

  private readonly platformId = inject(PLATFORM_ID);
  private seqWidth = signal(0);
  private seqHeight = signal(0);
  private copyCount = signal(ANIMATION_CONFIG.MIN_COPIES);
  private isHovered = signal(false);
  
  getCopyArray(): number[] {
    return Array.from({ length: this.copyCount() }, (_, i) => i);
  }
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private offset = 0;
  private velocity = 0;
  private resizeObserver: ResizeObserver | null = null;
  private resizeHandler: (() => void) | null = null;
  private effectCleanup: EffectRef | null = null;

  readonly effectiveHoverSpeed = computed(() => {
    const hoverSpeed = this.hoverSpeed();
    if (hoverSpeed !== undefined) return hoverSpeed;
    const pauseOnHover = this.pauseOnHover();
    if (pauseOnHover === true) return 0;
    if (pauseOnHover === false) return undefined;
    return 0;
  });

  readonly isVertical = computed(() => {
    const dir = this.direction();
    return dir === 'up' || dir === 'down';
  });

  readonly targetVelocity = computed(() => {
    const speed = this.speed();
    const direction = this.direction();
    const isVertical = this.isVertical();
    const magnitude = Math.abs(speed);
    let directionMultiplier: number;
    if (isVertical) {
      directionMultiplier = direction === 'up' ? 1 : -1;
    } else {
      directionMultiplier = direction === 'left' ? 1 : -1;
    }
    const speedMultiplier = speed < 0 ? -1 : 1;
    return magnitude * directionMultiplier * speedMultiplier;
  });

  readonly cssVariables = computed(() => {
    const gap = this.gap();
    const logoHeight = this.logoHeight();
    const fadeOutColor = this.fadeOutColor();
    return {
      '--logoloop-gap': `${gap}px`,
      '--logoloop-logoHeight': `${logoHeight}px`,
      ...(fadeOutColor && { '--logoloop-fadeColor': fadeOutColor })
    };
  });

  readonly rootClassName = computed(() => {
    const isVertical = this.isVertical();
    const fadeOut = this.fadeOut();
    const scaleOnHover = this.scaleOnHover();
    const className = this.className();
    return [
      'logoloop',
      isVertical ? 'logoloop--vertical' : 'logoloop--horizontal',
      fadeOut && 'logoloop--fade',
      scaleOnHover && 'logoloop--scale-hover',
      className
    ]
      .filter(Boolean)
      .join(' ');
  });

  readonly containerStyle = computed(() => {
    const width = this.width();
    const isVertical = this.isVertical();
    const cssVars = this.cssVariables();
    const style = this.style();
    return {
      width: isVertical
        ? toCssLength(width) === '100%'
          ? undefined
          : toCssLength(width)
        : (toCssLength(width) ?? '100%'),
      ...cssVars,
      ...style
    };
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const cleanup = effect(() => {
        this.logos();
        this.gap();
        this.logoHeight();
        this.isVertical();
        if (this.containerRef?.nativeElement && this.seqRef?.nativeElement) {
          this.updateDimensions();
        }
      });
      this.effectCleanup = cleanup;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupResizeObserver();
      this.setupImageLoader();
      this.startAnimation();
    }
  }

  private setupResizeObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (!window.ResizeObserver) {
      this.resizeHandler = () => this.updateDimensions();
      window.addEventListener('resize', this.resizeHandler);
      this.updateDimensions();
      return;
    }

    const elements = [this.containerRef?.nativeElement, this.seqRef?.nativeElement].filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;

    this.resizeObserver = new ResizeObserver(() => this.updateDimensions());
    elements.forEach(el => this.resizeObserver?.observe(el));
    this.updateDimensions();
  }

  private setupImageLoader(): void {
    if (!isPlatformBrowser(this.platformId) || !this.seqRef?.nativeElement) return;

    const images = this.seqRef.nativeElement.querySelectorAll('img');
    if (images.length === 0) {
      this.updateDimensions();
      return;
    }

    let remainingImages = images.length;
    const handleImageLoad = () => {
      remainingImages -= 1;
      if (remainingImages === 0) this.updateDimensions();
    };

    images.forEach(img => {
      if (img.complete) {
        handleImageLoad();
      } else {
        img.addEventListener('load', handleImageLoad, { once: true });
        img.addEventListener('error', handleImageLoad, { once: true });
      }
    });
  }

  private updateDimensions(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement || !this.seqRef?.nativeElement) return;

    const containerWidth = this.containerRef.nativeElement.clientWidth;
    const sequenceRect = this.seqRef.nativeElement.getBoundingClientRect();
    const sequenceWidth = sequenceRect.width;
    const sequenceHeight = sequenceRect.height;
    const isVertical = this.isVertical();

    if (isVertical) {
      const parentHeight = this.containerRef.nativeElement.parentElement?.clientHeight ?? 0;
      if (this.containerRef.nativeElement && parentHeight > 0) {
        const targetHeight = Math.ceil(parentHeight);
        if (this.containerRef.nativeElement.style.height !== `${targetHeight}px`) {
          this.containerRef.nativeElement.style.height = `${targetHeight}px`;
        }
      }
      if (sequenceHeight > 0) {
        this.seqHeight.set(Math.ceil(sequenceHeight));
        const viewport = this.containerRef.nativeElement.clientHeight ?? parentHeight ?? sequenceHeight;
        const copiesNeeded = Math.ceil(viewport / sequenceHeight) + ANIMATION_CONFIG.COPY_HEADROOM;
        this.copyCount.set(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
      }
    } else if (sequenceWidth > 0) {
      this.seqWidth.set(Math.ceil(sequenceWidth));
      const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM;
      this.copyCount.set(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
    }
  }

  private startAnimation(): void {
    if (!isPlatformBrowser(this.platformId) || !this.trackRef?.nativeElement) return;

    const animate = (timestamp: number) => {
      if (this.lastTimestamp === null) {
        this.lastTimestamp = timestamp;
      }

      const deltaTime = Math.max(0, timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      const target = this.isHovered() && this.effectiveHoverSpeed() !== undefined
        ? this.effectiveHoverSpeed()!
        : this.targetVelocity();

      const easingFactor = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
      this.velocity += (target - this.velocity) * easingFactor;

      const seqSize = this.isVertical() ? this.seqHeight() : this.seqWidth();
      if (seqSize > 0) {
        let nextOffset = this.offset + this.velocity * deltaTime;
        nextOffset = ((nextOffset % seqSize) + seqSize) % seqSize;
        this.offset = nextOffset;

        const transformValue = this.isVertical()
          ? `translate3d(0, ${-this.offset}px, 0)`
          : `translate3d(${-this.offset}px, 0, 0)`;
        if (this.trackRef?.nativeElement) {
          this.trackRef.nativeElement.style.transform = transformValue;
        }
      }

      this.rafId = requestAnimationFrame(animate);
    };

    const seqSize = this.isVertical() ? this.seqHeight() : this.seqWidth();
    if (seqSize > 0) {
      this.offset = ((this.offset % seqSize) + seqSize) % seqSize;
      const transformValue = this.isVertical()
        ? `translate3d(0, ${-this.offset}px, 0)`
        : `translate3d(${-this.offset}px, 0, 0)`;
      if (this.trackRef?.nativeElement) {
        this.trackRef.nativeElement.style.transform = transformValue;
      }
    }

    this.rafId = requestAnimationFrame(animate);
  }

  handleMouseEnter(): void {
    if (this.effectiveHoverSpeed() !== undefined) {
      this.isHovered.set(true);
    }
  }

  handleMouseLeave(): void {
    if (this.effectiveHoverSpeed() !== undefined) {
      this.isHovered.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.effectCleanup) {
      this.effectCleanup.destroy();
    }
  }
}

