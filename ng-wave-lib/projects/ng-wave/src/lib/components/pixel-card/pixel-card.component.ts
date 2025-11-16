import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostListener,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

interface PixelConfig {
  activeColor: string | null;
  gap: number;
  speed: number;
  colors: string;
  noFocus: boolean;
}

interface Pixel {
  width: number;
  height: number;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  speed: number;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSizeInteger: number;
  maxSize: number;
  delay: number;
  counter: number;
  counterStep: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;
  draw(): void;
  appear(): void;
  disappear(): void;
  shimmer(): void;
  getRandomValue(min: number, max: number): number;
}

class PixelImpl implements Pixel {
  width: number;
  height: number;
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string;
  speed: number;
  size: number;
  sizeStep: number;
  minSize: number;
  maxSizeInteger: number;
  maxSize: number;
  delay: number;
  counter: number;
  counterStep: number;
  isIdle: boolean;
  isReverse: boolean;
  isShimmer: boolean;

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, x: number, y: number, color: string, speed: number, delay: number) {
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = context;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = this.getRandomValue(0.1, 0.9) * speed;
    this.size = 0;
    this.sizeStep = Math.random() * 0.4;
    this.minSize = 0.5;
    this.maxSizeInteger = 2;
    this.maxSize = this.getRandomValue(this.minSize, this.maxSizeInteger);
    this.delay = delay;
    this.counter = 0;
    this.counterStep = Math.random() * 4 + (this.width + this.height) * 0.01;
    this.isIdle = false;
    this.isReverse = false;
    this.isShimmer = false;
  }

  getRandomValue(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  draw(): void {
    const centerOffset = this.maxSizeInteger * 0.5 - this.size * 0.5;
    this.ctx.fillStyle = this.color;
    this.ctx.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size);
  }

  appear(): void {
    this.isIdle = false;
    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }
    if (this.size >= this.maxSize) {
      this.isShimmer = true;
    }
    if (this.isShimmer) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }
    this.draw();
  }

  disappear(): void {
    this.isShimmer = false;
    this.counter = 0;
    if (this.size <= 0) {
      this.isIdle = true;
      return;
    } else {
      this.size -= 0.1;
    }
    this.draw();
  }

  shimmer(): void {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= this.minSize) {
      this.isReverse = false;
    }
    if (this.isReverse) {
      this.size -= this.speed;
    } else {
      this.size += this.speed;
    }
  }
}

const VARIANTS: Record<string, PixelConfig> = {
  default: {
    activeColor: null,
    gap: 5,
    speed: 35,
    colors: '#f8fafc,#f1f5f9,#cbd5e1',
    noFocus: false
  },
  blue: {
    activeColor: '#e0f2fe',
    gap: 10,
    speed: 25,
    colors: '#e0f2fe,#7dd3fc,#0ea5e9',
    noFocus: false
  },
  yellow: {
    activeColor: '#fef08a',
    gap: 3,
    speed: 20,
    colors: '#fef08a,#fde047,#eab308',
    noFocus: false
  },
  pink: {
    activeColor: '#fecdd3',
    gap: 6,
    speed: 80,
    colors: '#fecdd3,#fda4af,#e11d48',
    noFocus: true
  }
};

function getEffectiveSpeed(value: number, reducedMotion: boolean): number {
  const min = 0;
  const max = 100;
  const throttle = 0.001;
  const parsed = parseInt(String(value), 10);

  if (parsed <= min || reducedMotion) {
    return min;
  } else if (parsed >= max) {
    return max * throttle;
  } else {
    return parsed * throttle;
  }
}

@Component({
  selector: 'ngw-pixel-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pixel-card.component.html',
  styleUrl: './pixel-card.component.css'
})
export class PixelCardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() variant: 'default' | 'blue' | 'yellow' | 'pink' = 'default';
  @Input() gap?: number;
  @Input() speed?: number;
  @Input() colors?: string;
  @Input() noFocus?: boolean;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private pixels: PixelImpl[] = [];
  private animationFrameId: number | null = null;
  private timePrevious = performance.now();
  private reducedMotion = false;
  private resizeObserver: ResizeObserver | null = null;
  private currentAnimationFn: 'appear' | 'disappear' | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.initPixels();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver?.disconnect();
  }

  private getVariantConfig(): PixelConfig {
    const variantCfg = VARIANTS[this.variant] || VARIANTS['default'];
    return {
      gap: this.gap ?? variantCfg.gap,
      speed: this.speed ?? variantCfg.speed,
      colors: this.colors ?? variantCfg.colors,
      noFocus: this.noFocus ?? variantCfg.noFocus,
      activeColor: variantCfg.activeColor
    };
  }

  private initPixels(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement || !this.canvasRef?.nativeElement) {
      return;
    }

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    const ctx = this.canvasRef.nativeElement.getContext('2d');

    if (!ctx) return;

    this.canvasRef.nativeElement.width = width;
    this.canvasRef.nativeElement.height = height;
    this.canvasRef.nativeElement.style.width = `${width}px`;
    this.canvasRef.nativeElement.style.height = `${height}px`;

    const config = this.getVariantConfig();
    const colorsArray = config.colors.split(',');
    const pxs: PixelImpl[] = [];

    for (let x = 0; x < width; x += parseInt(String(config.gap), 10)) {
      for (let y = 0; y < height; y += parseInt(String(config.gap), 10)) {
        const color = colorsArray[Math.floor(Math.random() * colorsArray.length)];
        const dx = x - width / 2;
        const dy = y - height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = this.reducedMotion ? 0 : distance;

        pxs.push(
          new PixelImpl(
            this.canvasRef.nativeElement,
            ctx,
            x,
            y,
            color,
            getEffectiveSpeed(config.speed, this.reducedMotion),
            delay
          )
        );
      }
    }

    this.pixels = pxs;
  }

  private setupResizeObserver(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.initPixels();
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private doAnimate(fnName: 'appear' | 'disappear'): void {
    if (!isPlatformBrowser(this.platformId) || !this.canvasRef?.nativeElement) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => this.doAnimate(fnName));
    const timeNow = performance.now();
    const timePassed = timeNow - this.timePrevious;
    const timeInterval = 1000 / 60;

    if (timePassed < timeInterval) return;
    this.timePrevious = timeNow - (timePassed % timeInterval);

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

    let allIdle = true;
    for (let i = 0; i < this.pixels.length; i++) {
      const pixel = this.pixels[i];
      pixel[fnName]();
      if (!pixel.isIdle) {
        allIdle = false;
      }
    }

    if (allIdle) {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  }

  private handleAnimation(name: 'appear' | 'disappear'): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.currentAnimationFn = name;
    this.animationFrameId = requestAnimationFrame(() => this.doAnimate(name));
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.handleAnimation('appear');
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.handleAnimation('disappear');
  }

  @HostListener('focus', ['$event'])
  onFocus(event: FocusEvent): void {
    const config = this.getVariantConfig();
    if (!config.noFocus) {
      const target = event.currentTarget as HTMLElement;
      if (!target.contains(event.relatedTarget as Node)) {
        this.handleAnimation('appear');
      }
    }
  }

  @HostListener('blur', ['$event'])
  onBlur(event: FocusEvent): void {
    const config = this.getVariantConfig();
    if (!config.noFocus) {
      const target = event.currentTarget as HTMLElement;
      if (!target.contains(event.relatedTarget as Node)) {
        this.handleAnimation('disappear');
      }
    }
  }

  getTabIndex(): number {
    const config = this.getVariantConfig();
    return config.noFocus ? -1 : 0;
  }
}

