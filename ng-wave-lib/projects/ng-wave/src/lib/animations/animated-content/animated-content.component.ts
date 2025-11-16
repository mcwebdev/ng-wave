import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
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
  selector: 'ngw-animated-content',
  standalone: true,
  imports: [],
  templateUrl: './animated-content.component.html',
  styleUrl: './animated-content.component.css'
})
export class AnimatedContentComponent implements AfterViewInit, OnDestroy {
  @ViewChild('content', { static: false }) contentRef!: ElementRef<HTMLDivElement>;

  @Input() distance = 100;
  @Input() direction: 'vertical' | 'horizontal' = 'vertical';
  @Input() reverse = false;
  @Input() duration = 0.8;
  @Input() ease: string | ((t: number) => number) = 'power3.out';
  @Input() initialOpacity = 0;
  @Input() animateOpacity = true;
  @Input() scale = 1;
  @Input() threshold = 0.1;
  @Input() delay = 0;

  @Output() complete = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private scrollTrigger?: ScrollTrigger;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.setupAnimation();
  }

  ngOnDestroy(): void {
    if (this.scrollTrigger) {
      this.scrollTrigger.kill();
    }
    if (this.contentRef?.nativeElement) {
      gsap.killTweensOf(this.contentRef.nativeElement);
    }
  }

  private setupAnimation(): void {
    if (!this.contentRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const el = this.contentRef.nativeElement;
    const axis = this.direction === 'horizontal' ? 'x' : 'y';
    const offset = this.reverse ? -this.distance : this.distance;
    const startPct = (1 - this.threshold) * 100;

    gsap.set(el, {
      [axis]: offset,
      scale: this.scale,
      opacity: this.animateOpacity ? this.initialOpacity : 1
    });

    const tween = gsap.to(el, {
      [axis]: 0,
      scale: 1,
      opacity: 1,
      duration: this.duration,
      ease: this.ease,
      delay: this.delay,
      onComplete: () => {
        this.complete.emit();
      },
      scrollTrigger: {
        trigger: el,
        start: `top ${startPct}%`,
        toggleActions: 'play none none none',
        once: true
      }
    });

    this.scrollTrigger = ScrollTrigger.getById(tween.scrollTrigger?.vars.id as string) || undefined;
  }
}

