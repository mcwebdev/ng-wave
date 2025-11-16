import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'ngw-fuzzy-text',
  standalone: true,
  imports: [],
  templateUrl: './fuzzy-text.component.html',
  styleUrl: './fuzzy-text.component.css'
})
export class FuzzyTextComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('textContainer', { static: false }) textContainerRef!: ElementRef<HTMLDivElement>;

  @Input() fontSize = 'clamp(2rem, 10vw, 10rem)';
  @Input() fontWeight = 900;
  @Input() fontFamily = 'inherit';
  @Input() color = '#fff';
  @Input() enableHover = true;
  @Input() baseIntensity = 0.18;
  @Input() hoverIntensity = 0.5;

  private readonly platformId = inject(PLATFORM_ID);
  private animationFrameId?: number;
  private isCancelled = false;
  private isHovering = false;
  private cleanupFn?: () => void;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.init();
  }

  ngOnDestroy(): void {
    this.isCancelled = true;
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.cleanupFn) {
      this.cleanupFn();
    }
  }

  private async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.canvasRef?.nativeElement) {
      return;
    }

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    if (this.isCancelled) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const computedFontFamily =
      this.fontFamily === 'inherit' ? window.getComputedStyle(canvas).fontFamily || 'sans-serif' : this.fontFamily;

    const fontSizeStr = typeof this.fontSize === 'number' ? `${this.fontSize}px` : this.fontSize;
    let numericFontSize: number;
    if (typeof this.fontSize === 'number') {
      numericFontSize = this.fontSize;
    } else {
      const temp = document.createElement('span');
      temp.style.fontSize = this.fontSize;
      document.body.appendChild(temp);
      const computedSize = window.getComputedStyle(temp).fontSize;
      numericFontSize = parseFloat(computedSize);
      document.body.removeChild(temp);
    }

    const text = canvas.textContent || '';

    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    offCtx.font = `${this.fontWeight} ${fontSizeStr} ${computedFontFamily}`;
    offCtx.textBaseline = 'alphabetic';
    const metrics = offCtx.measureText(text);

    const actualLeft = (metrics as any).actualBoundingBoxLeft ?? 0;
    const actualRight = (metrics as any).actualBoundingBoxRight ?? metrics.width;
    const actualAscent = (metrics as any).actualBoundingBoxAscent ?? numericFontSize;
    const actualDescent = (metrics as any).actualBoundingBoxDescent ?? numericFontSize * 0.2;

    const textBoundingWidth = Math.ceil(actualLeft + actualRight);
    const tightHeight = Math.ceil(actualAscent + actualDescent);

    const extraWidthBuffer = 10;
    const offscreenWidth = textBoundingWidth + extraWidthBuffer;

    offscreen.width = offscreenWidth;
    offscreen.height = tightHeight;

    const xOffset = extraWidthBuffer / 2;
    offCtx.font = `${this.fontWeight} ${fontSizeStr} ${computedFontFamily}`;
    offCtx.textBaseline = 'alphabetic';
    offCtx.fillStyle = this.color;
    offCtx.fillText(text, xOffset - actualLeft, actualAscent);

    const horizontalMargin = 50;
    const verticalMargin = 0;
    canvas.width = offscreenWidth + horizontalMargin * 2;
    canvas.height = tightHeight + verticalMargin * 2;
    ctx.translate(horizontalMargin, verticalMargin);

    const interactiveLeft = horizontalMargin + xOffset;
    const interactiveTop = verticalMargin;
    const interactiveRight = interactiveLeft + textBoundingWidth;
    const interactiveBottom = interactiveTop + tightHeight;

    const fuzzRange = 30;

    const run = () => {
      if (this.isCancelled) return;
      ctx.clearRect(-fuzzRange, -fuzzRange, offscreenWidth + 2 * fuzzRange, tightHeight + 2 * fuzzRange);
      const intensity = this.isHovering ? this.hoverIntensity : this.baseIntensity;
      for (let j = 0; j < tightHeight; j++) {
        const dx = Math.floor(intensity * (Math.random() - 0.5) * fuzzRange);
        ctx.drawImage(offscreen, 0, j, offscreenWidth, 1, dx, j, offscreenWidth, 1);
      }
      this.animationFrameId = requestAnimationFrame(run);
    };

    run();

    const isInsideTextArea = (x: number, y: number) => {
      return x >= interactiveLeft && x <= interactiveRight && y >= interactiveTop && y <= interactiveBottom;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.enableHover) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.isHovering = isInsideTextArea(x, y);
    };

    const handleMouseLeave = () => {
      this.isHovering = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!this.enableHover) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.isHovering = isInsideTextArea(x, y);
    };

    const handleTouchEnd = () => {
      this.isHovering = false;
    };

    if (this.enableHover) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
    }

    this.cleanupFn = () => {
      if (this.animationFrameId !== undefined) {
        cancelAnimationFrame(this.animationFrameId);
      }
      if (this.enableHover) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }
}

