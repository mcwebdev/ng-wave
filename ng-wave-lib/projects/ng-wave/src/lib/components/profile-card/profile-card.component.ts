import {
  Component,
  Input,
  Output,
  EventEmitter,
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

const DEFAULT_INNER_GRADIENT = 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)';

const ANIMATION_CONFIG = {
  INITIAL_DURATION: 1200,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
  DEVICE_BETA_OFFSET: 20,
  ENTER_TRANSITION_MS: 180
};

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(Math.max(v, min), max);
}

function round(v: number, precision = 3): number {
  return parseFloat(v.toFixed(precision));
}

function adjust(v: number, fMin: number, fMax: number, tMin: number, tMax: number): number {
  return round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));
}

interface TiltEngine {
  setImmediate(x: number, y: number): void;
  setTarget(x: number, y: number): void;
  toCenter(): void;
  beginInitial(durationMs: number): void;
  getCurrent(): { x: number; y: number; tx: number; ty: number };
  cancel(): void;
}

@Component({
  selector: 'ngw-profile-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-card.component.html',
  styleUrl: './profile-card.component.css'
})
export class ProfileCardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('wrapRef', { static: false }) wrapRef!: ElementRef<HTMLElement>;
  @ViewChild('shellRef', { static: false }) shellRef!: ElementRef<HTMLElement>;

  @Input() avatarUrl = '<Placeholder for avatar URL>';
  @Input() iconUrl = '<Placeholder for icon URL>';
  @Input() grainUrl = '<Placeholder for grain URL>';
  @Input() innerGradient = DEFAULT_INNER_GRADIENT;
  @Input() behindGlowEnabled = true;
  @Input() behindGlowColor?: string;
  @Input() behindGlowSize?: string;
  @Input() className = '';
  @Input() enableTilt = true;
  @Input() enableMobileTilt = false;
  @Input() mobileTiltSensitivity = 5;
  @Input() miniAvatarUrl?: string;
  @Input() name = 'Javi A. Torres';
  @Input() title = 'Software Engineer';
  @Input() handle = 'javicodes';
  @Input() status = 'Online';
  @Input() contactText = 'Contact';
  @Input() showUserInfo = true;

  @Output() contactClick = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private tiltEngine: TiltEngine | null = null;
  private enterTimerRef?: number;
  private leaveRafRef?: number;
  private deviceOrientationHandler?: (event: DeviceOrientationEvent) => void;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.enableTilt) {
      return;
    }

    this.initTiltEngine();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.enterTimerRef) {
      window.clearTimeout(this.enterTimerRef);
    }
    if (this.leaveRafRef) {
      cancelAnimationFrame(this.leaveRafRef);
    }
    if (this.deviceOrientationHandler) {
      window.removeEventListener('deviceorientation', this.deviceOrientationHandler);
    }
    this.tiltEngine?.cancel();
  }

  private initTiltEngine(): TiltEngine | null {
    if (!this.enableTilt) return null;

    const shellRef = this.shellRef;
    const wrapRef = this.wrapRef;

    let rafId: number | null = null;
    let running = false;
    let lastTs = 0;

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.6;
    let initialUntil = 0;

    const setVarsFromXY = (x: number, y: number): void => {
      const shell = shellRef?.nativeElement;
      const wrap = wrapRef?.nativeElement;
      if (!shell || !wrap) return;

      const width = shell.clientWidth || 1;
      const height = shell.clientHeight || 1;

      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const properties: Record<string, string> = {
        '--pointer-x': `${percentX}%`,
        '--pointer-y': `${percentY}%`,
        '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerX / 5))}deg`,
        '--rotate-y': `${round(centerY / 4)}deg`
      };

      for (const [k, v] of Object.entries(properties)) {
        wrap.style.setProperty(k, v);
      }
    };

    const step = (ts: number): void => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);

      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;

      setVarsFromXY(currentX, currentY);

      const stillFar = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = (): void => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x: number, y: number): void {
        currentX = x;
        currentY = y;
        setVarsFromXY(currentX, currentY);
      },
      setTarget(x: number, y: number): void {
        targetX = x;
        targetY = y;
        start();
      },
      toCenter: (): void => {
        const shell = shellRef?.nativeElement;
        if (!shell) return;
        targetX = shell.clientWidth / 2;
        targetY = shell.clientHeight / 2;
        start();
      },
      beginInitial(durationMs: number): void {
        initialUntil = performance.now() + durationMs;
        start();
      },
      getCurrent(): { x: number; y: number; tx: number; ty: number } {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel(): void {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
      }
    };
  }

  private setupEventListeners(): void {
    if (!this.enableTilt || !this.tiltEngine) return;

    const shell = this.shellRef?.nativeElement;
    if (!shell) return;

    const handlePointerMove = (event: PointerEvent): void => {
      if (!this.tiltEngine) return;
      const rect = shell.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.tiltEngine.setTarget(x, y);
    };

    const handlePointerEnter = (event: PointerEvent): void => {
      if (!this.tiltEngine) return;

      shell.classList.add('active');
      shell.classList.add('entering');
      if (this.enterTimerRef) window.clearTimeout(this.enterTimerRef);
      this.enterTimerRef = window.setTimeout(() => {
        shell.classList.remove('entering');
      }, ANIMATION_CONFIG.ENTER_TRANSITION_MS);

      const rect = shell.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      this.tiltEngine.setTarget(x, y);
    };

    const handlePointerLeave = (): void => {
      if (!this.tiltEngine) return;

      this.tiltEngine.toCenter();

      const checkSettle = (): void => {
        const { x, y, tx, ty } = this.tiltEngine!.getCurrent();
        const settled = Math.hypot(tx - x, ty - y) < 0.6;
        if (settled) {
          shell.classList.remove('active');
          this.leaveRafRef = undefined;
        } else {
          this.leaveRafRef = requestAnimationFrame(checkSettle);
        }
      };
      if (this.leaveRafRef) cancelAnimationFrame(this.leaveRafRef);
      this.leaveRafRef = requestAnimationFrame(checkSettle);
    };

    this.deviceOrientationHandler = (event: DeviceOrientationEvent): void => {
      if (!this.tiltEngine) return;

      const { beta, gamma } = event;
      if (beta == null || gamma == null) return;

      const centerX = shell.clientWidth / 2;
      const centerY = shell.clientHeight / 2;
      const x = clamp(centerX + gamma * this.mobileTiltSensitivity, 0, shell.clientWidth);
      const y = clamp(
        centerY + (beta - ANIMATION_CONFIG.DEVICE_BETA_OFFSET) * this.mobileTiltSensitivity,
        0,
        shell.clientHeight
      );

      this.tiltEngine.setTarget(x, y);
    };

    shell.addEventListener('pointerenter', handlePointerEnter);
    shell.addEventListener('pointermove', handlePointerMove);
    shell.addEventListener('pointerleave', handlePointerLeave);

    const handleClick = (): void => {
      if (!this.enableMobileTilt || location.protocol !== 'https:') return;
      const anyMotion = (window as any).DeviceMotionEvent;
      if (anyMotion && typeof anyMotion.requestPermission === 'function') {
        anyMotion
          .requestPermission()
          .then((state: string) => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', this.deviceOrientationHandler!);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', this.deviceOrientationHandler!);
      }
    };
    shell.addEventListener('click', handleClick);

    const initialX = (shell.clientWidth || 0) - ANIMATION_CONFIG.INITIAL_X_OFFSET;
    const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET;
    this.tiltEngine.setImmediate(initialX, initialY);
    this.tiltEngine.toCenter();
    this.tiltEngine.beginInitial(ANIMATION_CONFIG.INITIAL_DURATION);
  }

  getCardStyle(): Record<string, string> {
    return {
      '--icon': this.iconUrl ? `url(${this.iconUrl})` : 'none',
      '--grain': this.grainUrl ? `url(${this.grainUrl})` : 'none',
      '--inner-gradient': this.innerGradient ?? DEFAULT_INNER_GRADIENT,
      '--behind-glow-color': this.behindGlowColor ?? 'rgba(125, 190, 255, 0.67)',
      '--behind-glow-size': this.behindGlowSize ?? '50%'
    };
  }

  onContactClick(): void {
    this.contactClick.emit();
  }

  onAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
  }

  onMiniAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.style.opacity = '0.5';
    target.src = this.avatarUrl;
  }
}

