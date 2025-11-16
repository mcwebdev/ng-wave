import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  computed,
  signal,
  effect,
  inject,
  PLATFORM_ID,
  Injector
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'ngw-text-type',
  standalone: true,
  imports: [],
  templateUrl: './text-type.component.html',
  styleUrl: './text-type.component.css'
})
export class TextTypeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;
  @ViewChild('cursor', { static: false }) cursorRef!: ElementRef<HTMLSpanElement>;

  @Input() text: string | string[] = '';
  @Input() tag: 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'div';
  @Input() typingSpeed = 50;
  @Input() initialDelay = 0;
  @Input() pauseDuration = 2000;
  @Input() deletingSpeed = 30;
  @Input() loop = true;
  @Input() className = '';
  @Input() showCursor = true;
  @Input() hideCursorWhileTyping = false;
  @Input() cursorCharacter = '|';
  @Input() cursorClassName = '';
  @Input() cursorBlinkDuration = 0.5;
  @Input() textColors: string[] = [];
  @Input() variableSpeed?: { min: number; max: number };
  @Input() startOnVisible = false;
  @Input() reverseMode = false;

  @Output() sentenceComplete = new EventEmitter<{ text: string; index: number }>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  readonly displayedText = signal('');
  readonly currentCharIndex = signal(0);
  readonly isDeleting = signal(false);
  readonly currentTextIndex = signal(0);
  readonly isVisible = signal(false);
  private timeoutId?: number;
  private observer?: IntersectionObserver;
  private cursorAnimation?: gsap.core.Tween;

  readonly textArray = computed(() => {
    return Array.isArray(this.text) ? this.text : [this.text];
  });

  readonly currentTextColor = computed(() => {
    if (this.textColors.length === 0) return undefined;
    return this.textColors[this.currentTextIndex() % this.textColors.length];
  });

  readonly shouldHideCursor = computed(() => {
    return (
      this.hideCursorWhileTyping &&
      (this.currentCharIndex() < this.textArray()[this.currentTextIndex()].length || this.isDeleting())
    );
  });

  constructor() {
    if (!this.startOnVisible) {
      this.isVisible.set(true);
    }

    // Watch for changes to trigger typing animation
    effect(() => {
      if (!this.isVisible() || !isPlatformBrowser(this.platformId)) {
        return;
      }

      // Clear any existing timeout
      if (this.timeoutId !== undefined) {
        clearTimeout(this.timeoutId);
      }

      const charIndex = this.currentCharIndex();
      const displayed = this.displayedText();
      const isDeleting = this.isDeleting();

      // Start typing if at beginning
      if (charIndex === 0 && !isDeleting && displayed === '') {
        this.timeoutId = window.setTimeout(() => {
          this.executeTypingAnimation();
        }, this.initialDelay);
      } else {
        // Continue animation
        this.executeTypingAnimation();
      }
    }, { injector: this.injector });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.startOnVisible) {
      this.setupIntersectionObserver();
    }

    if (this.showCursor) {
      this.setupCursorAnimation();
    }
  }

  ngOnDestroy(): void {
    if (this.timeoutId !== undefined) {
      clearTimeout(this.timeoutId);
    }
    this.observer?.disconnect();
    this.cursorAnimation?.kill();
  }

  private setupIntersectionObserver(): void {
    if (!this.containerRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.isVisible.set(true);
          this.observer?.unobserve(this.containerRef.nativeElement);
        }
      },
      { threshold: 0.1 }
    );

    this.observer.observe(this.containerRef.nativeElement);
  }

  private setupCursorAnimation(): void {
    if (!this.cursorRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    gsap.set(this.cursorRef.nativeElement, { opacity: 1 });
    this.cursorAnimation = gsap.to(this.cursorRef.nativeElement, {
      opacity: 0,
      duration: this.cursorBlinkDuration,
      repeat: -1,
      yoyo: true,
      ease: 'power2.inOut'
    });
  }

  private getRandomSpeed(): number {
    if (!this.variableSpeed) return this.typingSpeed;
    const { min, max } = this.variableSpeed;
    return Math.random() * (max - min) + min;
  }

  private executeTypingAnimation(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const currentText = this.textArray()[this.currentTextIndex()];
    const processedText = this.reverseMode ? currentText.split('').reverse().join('') : currentText;
    const displayed = this.displayedText();

    if (this.isDeleting()) {
      if (displayed === '') {
        this.isDeleting.set(false);
        if (this.currentTextIndex() === this.textArray().length - 1 && !this.loop) {
          return;
        }

        this.sentenceComplete.emit({
          text: this.textArray()[this.currentTextIndex()],
          index: this.currentTextIndex()
        });

        this.currentTextIndex.update(prev => (prev + 1) % this.textArray().length);
        this.currentCharIndex.set(0);
        this.timeoutId = window.setTimeout(() => {}, this.pauseDuration);
      } else {
        this.timeoutId = window.setTimeout(() => {
          this.displayedText.update(prev => prev.slice(0, -1));
        }, this.deletingSpeed);
      }
    } else {
      const charIndex = this.currentCharIndex();
      if (charIndex < processedText.length) {
        this.timeoutId = window.setTimeout(
          () => {
            this.displayedText.update(prev => prev + processedText[charIndex]);
            this.currentCharIndex.update(prev => prev + 1);
          },
          this.variableSpeed ? this.getRandomSpeed() : this.typingSpeed
        );
      } else if (this.textArray().length > 1) {
        this.timeoutId = window.setTimeout(() => {
          this.isDeleting.set(true);
        }, this.pauseDuration);
      }
    }
  }

}

