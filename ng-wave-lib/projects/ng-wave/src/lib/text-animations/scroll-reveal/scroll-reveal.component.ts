import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  computed,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

@Component({
  selector: 'ngw-scroll-reveal',
  standalone: true,
  imports: [],
  templateUrl: './scroll-reveal.component.html',
  styleUrl: './scroll-reveal.component.css'
})
export class ScrollRevealComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() text = '';
  @Input() scrollContainerRef?: HTMLElement;
  @Input() enableBlur = true;
  @Input() baseOpacity = 0.1;
  @Input() baseRotation = 3;
  @Input() blurStrength = 4;
  @Input() containerClassName = '';
  @Input() textClassName = '';
  @Input() rotationEnd = 'bottom bottom';
  @Input() wordAnimationEnd = 'bottom bottom';

  private readonly platformId = inject(PLATFORM_ID);
  private scrollTriggers: ScrollTrigger[] = [];

  readonly words = computed(() => {
    return this.text.split(/(\s+)/).map((word, index) => ({
      word,
      isSpace: /^\s+$/.test(word),
      index
    }));
  });

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.setupAnimation();
  }

  ngOnDestroy(): void {
    this.scrollTriggers.forEach(trigger => trigger.kill());
    this.scrollTriggers = [];
  }

  private setupAnimation(): void {
    if (!this.containerRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const el = this.containerRef.nativeElement;
    const scroller = this.scrollContainerRef || window;

    // Rotation animation
    const rotationTrigger = gsap.fromTo(
      el,
      { transformOrigin: '0% 50%', rotate: this.baseRotation },
      {
        ease: 'none',
        rotate: 0,
        scrollTrigger: {
          trigger: el,
          scroller,
          start: 'top bottom',
          end: this.rotationEnd,
          scrub: true
        }
      }
    );

    if (rotationTrigger.scrollTrigger) {
      this.scrollTriggers.push(rotationTrigger.scrollTrigger);
    }

    // Wait for words to be rendered
    setTimeout(() => {
      const wordElements = el.querySelectorAll('.word');

      // Opacity animation
      const opacityTrigger = gsap.fromTo(
        wordElements,
        { opacity: this.baseOpacity, willChange: 'opacity' },
        {
          ease: 'none',
          opacity: 1,
          stagger: 0.05,
          scrollTrigger: {
            trigger: el,
            scroller,
            start: 'top bottom-=20%',
            end: this.wordAnimationEnd,
            scrub: true
          }
        }
      );

      if (opacityTrigger.scrollTrigger) {
        this.scrollTriggers.push(opacityTrigger.scrollTrigger);
      }

      // Blur animation
      if (this.enableBlur) {
        const blurTrigger = gsap.fromTo(
          wordElements,
          { filter: `blur(${this.blurStrength}px)` },
          {
            ease: 'none',
            filter: 'blur(0px)',
            stagger: 0.05,
            scrollTrigger: {
              trigger: el,
              scroller,
              start: 'top bottom-=20%',
              end: this.wordAnimationEnd,
              scrub: true
            }
          }
        );

        if (blurTrigger.scrollTrigger) {
          this.scrollTriggers.push(blurTrigger.scrollTrigger);
        }
      }
    }, 0);
  }
}

