import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  computed,
  signal,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'ngw-curved-loop',
  standalone: true,
  imports: [],
  templateUrl: './curved-loop.component.html',
  styleUrl: './curved-loop.component.css'
})
export class CurvedLoopComponent implements AfterViewInit, OnDestroy {
  @ViewChild('measure', { static: false }) measureRef!: ElementRef<SVGTextElement>;
  @ViewChild('textPath', { static: false }) textPathRef!: ElementRef<SVGTextPathElement>;
  @ViewChild('path', { static: false }) pathRef!: ElementRef<SVGPathElement>;

  @Input() marqueeText = '';
  @Input() speed = 2;
  @Input() className = '';
  @Input() curveAmount = 400;
  @Input() direction: 'left' | 'right' = 'left';
  @Input() interactive = true;

  private readonly platformId = inject(PLATFORM_ID);
  readonly spacing = signal(0);
  readonly offset = signal(0);
  private animationId?: number;
  private isDragging = false;
  private lastX = 0;
  private currentDirection: 'left' | 'right' = 'left';
  private velocity = 0;
  readonly pathId = `curve-${Math.random().toString(36).substr(2, 9)}`;

  readonly text = computed(() => {
    const hasTrailing = /\s|\u00A0$/.test(this.marqueeText);
    return (hasTrailing ? this.marqueeText.replace(/\s+$/, '') : this.marqueeText) + '\u00A0';
  });

  readonly pathD = computed(() => `M-100,40 Q500,${40 + this.curveAmount} 1540,40`);

  readonly totalText = computed(() => {
    const textLength = this.spacing();
    return textLength
      ? Array(Math.ceil(1800 / textLength) + 2)
          .fill(this.text())
          .join('')
      : this.text();
  });

  readonly ready = computed(() => this.spacing() > 0);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.measureText();
    this.startAnimation();
  }

  ngOnDestroy(): void {
    if (this.animationId !== undefined) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private measureText(): void {
    if (!isPlatformBrowser(this.platformId) || !this.measureRef?.nativeElement) {
      return;
    }

    const length = this.measureRef.nativeElement.getComputedTextLength();
    this.spacing.set(length);

    if (this.textPathRef?.nativeElement) {
      const initial = -length;
      this.textPathRef.nativeElement.setAttribute('startOffset', `${initial}px`);
      this.offset.set(initial);
    }
  }

  private startAnimation(): void {
    if (!isPlatformBrowser(this.platformId) || !this.ready()) {
      return;
    }

    const step = () => {
      if (!this.isDragging && this.textPathRef?.nativeElement) {
        const delta = this.currentDirection === 'right' ? this.speed : -this.speed;
        const currentOffset = parseFloat(this.textPathRef.nativeElement.getAttribute('startOffset') || '0');
        let newOffset = currentOffset + delta;

        const wrapPoint = this.spacing();
        if (newOffset <= -wrapPoint) newOffset += wrapPoint;
        if (newOffset > 0) newOffset -= wrapPoint;

        this.textPathRef.nativeElement.setAttribute('startOffset', `${newOffset}px`);
        this.offset.set(newOffset);
      }
      this.animationId = requestAnimationFrame(step);
    };

    this.animationId = requestAnimationFrame(step);
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.interactive || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.isDragging = true;
    this.lastX = event.clientX;
    this.velocity = 0;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.interactive || !this.isDragging || !this.textPathRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const dx = event.clientX - this.lastX;
    this.lastX = event.clientX;
    this.velocity = dx;

    const currentOffset = parseFloat(this.textPathRef.nativeElement.getAttribute('startOffset') || '0');
    let newOffset = currentOffset + dx;

    const wrapPoint = this.spacing();
    if (newOffset <= -wrapPoint) newOffset += wrapPoint;
    if (newOffset > 0) newOffset -= wrapPoint;

    this.textPathRef.nativeElement.setAttribute('startOffset', `${newOffset}px`);
    this.offset.set(newOffset);
  }

  onPointerUp(): void {
    this.endDrag();
  }

  onPointerLeave(): void {
    this.endDrag();
  }

  private endDrag(): void {
    if (!this.interactive) {
      return;
    }
    this.isDragging = false;
    this.currentDirection = this.velocity > 0 ? 'right' : 'left';
  }

  getCursorStyle(): string {
    return this.interactive ? (this.isDragging ? 'grabbing' : 'grab') : 'auto';
  }
}

