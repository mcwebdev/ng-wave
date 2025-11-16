import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  computed
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'ngw-target-cursor',
  standalone: true,
  imports: [],
  templateUrl: './target-cursor.component.html',
  styleUrl: './target-cursor.component.css'
})
export class TargetCursorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cursor', { static: false }) cursorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('dot', { static: false }) dotRef!: ElementRef<HTMLDivElement>;

  @Input() targetSelector = '.cursor-target';
  @Input() spinDuration = 2;
  @Input() hideDefaultCursor = true;
  @Input() hoverDuration = 0.2;
  @Input() parallaxOn = true;

  private readonly platformId = inject(PLATFORM_ID);
  private cornersRef?: NodeListOf<HTMLElement>;
  private spinTl?: gsap.core.Timeline;
  private isActive = false;
  private targetCornerPositions: Array<{ x: number; y: number }> | null = null;
  private activeStrength = { current: 0 };
  private tickerFn?: () => void;
  private activeTarget: HTMLElement | null = null;
  private currentLeaveHandler: (() => void) | null = null;
  private resumeTimeout?: number;
  private originalCursor = '';

  readonly isMobile = computed(() => {
    if (!isPlatformBrowser(this.platformId)) return false;
    const hasTouchScreen = 'ontouchstart' in window || (navigator as any).maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const userAgent = navigator.userAgent || (navigator as any).vendor || (window as any).opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
    return (hasTouchScreen && isSmallScreen) || isMobileUserAgent;
  });

  readonly constants = {
    borderWidth: 3,
    cornerSize: 12
  };

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || this.isMobile()) {
      return;
    }
    this.initCursor();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  private initCursor(): void {
    if (!this.cursorRef?.nativeElement) {
      return;
    }

    this.originalCursor = document.body.style.cursor;
    if (this.hideDefaultCursor) {
      document.body.style.cursor = 'none';
    }

    const cursor = this.cursorRef.nativeElement;
    this.cornersRef = cursor.querySelectorAll('.target-cursor-corner') as NodeListOf<HTMLElement>;

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    });

    this.createSpinTimeline();

    this.tickerFn = () => {
      if (!this.targetCornerPositions || !this.cursorRef?.nativeElement || !this.cornersRef) {
        return;
      }

      const strength = this.activeStrength.current;
      if (strength === 0) return;

      const cursorX = gsap.getProperty(this.cursorRef.nativeElement, 'x') as number;
      const cursorY = gsap.getProperty(this.cursorRef.nativeElement, 'y') as number;

      const corners = Array.from(this.cornersRef);
      corners.forEach((corner, i) => {
        const currentX = gsap.getProperty(corner, 'x') as number;
        const currentY = gsap.getProperty(corner, 'y') as number;

        const targetX = this.targetCornerPositions![i].x - cursorX;
        const targetY = this.targetCornerPositions![i].y - cursorY;

        const finalX = currentX + (targetX - currentX) * strength;
        const finalY = currentY + (targetY - currentY) * strength;

        const duration = strength >= 0.99 ? (this.parallaxOn ? 0.2 : 0) : 0.05;

        gsap.to(corner, {
          x: finalX,
          y: finalY,
          duration: duration,
          ease: duration === 0 ? 'none' : 'power1.out',
          overwrite: 'auto'
        });
      });
    };

    const moveHandler = (e: MouseEvent) => this.moveCursor(e.clientX, e.clientY);
    window.addEventListener('mousemove', moveHandler);

    const scrollHandler = () => {
      if (!this.activeTarget || !this.cursorRef?.nativeElement) return;
      const mouseX = gsap.getProperty(this.cursorRef.nativeElement, 'x') as number;
      const mouseY = gsap.getProperty(this.cursorRef.nativeElement, 'y') as number;
      const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
      const isStillOverTarget =
        elementUnderMouse &&
        (elementUnderMouse === this.activeTarget || elementUnderMouse?.closest(this.targetSelector) === this.activeTarget);
      if (!isStillOverTarget && this.currentLeaveHandler) {
        this.currentLeaveHandler();
      }
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    const mouseDownHandler = () => {
      if (!this.dotRef?.nativeElement || !this.cursorRef?.nativeElement) return;
      gsap.to(this.dotRef.nativeElement, { scale: 0.7, duration: 0.3 });
      gsap.to(this.cursorRef.nativeElement, { scale: 0.9, duration: 0.2 });
    };

    const mouseUpHandler = () => {
      if (!this.dotRef?.nativeElement || !this.cursorRef?.nativeElement) return;
      gsap.to(this.dotRef.nativeElement, { scale: 1, duration: 0.3 });
      gsap.to(this.cursorRef.nativeElement, { scale: 1, duration: 0.2 });
    };

    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('mouseup', mouseUpHandler);

    const enterHandler = (e: MouseEvent) => {
      const directTarget = e.target as HTMLElement;
      const allTargets: HTMLElement[] = [];
      let current: HTMLElement | null = directTarget;
      while (current && current !== document.body) {
        if (current.matches(this.targetSelector)) {
          allTargets.push(current);
        }
        current = current.parentElement;
      }
      const target = allTargets[0] || null;
      if (!target || !this.cursorRef?.nativeElement || !this.cornersRef) return;
      if (this.activeTarget === target) return;
      if (this.activeTarget) {
        this.cleanupTarget(this.activeTarget);
      }
      if (this.resumeTimeout) {
        clearTimeout(this.resumeTimeout);
        this.resumeTimeout = undefined;
      }

      this.activeTarget = target;
      const corners = Array.from(this.cornersRef);
      corners.forEach(corner => gsap.killTweensOf(corner));

      gsap.killTweensOf(this.cursorRef.nativeElement, 'rotation');
      this.spinTl?.pause();
      gsap.set(this.cursorRef.nativeElement, { rotation: 0 });

      const rect = target.getBoundingClientRect();
      const { borderWidth, cornerSize } = this.constants;
      const cursorX = gsap.getProperty(this.cursorRef.nativeElement, 'x') as number;
      const cursorY = gsap.getProperty(this.cursorRef.nativeElement, 'y') as number;

      this.targetCornerPositions = [
        { x: rect.left - borderWidth, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
        { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
      ];

      this.isActive = true;
      gsap.ticker.add(this.tickerFn!);

      gsap.to(this.activeStrength, {
        current: 1,
        duration: this.hoverDuration,
        ease: 'power2.out'
      });

      corners.forEach((corner, i) => {
        gsap.to(corner, {
          x: this.targetCornerPositions![i].x - cursorX,
          y: this.targetCornerPositions![i].y - cursorY,
          duration: 0.2,
          ease: 'power2.out'
        });
      });

      const leaveHandler = () => {
        gsap.ticker.remove(this.tickerFn!);

        this.isActive = false;
        this.targetCornerPositions = null;
        gsap.set(this.activeStrength, { current: 0, overwrite: true });
        this.activeTarget = null;

        if (this.cornersRef) {
          const corners = Array.from(this.cornersRef);
          gsap.killTweensOf(corners);
          const { cornerSize } = this.constants;
          const positions = [
            { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
            { x: cornerSize * 0.5, y: cornerSize * 0.5 },
            { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
          ];
          const tl = gsap.timeline();
          corners.forEach((corner, index) => {
            tl.to(
              corner,
              {
                x: positions[index].x,
                y: positions[index].y,
                duration: 0.3,
                ease: 'power3.out'
              },
              0
            );
          });
        }

        this.resumeTimeout = window.setTimeout(() => {
          if (!this.activeTarget && this.cursorRef?.nativeElement && this.spinTl) {
            const currentRotation = gsap.getProperty(this.cursorRef.nativeElement, 'rotation') as number;
            const normalizedRotation = currentRotation % 360;
            this.spinTl.kill();
            this.createSpinTimeline();
            gsap.to(this.cursorRef.nativeElement, {
              rotation: normalizedRotation + 360,
              duration: this.spinDuration * (1 - normalizedRotation / 360),
              ease: 'none',
              onComplete: () => {
                this.spinTl?.restart();
              }
            });
          }
          this.resumeTimeout = undefined;
        }, 50);

        this.cleanupTarget(target);
      };

      this.currentLeaveHandler = leaveHandler;
      target.addEventListener('mouseleave', leaveHandler);
    };

    window.addEventListener('mouseover', enterHandler, { passive: true });
  }

  private moveCursor(x: number, y: number): void {
    if (!this.cursorRef?.nativeElement) return;
    gsap.to(this.cursorRef.nativeElement, {
      x,
      y,
      duration: 0.1,
      ease: 'power3.out'
    });
  }

  private createSpinTimeline(): void {
    if (!this.cursorRef?.nativeElement) return;
    if (this.spinTl) {
      this.spinTl.kill();
    }
    this.spinTl = gsap
      .timeline({ repeat: -1 })
      .to(this.cursorRef.nativeElement, { rotation: '+=360', duration: this.spinDuration, ease: 'none' });
  }

  private cleanupTarget(target: HTMLElement): void {
    if (this.currentLeaveHandler) {
      target.removeEventListener('mouseleave', this.currentLeaveHandler);
    }
    this.currentLeaveHandler = null;
  }

  private cleanup(): void {
    if (this.tickerFn) {
      gsap.ticker.remove(this.tickerFn);
    }

    if (this.activeTarget) {
      this.cleanupTarget(this.activeTarget);
    }

    this.spinTl?.kill();
    document.body.style.cursor = this.originalCursor;

    this.isActive = false;
    this.targetCornerPositions = null;
    this.activeStrength.current = 0;
  }
}

