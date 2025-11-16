import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

interface Letter {
  char: string;
  color: string;
  targetColor: string;
  colorProgress: number;
}

@Component({
  selector: 'ngw-letter-glitch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './letter-glitch.component.html',
  styleUrl: './letter-glitch.component.css'
})
export class LetterGlitchComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvasRef', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() glitchColors: string[] = ['#2b4539', '#61dca3', '#61b3dc'];
  @Input() className = '';
  @Input() glitchSpeed = 50;
  @Input() centerVignette = false;
  @Input() outerVignette = true;
  @Input() smooth = true;
  @Input() characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789';

  private readonly platformId = inject(PLATFORM_ID);
  private animationId: number | null = null;
  private letters: Letter[] = [];
  private grid = { columns: 0, rows: 0 };
  private context: CanvasRenderingContext2D | null = null;
  private lastGlitchTime = 0;
  private resizeTimeout: number | null = null;
  private resizeHandler: (() => void) | null = null;
  private initialized = false;

  private readonly fontSize = 16;
  private readonly charWidth = 10;
  private readonly charHeight = 20;
  private lettersAndSymbols: string[] = [];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.lettersAndSymbols = Array.from(this.characters);
    this.initLetterGlitch();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.initialized) {
      return;
    }

    if (changes['characters']) {
      this.lettersAndSymbols = Array.from(this.characters);
      this.resizeCanvas();
    }
  }

  private getRandomChar(): string {
    return this.lettersAndSymbols[Math.floor(Math.random() * this.lettersAndSymbols.length)];
  }

  private getRandomColor(): string {
    return this.glitchColors[Math.floor(Math.random() * this.glitchColors.length)];
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
      return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  }

  private interpolateColor(start: { r: number; g: number; b: number }, end: { r: number; g: number; b: number }, factor: number): string {
    const result = {
      r: Math.round(start.r + (end.r - start.r) * factor),
      g: Math.round(start.g + (end.g - start.g) * factor),
      b: Math.round(start.b + (end.b - start.b) * factor)
    };
    return `rgb(${result.r}, ${result.g}, ${result.b})`;
  }

  private calculateGrid(width: number, height: number): { columns: number; rows: number } {
    const columns = Math.ceil(width / this.charWidth);
    const rows = Math.ceil(height / this.charHeight);
    return { columns, rows };
  }

  private initializeLetters(columns: number, rows: number): void {
    this.grid = { columns, rows };
    const totalLetters = columns * rows;
    this.letters = Array.from({ length: totalLetters }, () => ({
      char: this.getRandomChar(),
      color: this.getRandomColor(),
      targetColor: this.getRandomColor(),
      colorProgress: 1
    }));
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    if (this.context) {
      this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const { columns, rows } = this.calculateGrid(rect.width, rect.height);
    this.initializeLetters(columns, rows);

    this.drawLetters();
  }

  private drawLetters(): void {
    if (!this.context || this.letters.length === 0) return;
    const ctx = this.context;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${this.fontSize}px monospace`;
    ctx.textBaseline = 'top';

    this.letters.forEach((letter, index) => {
      const x = (index % this.grid.columns) * this.charWidth;
      const y = Math.floor(index / this.grid.columns) * this.charHeight;
      ctx.fillStyle = letter.color;
      ctx.fillText(letter.char, x, y);
    });
  }

  private updateLetters(): void {
    if (!this.letters || this.letters.length === 0) return;

    const updateCount = Math.max(1, Math.floor(this.letters.length * 0.05));

    for (let i = 0; i < updateCount; i++) {
      const index = Math.floor(Math.random() * this.letters.length);
      if (!this.letters[index]) continue;

      this.letters[index].char = this.getRandomChar();
      this.letters[index].targetColor = this.getRandomColor();

      if (!this.smooth) {
        this.letters[index].color = this.letters[index].targetColor;
        this.letters[index].colorProgress = 1;
      } else {
        this.letters[index].colorProgress = 0;
      }
    }
  }

  private handleSmoothTransitions(): void {
    let needsRedraw = false;
    this.letters.forEach(letter => {
      if (letter.colorProgress < 1) {
        letter.colorProgress += 0.05;
        if (letter.colorProgress > 1) letter.colorProgress = 1;

        const startRgb = this.hexToRgb(letter.color);
        const endRgb = this.hexToRgb(letter.targetColor);
        if (startRgb && endRgb) {
          letter.color = this.interpolateColor(startRgb, endRgb, letter.colorProgress);
          needsRedraw = true;
        }
      }
    });

    if (needsRedraw) {
      this.drawLetters();
    }
  }

  private animate = (): void => {
    const now = Date.now();
    if (now - this.lastGlitchTime >= this.glitchSpeed) {
      this.updateLetters();
      this.drawLetters();
      this.lastGlitchTime = now;
    }

    if (this.smooth) {
      this.handleSmoothTransitions();
    }

    this.animationId = requestAnimationFrame(this.animate);
  };

  private initLetterGlitch(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.context = canvas.getContext('2d');
    if (!this.context) return;

    this.resizeCanvas();
    this.animate();

    const handleResize = () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      this.resizeTimeout = window.setTimeout(() => {
        if (this.animationId) {
          cancelAnimationFrame(this.animationId);
        }
        this.resizeCanvas();
        this.animate();
      }, 100) as unknown as number;
    };

    this.resizeHandler = handleResize;
    window.addEventListener('resize', handleResize);

    this.initialized = true;
  }

  private cleanup(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }
}

