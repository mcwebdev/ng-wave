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
  selector: 'ngw-rotating-text',
  standalone: true,
  imports: [],
  templateUrl: './rotating-text.component.html',
  styleUrl: './rotating-text.component.css'
})
export class RotatingTextComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;
  @ViewChild('textContainer', { static: false }) textContainerRef!: ElementRef<HTMLElement>;

  @Input() texts: string[] = [];
  @Input() rotationInterval = 2000;
  @Input() staggerDuration = 0;
  @Input() staggerFrom: 'first' | 'last' | 'center' | 'random' | number = 'first';
  @Input() loop = true;
  @Input() auto = true;
  @Input() splitBy: 'characters' | 'words' | 'lines' | string = 'characters';
  @Input() mainClassName = '';
  @Input() splitLevelClassName = '';
  @Input() elementLevelClassName = '';
  @Input() initial = { y: '100%', opacity: 0 };
  @Input() animate = { y: 0, opacity: 1 };
  @Input() exit = { y: '-120%', opacity: 0 };

  @Output() next = new EventEmitter<number>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  readonly currentTextIndex = signal(0);
  private intervalId?: number;
  private animations: gsap.core.Tween[] = [];

  readonly currentText = computed(() => {
    return this.texts[this.currentTextIndex()] || '';
  });

  readonly elements = computed(() => {
    const text = this.currentText();
    if (this.splitBy === 'characters') {
      const words = text.split(' ');
      return words.map((word, i) => ({
        characters: Array.from(word),
        needsSpace: i !== words.length - 1
      }));
    }
    if (this.splitBy === 'words') {
      return text.split(' ').map((word, i, arr) => ({
        characters: [word],
        needsSpace: i !== arr.length - 1
      }));
    }
    if (this.splitBy === 'lines') {
      return text.split('\n').map((line, i, arr) => ({
        characters: [line],
        needsSpace: i !== arr.length - 1
      }));
    }
    return text.split(this.splitBy).map((part, i, arr) => ({
      characters: [part],
      needsSpace: i !== arr.length - 1
    }));
  });

  constructor() {
    effect(() => {
      if (this.auto && isPlatformBrowser(this.platformId)) {
        this.startAutoRotation();
      } else {
        this.stopAutoRotation();
      }
    }, { injector: this.injector });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.animateText();
  }

  ngOnDestroy(): void {
    this.stopAutoRotation();
    this.animations.forEach(anim => anim.kill());
  }

  private startAutoRotation(): void {
    this.stopAutoRotation();
    if (this.auto) {
      this.intervalId = window.setInterval(() => {
        this.goToNext();
      }, this.rotationInterval);
    }
  }

  private stopAutoRotation(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  goToNext(): void {
    const nextIndex = this.currentTextIndex() === this.texts.length - 1
      ? (this.loop ? 0 : this.currentTextIndex())
      : this.currentTextIndex() + 1;
    
    if (nextIndex !== this.currentTextIndex()) {
      this.currentTextIndex.set(nextIndex);
      this.next.emit(nextIndex);
      this.animateText();
    }
  }

  goToPrevious(): void {
    const prevIndex = this.currentTextIndex() === 0
      ? (this.loop ? this.texts.length - 1 : this.currentTextIndex())
      : this.currentTextIndex() - 1;
    
    if (prevIndex !== this.currentTextIndex()) {
      this.currentTextIndex.set(prevIndex);
      this.next.emit(prevIndex);
      this.animateText();
    }
  }

  jumpTo(index: number): void {
    const validIndex = Math.max(0, Math.min(index, this.texts.length - 1));
    if (validIndex !== this.currentTextIndex()) {
      this.currentTextIndex.set(validIndex);
      this.next.emit(validIndex);
      this.animateText();
    }
  }

  reset(): void {
    if (this.currentTextIndex() !== 0) {
      this.currentTextIndex.set(0);
      this.next.emit(0);
      this.animateText();
    }
  }

  private animateText(): void {
    if (!isPlatformBrowser(this.platformId) || !this.textContainerRef?.nativeElement) {
      return;
    }

    this.animations.forEach(anim => anim.kill());
    this.animations = [];

    const chars = this.textContainerRef.nativeElement.querySelectorAll('.text-rotate-element');
    const totalChars = chars.length;

    chars.forEach((char, index) => {
      const delay = this.getStaggerDelay(index, totalChars);
      
      gsap.set(char, {
        y: this.initial.y,
        opacity: this.initial.opacity
      });

      const tween = gsap.to(char, {
        y: this.animate.y,
        opacity: this.animate.opacity,
        duration: 0.6,
        delay: delay,
        ease: 'power2.out'
      });

      this.animations.push(tween);
    });
  }

  private getStaggerDelay(index: number, totalChars: number): number {
    if (this.staggerFrom === 'first') {
      return index * this.staggerDuration;
    }
    if (this.staggerFrom === 'last') {
      return (totalChars - 1 - index) * this.staggerDuration;
    }
    if (this.staggerFrom === 'center') {
      const center = Math.floor(totalChars / 2);
      return Math.abs(center - index) * this.staggerDuration;
    }
    if (this.staggerFrom === 'random') {
      const randomIndex = Math.floor(Math.random() * totalChars);
      return Math.abs(randomIndex - index) * this.staggerDuration;
    }
    if (typeof this.staggerFrom === 'number') {
      return Math.abs(this.staggerFrom - index) * this.staggerDuration;
    }
    return 0;
  }
}

