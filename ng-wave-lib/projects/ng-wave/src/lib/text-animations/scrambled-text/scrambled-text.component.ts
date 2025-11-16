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
import { gsap } from 'gsap';

@Component({
  selector: 'ngw-scrambled-text',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scrambled-text.component.html',
  styleUrl: './scrambled-text.component.css'
})
export class ScrambledTextComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: false }) rootRef!: ElementRef<HTMLDivElement>;
  @ViewChild('textElement', { static: false }) textElementRef!: ElementRef<HTMLParagraphElement>;

  @Input() radius = 100;
  @Input() duration = 1.2;
  @Input() speed = 0.5;
  @Input() scrambleChars = '.:';
  @Input() className = '';
  @Input() style: Record<string, string> = {};

  private readonly platformId = inject(PLATFORM_ID);
  private charsRef: HTMLElement[] = [];
  private splitInstance?: any;
  private scrambleTimers: Map<HTMLElement, number> = new Map();

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
    if (!this.rootRef?.nativeElement || !this.textElementRef?.nativeElement) {
      return;
    }

    // Try to use SplitText if available, otherwise use fallback
    try {
      // Dynamic import to check if SplitText is available
      const SplitTextModule = (window as any).SplitText || (gsap as any).SplitText;
      if (SplitTextModule && SplitTextModule.create) {
        this.splitInstance = SplitTextModule.create(this.textElementRef.nativeElement, {
          type: 'chars',
          charsClass: 'char'
        });
        this.charsRef = this.splitInstance.chars || [];

        this.charsRef.forEach(c => {
          gsap.set(c, {
            display: 'inline-block'
          });
          c.setAttribute('data-content', c.textContent || '');
        });
      } else {
        this.fallbackSplit();
      }
    } catch (error) {
      console.warn('SplitText not available, using fallback', error);
      this.fallbackSplit();
    }
  }

  private fallbackSplit(): void {
    if (!this.textElementRef?.nativeElement) return;
    const text = this.textElementRef.nativeElement.textContent || '';
    const chars = text.split('');
    this.textElementRef.nativeElement.innerHTML = '';
    this.charsRef = chars.map(char => {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = char;
      span.setAttribute('data-content', char);
      this.textElementRef.nativeElement.appendChild(span);
      return span;
    });
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.handleMove(event);
  }

  private handleMove(e: PointerEvent): void {
    this.charsRef.forEach(c => {
      const rect = c.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);

      if (dist < this.radius) {
        const animDuration = this.duration * (1 - dist / this.radius);
        this.scrambleChar(c, animDuration);
      }
    });
  }

  private scrambleChar(char: HTMLElement, duration: number): void {
    const originalText = char.getAttribute('data-content') || '';
    if (!originalText) return;

    // Clear existing timer
    const existingTimer = this.scrambleTimers.get(char);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const startTime = Date.now();
    const scrambleInterval = 50; // Update every 50ms
    const chars = this.scrambleChars.split('');

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      if (progress >= 1) {
        char.textContent = originalText;
        clearInterval(timer);
        this.scrambleTimers.delete(char);
      } else {
        // Scramble with increasing probability of showing correct char
        const shouldShowCorrect = Math.random() < progress;
        if (shouldShowCorrect) {
          char.textContent = originalText;
        } else {
          const randomChar = chars[Math.floor(Math.random() * chars.length)] || '.';
          char.textContent = randomChar;
        }
      }
    }, scrambleInterval);

    this.scrambleTimers.set(char, timer);
  }

  private cleanup(): void {
    // Clear all timers
    this.scrambleTimers.forEach(timer => clearInterval(timer));
    this.scrambleTimers.clear();

    // Revert SplitText
    if (this.splitInstance) {
      try {
        this.splitInstance.revert();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }
}

