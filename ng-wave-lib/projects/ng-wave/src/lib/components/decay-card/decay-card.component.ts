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
import gsap from 'gsap';

interface CursorPosition {
  x: number;
  y: number;
}

interface WindowSize {
  width: number;
  height: number;
}

interface ImageTransforms {
  x: number;
  y: number;
  rz: number;
}

interface ImageValues {
  imgTransforms: ImageTransforms;
  displacementScale: number;
}

@Component({
  selector: 'ngw-decay-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './decay-card.component.html',
  styleUrl: './decay-card.component.css'
})
export class DecayCardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('svgContainer', { static: false }) svgContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('displacementMap', { static: false }) displacementMapRef!: ElementRef<SVGFEDisplacementMapElement>;

  @Input() width = 300;
  @Input() height = 400;
  @Input() image = 'https://picsum.photos/300/400?grayscale';
  @Input() imageAlt = 'Decay card image';

  private readonly platformId = inject(PLATFORM_ID);
  private cursor: CursorPosition = { x: 0, y: 0 };
  private cachedCursor: CursorPosition = { x: 0, y: 0 };
  private winsize: WindowSize = { width: 0, height: 0 };
  private imgValues: ImageValues = {
    imgTransforms: { x: 0, y: 0, rz: 0 },
    displacementScale: 0
  };
  private animationFrameId: number | null = null;
  private resizeListener: (() => void) | null = null;
  private mouseMoveListener: ((event: MouseEvent) => void) | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initializeWindowSize();
    this.setupEventListeners();
    this.startAnimation();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeWindowSize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.winsize = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    this.cursor = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };
    this.cachedCursor = { ...this.cursor };
  }

  private setupEventListeners(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.resizeListener = () => {
      this.winsize = {
        width: window.innerWidth,
        height: window.innerHeight
      };
    };

    this.mouseMoveListener = (event: MouseEvent) => {
      this.cursor = {
        x: event.clientX,
        y: event.clientY
      };
    };

    window.addEventListener('resize', this.resizeListener);
    window.addEventListener('mousemove', this.mouseMoveListener);
  }

  private lerp(a: number, b: number, n: number): number {
    return (1 - n) * a + n * b;
  }

  private map(x: number, a: number, b: number, c: number, d: number): number {
    return ((x - a) * (d - c)) / (b - a) + c;
  }

  private distance(x1: number, x2: number, y1: number, y2: number): number {
    const a = x1 - x2;
    const b = y1 - y2;
    return Math.hypot(a, b);
  }

  private render(): void {
    if (!isPlatformBrowser(this.platformId) || !this.svgContainerRef?.nativeElement) {
      return;
    }

    let targetX = this.lerp(
      this.imgValues.imgTransforms.x,
      this.map(this.cursor.x, 0, this.winsize.width, -120, 120),
      0.1
    );
    let targetY = this.lerp(
      this.imgValues.imgTransforms.y,
      this.map(this.cursor.y, 0, this.winsize.height, -120, 120),
      0.1
    );
    let targetRz = this.lerp(
      this.imgValues.imgTransforms.rz,
      this.map(this.cursor.x, 0, this.winsize.width, -10, 10),
      0.1
    );

    const bound = 50;

    if (targetX > bound) targetX = bound + (targetX - bound) * 0.2;
    if (targetX < -bound) targetX = -bound + (targetX + bound) * 0.2;
    if (targetY > bound) targetY = bound + (targetY - bound) * 0.2;
    if (targetY < -bound) targetY = -bound + (targetY + bound) * 0.2;

    this.imgValues.imgTransforms.x = targetX;
    this.imgValues.imgTransforms.y = targetY;
    this.imgValues.imgTransforms.rz = targetRz;

    if (this.svgContainerRef.nativeElement) {
      gsap.set(this.svgContainerRef.nativeElement, {
        x: this.imgValues.imgTransforms.x,
        y: this.imgValues.imgTransforms.y,
        rotateZ: this.imgValues.imgTransforms.rz
      });
    }

    const cursorTravelledDistance = this.distance(
      this.cachedCursor.x,
      this.cursor.x,
      this.cachedCursor.y,
      this.cursor.y
    );
    this.imgValues.displacementScale = this.lerp(
      this.imgValues.displacementScale,
      this.map(cursorTravelledDistance, 0, 200, 0, 400),
      0.06
    );

    if (this.displacementMapRef?.nativeElement) {
      gsap.set(this.displacementMapRef.nativeElement, {
        attr: { scale: this.imgValues.displacementScale }
      });
    }

    this.cachedCursor = { ...this.cursor };

    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  private startAnimation(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.animationFrameId = requestAnimationFrame(() => this.render());
  }

  private cleanup(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }

    if (this.mouseMoveListener) {
      window.removeEventListener('mousemove', this.mouseMoveListener);
      this.mouseMoveListener = null;
    }
  }
}

