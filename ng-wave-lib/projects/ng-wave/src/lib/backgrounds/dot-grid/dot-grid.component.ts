import {
  Component,
  input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  HostListener,
  computed,
  effect,
  Injector
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}

function throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
  let lastCall = 0;
  return ((...args: any[]) => {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func(...args);
    }
  }) as T;
}

interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _inertiaApplied: boolean;
}

@Component({
  selector: 'ngw-dot-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dot-grid.component.html',
  styleUrl: './dot-grid.component.css'
})
export class DotGridComponent implements AfterViewInit, OnDestroy {
  @ViewChild('wrapperRef', { static: false }) wrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasRef', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Use input() signals for reactive inputs
  dotSize = input(16);
  gap = input(32);
  baseColor = input('#5227FF');
  activeColor = input('#5227FF');
  proximity = input(150);
  speedTrigger = input(100);
  shockRadius = input(250);
  shockStrength = input(5);
  maxSpeed = input(5000);
  resistance = input(750);
  returnDuration = input(1.5);
  className = input('');
  style = input<Record<string, string>>({});

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private dots: Dot[] = [];
  private pointer = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0
  };
  private rafId?: number;
  private circlePath?: Path2D;
  private resizeObserver?: ResizeObserver;
  private throttledMove?: (e: MouseEvent) => void;
  private clickListener?: (e: MouseEvent) => void;
  private initialized = false;

  readonly baseRgb = computed(() => hexToRgb(this.baseColor()));
  readonly activeRgb = computed(() => hexToRgb(this.activeColor()));

  constructor() {
    // Watch all inputs for changes - rebuild grid when dotSize or gap changes
    effect(() => {
      if (!this.initialized) return;
      // Access signal inputs to track them
      const dotSize = this.dotSize();
      const gap = this.gap();
      if (isPlatformBrowser(this.platformId)) {
        this.buildGrid();
        if (typeof window !== 'undefined' && window.Path2D) {
          const p = new Path2D();
          p.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
          this.circlePath = p;
        }
      }
    }, { injector: this.injector });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.init();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  private init(): void {
    if (typeof window !== 'undefined' && window.Path2D) {
      const p = new Path2D();
      p.arc(0, 0, this.dotSize() / 2, 0, Math.PI * 2);
      this.circlePath = p;
    }
    this.buildGrid();
    this.setupResizeObserver();
    this.setupEventListeners();
    this.animate();
    this.initialized = true;
  }

  private buildGrid(): void {
    if (!this.wrapperRef?.nativeElement || !this.canvasRef?.nativeElement) {
      return;
    }
    const wrap = this.wrapperRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const currentGap = this.gap();
    const currentDotSize = this.dotSize();
    const cols = Math.floor((width + currentGap) / (currentDotSize + currentGap));
    const rows = Math.floor((height + currentGap) / (currentDotSize + currentGap));
    const cell = currentDotSize + currentGap;

    const gridW = cell * cols - currentGap;
    const gridH = cell * rows - currentGap;

    const extraX = width - gridW;
    const extraY = height - gridH;

    const startX = extraX / 2 + currentDotSize / 2;
    const startY = extraY / 2 + currentDotSize / 2;

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = startX + x * cell;
        const cy = startY + y * cell;
        dots.push({ cx, cy, xOffset: 0, yOffset: 0, _inertiaApplied: false });
      }
    }
    this.dots = dots;
  }

  private setupResizeObserver(): void {
    if ('ResizeObserver' in window && this.wrapperRef?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.buildGrid();
      });
      this.resizeObserver.observe(this.wrapperRef.nativeElement);
    } else {
      window.addEventListener('resize', () => this.buildGrid());
    }
  }

  private setupEventListeners(): void {
    this.throttledMove = throttle((e: MouseEvent) => {
      this.onMove(e);
    }, 50);
    window.addEventListener('mousemove', this.throttledMove, { passive: true });

    this.clickListener = (e: MouseEvent) => {
      this.onClick(e);
    };
    window.addEventListener('click', this.clickListener);
  }

  private onMove(e: MouseEvent): void {
    const now = performance.now();
    const pr = this.pointer;
    const dt = pr.lastTime ? now - pr.lastTime : 16;
    const dx = e.clientX - pr.lastX;
    const dy = e.clientY - pr.lastY;
    let vx = (dx / dt) * 1000;
    let vy = (dy / dt) * 1000;
    let speed = Math.hypot(vx, vy);
    const currentMaxSpeed = this.maxSpeed();
    if (speed > currentMaxSpeed) {
      const scale = currentMaxSpeed / speed;
      vx *= scale;
      vy *= scale;
      speed = currentMaxSpeed;
    }
    pr.lastTime = now;
    pr.lastX = e.clientX;
    pr.lastY = e.clientY;
    pr.vx = vx;
    pr.vy = vy;
    pr.speed = speed;

    if (!this.canvasRef?.nativeElement) {
      return;
    }
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    pr.x = e.clientX - rect.left;
    pr.y = e.clientY - rect.top;

    // Use current input values (reactive signals)
    const currentProximity = this.proximity();
    const currentSpeedTrigger = this.speedTrigger();
    for (const dot of this.dots) {
      const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
      if (speed > currentSpeedTrigger && dist < currentProximity && !dot._inertiaApplied) {
        dot._inertiaApplied = true;
        gsap.killTweensOf(dot);
        const pushX = dot.cx - pr.x + vx * 0.005;
        const pushY = dot.cy - pr.y + vy * 0.005;
        const resistance = this.resistance();
        const returnDuration = this.returnDuration();
        
        // Use fallback animation (InertiaPlugin is premium, so we use physics-like easing)
        const duration = Math.min(2, Math.max(0.3, Math.hypot(pushX, pushY) / resistance * 0.001));
        gsap.to(dot, {
          xOffset: pushX,
          yOffset: pushY,
          duration,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(dot, {
              xOffset: 0,
              yOffset: 0,
              duration: returnDuration,
              ease: 'elastic.out(1,0.75)'
            });
            dot._inertiaApplied = false;
          }
        });
      }
    }
  }

  private onClick(e: MouseEvent): void {
    if (!this.canvasRef?.nativeElement) {
      return;
    }
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const currentShockRadius = this.shockRadius();
    const currentShockStrength = this.shockStrength();
    for (const dot of this.dots) {
      const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
      if (dist < currentShockRadius && !dot._inertiaApplied) {
        dot._inertiaApplied = true;
        gsap.killTweensOf(dot);
        const falloff = Math.max(0, 1 - dist / currentShockRadius);
        const pushX = (dot.cx - cx) * currentShockStrength * falloff;
        const pushY = (dot.cy - cy) * currentShockStrength * falloff;
        const resistance = this.resistance();
        const returnDuration = this.returnDuration();
        
        // Use fallback animation (InertiaPlugin is premium, so we use physics-like easing)
        const duration = Math.min(2, Math.max(0.3, Math.hypot(pushX, pushY) / resistance * 0.001));
        gsap.to(dot, {
          xOffset: pushX,
          yOffset: pushY,
          duration,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(dot, {
              xOffset: 0,
              yOffset: 0,
              duration: returnDuration,
              ease: 'elastic.out(1,0.75)'
            });
            dot._inertiaApplied = false;
          }
        });
      }
    }
  }

  private animate = (): void => {
    if (!this.canvasRef?.nativeElement || !this.circlePath) {
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { x: px, y: py } = this.pointer;
    // Use current input values (reactive signals)
    const currentProximity = this.proximity();
    const proxSq = currentProximity * currentProximity;
    const baseRgb = this.baseRgb();
    const activeRgb = this.activeRgb();

    for (const dot of this.dots) {
      const ox = dot.cx + dot.xOffset;
      const oy = dot.cy + dot.yOffset;
      const dx = dot.cx - px;
      const dy = dot.cy - py;
      const dsq = dx * dx + dy * dy;

      let style = this.baseColor();
      if (dsq <= proxSq) {
        const dist = Math.sqrt(dsq);
        const t = 1 - dist / currentProximity;
        const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
        const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
        const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
        style = `rgb(${r},${g},${b})`;
      }

      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = style;
      ctx.fill(this.circlePath);
      ctx.restore();
    }

    this.rafId = requestAnimationFrame(this.animate);
  };

  private updateProximity(): void {
    // Proximity is used in animate loop, no need to rebuild
  }

  private cleanup(): void {
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.throttledMove) {
      window.removeEventListener('mousemove', this.throttledMove);
    }
    if (this.clickListener) {
      window.removeEventListener('click', this.clickListener);
    }
  }

  getSectionStyle(): Record<string, string> {
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      position: 'relative',
      ...this.style()
    };
  }
}

