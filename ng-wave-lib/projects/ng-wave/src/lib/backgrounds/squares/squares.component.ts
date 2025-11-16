import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  HostListener
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ngw-squares',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './squares.component.html',
  styleUrl: './squares.component.css'
})
export class SquaresComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() direction: 'right' | 'left' | 'up' | 'down' | 'diagonal' = 'right';
  @Input() speed = 1;
  @Input() borderColor = '#999';
  @Input() squareSize = 40;
  @Input() hoverFillColor = '#222';
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private rafId?: number;
  private numSquaresX = 0;
  private numSquaresY = 0;
  private gridOffset = { x: 0, y: 0 };
  private hoveredSquare: { x: number; y: number } | null = null;
  private resizeListener?: () => void;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.resizeCanvas();
    this.setupResizeListener();
    this.animate();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  private resizeCanvas(): void {
    if (!this.canvasRef?.nativeElement) {
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.numSquaresX = Math.ceil(canvas.width / this.squareSize) + 1;
    this.numSquaresY = Math.ceil(canvas.height / this.squareSize) + 1;
  }

  private setupResizeListener(): void {
    this.resizeListener = () => {
      this.resizeCanvas();
    };
    window.addEventListener('resize', this.resizeListener);
  }

  private drawGrid(): void {
    if (!this.canvasRef?.nativeElement) {
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startX = Math.floor(this.gridOffset.x / this.squareSize) * this.squareSize;
    const startY = Math.floor(this.gridOffset.y / this.squareSize) * this.squareSize;

    for (let x = startX; x < canvas.width + this.squareSize; x += this.squareSize) {
      for (let y = startY; y < canvas.height + this.squareSize; y += this.squareSize) {
        const squareX = x - (this.gridOffset.x % this.squareSize);
        const squareY = y - (this.gridOffset.y % this.squareSize);

        if (
          this.hoveredSquare &&
          Math.floor((x - startX) / this.squareSize) === this.hoveredSquare.x &&
          Math.floor((y - startY) / this.squareSize) === this.hoveredSquare.y
        ) {
          ctx.fillStyle = this.hoverFillColor;
          ctx.fillRect(squareX, squareY, this.squareSize, this.squareSize);
        }

        ctx.strokeStyle = this.borderColor;
        ctx.strokeRect(squareX, squareY, this.squareSize, this.squareSize);
      }
    }

    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      Math.sqrt(canvas.width ** 2 + canvas.height ** 2) / 2
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private updateAnimation = (): void => {
    if (!this.canvasRef?.nativeElement) {
      return;
    }
    const effectiveSpeed = Math.max(this.speed, 0.1);
    switch (this.direction) {
      case 'right':
        this.gridOffset.x = (this.gridOffset.x - effectiveSpeed + this.squareSize) % this.squareSize;
        break;
      case 'left':
        this.gridOffset.x = (this.gridOffset.x + effectiveSpeed + this.squareSize) % this.squareSize;
        break;
      case 'up':
        this.gridOffset.y = (this.gridOffset.y + effectiveSpeed + this.squareSize) % this.squareSize;
        break;
      case 'down':
        this.gridOffset.y = (this.gridOffset.y - effectiveSpeed + this.squareSize) % this.squareSize;
        break;
      case 'diagonal':
        this.gridOffset.x = (this.gridOffset.x - effectiveSpeed + this.squareSize) % this.squareSize;
        this.gridOffset.y = (this.gridOffset.y - effectiveSpeed + this.squareSize) % this.squareSize;
        break;
    }

    this.drawGrid();
    this.rafId = requestAnimationFrame(this.updateAnimation);
  };

  private animate(): void {
    this.rafId = requestAnimationFrame(this.updateAnimation);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.canvasRef?.nativeElement) {
      return;
    }
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const startX = Math.floor(this.gridOffset.x / this.squareSize) * this.squareSize;
    const startY = Math.floor(this.gridOffset.y / this.squareSize) * this.squareSize;

    const hoveredSquareX = Math.floor((mouseX + this.gridOffset.x - startX) / this.squareSize);
    const hoveredSquareY = Math.floor((mouseY + this.gridOffset.y - startY) / this.squareSize);

    if (
      !this.hoveredSquare ||
      this.hoveredSquare.x !== hoveredSquareX ||
      this.hoveredSquare.y !== hoveredSquareY
    ) {
      this.hoveredSquare = { x: hoveredSquareX, y: hoveredSquareY };
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hoveredSquare = null;
  }

  private cleanup(): void {
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }
}

