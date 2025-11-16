import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  computed,
  signal,
  inject,
  PLATFORM_ID,
  AfterViewInit,
  OnDestroy,
  effect,
  Injector
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';
import {
  BlurTextAnimateBy,
  BlurTextDirection,
  BlurTextAnimationFrom,
  BlurTextAnimationTo
} from '../../interfaces/blur-text.interface';
import { buildKeyframes } from '../../utils/animation.utils';

@Component({
  selector: 'ngw-blur-text',
  standalone: true,
  imports: [],
  templateUrl: './blur-text.component.html',
  styleUrl: './blur-text.component.css'
})
export class BlurTextComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLParagraphElement>;

  @Input() text = '';
  @Input() delay = 200;
  @Input() className = '';
  @Input() animateBy: BlurTextAnimateBy = 'words';
  @Input() direction: BlurTextDirection = 'top';
  @Input() threshold = 0.1;
  @Input() rootMargin = '0px';
  @Input() animationFrom?: BlurTextAnimationFrom;
  @Input() animationTo?: BlurTextAnimationTo;
  @Input() easing: (t: number) => number = (t: number) => t;
  @Input() stepDuration = 0.35;

  @Output() animationComplete = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly inView = signal(false);
  private observer?: IntersectionObserver;
  private spanElements: HTMLElement[] = [];
  private animations: (gsap.core.Tween | gsap.core.Timeline)[] = [];

  readonly elements = computed(() => {
    return this.animateBy === 'words'
      ? this.text.split(' ')
      : this.text.split('');
  });

  readonly defaultFrom = computed<BlurTextAnimationFrom>(() => {
    return this.direction === 'top'
      ? { filter: 'blur(10px)', opacity: 0, y: -50 }
      : { filter: 'blur(10px)', opacity: 0, y: 50 };
  });

  readonly defaultTo = computed<BlurTextAnimationTo>(() => {
    return [
      {
        filter: 'blur(5px)',
        opacity: 0.5,
        y: this.direction === 'top' ? 5 : -5
      },
      { filter: 'blur(0px)', opacity: 1, y: 0 }
    ];
  });

  readonly fromSnapshot = computed(() => {
    return this.animationFrom ?? this.defaultFrom();
  });

  readonly toSnapshots = computed(() => {
    return this.animationTo ?? this.defaultTo();
  });

  readonly animationConfig = computed(() => {
    const from = this.fromSnapshot();
    const to = this.toSnapshots();
    const stepCount = to.length + 1;
    const totalDuration = this.stepDuration * (stepCount - 1);
    const times = Array.from(
      { length: stepCount },
      (_, i) => (stepCount === 1 ? 0 : i / (stepCount - 1))
    );

    return {
      keyframes: buildKeyframes(from, to),
      totalDuration,
      times,
      stepCount
    };
  });

  constructor() {
    // Set up effect to watch for inView changes
    effect(() => {
      if (this.inView() && isPlatformBrowser(this.platformId)) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          this.animateElements();
        }, 0);
      }
    }, { injector: this.injector });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.setupIntersectionObserver();
    this.setupInitialStyles();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.animations.forEach(anim => anim.kill());
  }

  private setupIntersectionObserver(): void {
    if (!this.containerRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.inView.set(true);
          this.observer?.unobserve(this.containerRef.nativeElement);
        }
      },
      { threshold: this.threshold, rootMargin: this.rootMargin }
    );

    this.observer.observe(this.containerRef.nativeElement);
  }

  private setupInitialStyles(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const from = this.fromSnapshot();
    const spans = this.containerRef?.nativeElement.querySelectorAll('span');
    
    if (!spans) {
      return;
    }

    this.spanElements = Array.from(spans);
    this.spanElements.forEach(span => {
      gsap.set(span, {
        filter: from.filter || 'blur(10px)',
        opacity: from.opacity ?? 0,
        y: from.y ?? 0
      });
    });
  }

  private animateElements(): void {
    if (!isPlatformBrowser(this.platformId) || this.spanElements.length === 0) {
      return;
    }

    const config = this.animationConfig();
    const keyframes = config.keyframes;
    const totalDuration = config.totalDuration;
    const times = config.times;
    const toSnapshots = this.toSnapshots();

    this.animations.forEach(anim => anim.kill());
    this.animations = [];

    this.spanElements.forEach((span, index) => {
      const delay = (index * this.delay) / 1000;
      const animationDelay = delay;

      // Create timeline for keyframe animation
      const tl = gsap.timeline({
        delay: animationDelay,
        ease: this.easing,
        onComplete: () => {
          if (index === this.spanElements.length - 1) {
            this.animationComplete.emit();
          }
        }
      });

      // Animate through each step
      toSnapshots.forEach((step, stepIndex) => {
        const stepTime = times[stepIndex + 1] * totalDuration;
        const prevTime = stepIndex === 0 ? 0 : times[stepIndex] * totalDuration;
        const stepDuration = stepTime - prevTime;

        tl.to(span, {
          ...step,
          duration: stepDuration,
          ease: this.easing
        }, prevTime);
      });

      this.animations.push(tl);
    });
  }

  getSegmentDisplay(segment: string): string {
    return segment === ' ' ? '\u00A0' : segment;
  }

  shouldAddSpace(index: number): boolean {
    return this.animateBy === 'words' && index < this.elements().length - 1;
  }

  getInitialStyle(): Record<string, string> {
    const from = this.fromSnapshot();
    return {
      filter: (from.filter as string) || 'blur(10px)',
      opacity: String(from.opacity ?? 0),
      transform: `translateY(${from.y ?? 0}px)`,
      willChange: 'transform, filter, opacity'
    };
  }
}

