import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChildren,
  QueryList,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import Lenis from 'lenis';

@Component({
  selector: 'ngw-scroll-stack-item',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="scroll-stack-card" [class]="itemClassName"><ng-content></ng-content></div>'
})
export class ScrollStackItemComponent {
  @Input() itemClassName = '';
  constructor(public elementRef: ElementRef<HTMLElement>) {}
}

@Component({
  selector: 'ngw-scroll-stack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scroll-stack.component.html',
  styleUrl: './scroll-stack.component.css'
})
export class ScrollStackComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scrollerRef', { static: false }) scrollerRef!: ElementRef<HTMLElement>;
  @ContentChildren(ScrollStackItemComponent, { descendants: true }) cardElements!: QueryList<ScrollStackItemComponent>;

  @Input() itemDistance = 100;
  @Input() itemScale = 0.03;
  @Input() itemStackDistance = 30;
  @Input() stackPosition = '20%';
  @Input() scaleEndPosition = '10%';
  @Input() baseScale = 0.85;
  @Input() scaleDuration = 0.5;
  @Input() rotationAmount = 0;
  @Input() blurAmount = 0;
  @Input() useWindowScroll = false;
  @Input() className = '';

  @Output() stackComplete = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private lenis?: Lenis;
  private animationFrameId?: number;
  private stackCompleted = false;
  private cards: HTMLElement[] = [];
  private lastTransforms = new Map<number, { translateY: number; scale: number; rotation: number; blur: number }>();
  private isUpdating = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      this.setupCards();
      this.setupLenis();
      this.updateCardTransforms();
    }, 0);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.lenis) {
      this.lenis.destroy();
    }
  }

  private setupCards(): void {
    this.cards = this.cardElements.map(item => {
      const el = item.elementRef.nativeElement;
      return el.querySelector('.scroll-stack-card') as HTMLElement;
    }).filter(Boolean) as HTMLElement[];

    this.cards.forEach((card, i) => {
      if (i < this.cards.length - 1) {
        card.style.marginBottom = `${this.itemDistance}px`;
      }
      card.style.willChange = 'transform, filter';
      card.style.transformOrigin = 'top center';
      card.style.backfaceVisibility = 'hidden';
      card.style.transform = 'translateZ(0)';
      card.style.webkitTransform = 'translateZ(0)';
      card.style.perspective = '1000px';
      card.style.webkitPerspective = '1000px';
    });
  }

  private setupLenis(): void {
    if (this.useWindowScroll) {
      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
        infinite: false,
        wheelMultiplier: 1,
        lerp: 0.1,
        syncTouch: true,
        syncTouchLerp: 0.075
      });

      this.lenis.on('scroll', () => this.updateCardTransforms());

      const raf = (time: number) => {
        this.lenis!.raf(time);
        this.animationFrameId = requestAnimationFrame(raf);
      };
      this.animationFrameId = requestAnimationFrame(raf);
    } else {
      const scroller = this.scrollerRef?.nativeElement;
      if (!scroller) return;

      this.lenis = new Lenis({
        wrapper: scroller,
        content: scroller.querySelector('.scroll-stack-inner') as HTMLElement,
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 2,
        infinite: false,
        gestureOrientation: 'vertical',
        wheelMultiplier: 1,
        lerp: 0.1,
        syncTouch: true,
        syncTouchLerp: 0.075
      });

      this.lenis.on('scroll', () => this.updateCardTransforms());

      const raf = (time: number) => {
        this.lenis!.raf(time);
        this.animationFrameId = requestAnimationFrame(raf);
      };
      this.animationFrameId = requestAnimationFrame(raf);
    }
  }

  private calculateProgress(scrollTop: number, start: number, end: number): number {
    if (scrollTop < start) return 0;
    if (scrollTop > end) return 1;
    return (scrollTop - start) / (end - start);
  }

  private parsePercentage(value: string | number, containerHeight: number): number {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value.toString());
  }

  private getScrollData(): { scrollTop: number; containerHeight: number; scrollContainer: HTMLElement } {
    if (this.useWindowScroll) {
      return {
        scrollTop: window.scrollY,
        containerHeight: window.innerHeight,
        scrollContainer: document.documentElement
      };
    } else {
      const scroller = this.scrollerRef?.nativeElement;
      return {
        scrollTop: scroller?.scrollTop || 0,
        containerHeight: scroller?.clientHeight || 0,
        scrollContainer: scroller || document.documentElement
      };
    }
  }

  private getElementOffset(element: HTMLElement): number {
    if (this.useWindowScroll) {
      const rect = element.getBoundingClientRect();
      return rect.top + window.scrollY;
    } else {
      return (element as any).offsetTop || 0;
    }
  }

  private updateCardTransforms(): void {
    if (!this.cards.length || this.isUpdating) return;

    this.isUpdating = true;

    const { scrollTop, containerHeight } = this.getScrollData();
    const stackPositionPx = this.parsePercentage(this.stackPosition, containerHeight);
    const scaleEndPositionPx = this.parsePercentage(this.scaleEndPosition, containerHeight);

    const endElement = this.useWindowScroll
      ? document.querySelector('.scroll-stack-end')
      : this.scrollerRef?.nativeElement?.querySelector('.scroll-stack-end');

    const endElementTop = endElement ? this.getElementOffset(endElement as HTMLElement) : 0;

    this.cards.forEach((card, i) => {
      if (!card) return;

      const cardTop = this.getElementOffset(card);
      const triggerStart = cardTop - stackPositionPx - this.itemStackDistance * i;
      const triggerEnd = cardTop - scaleEndPositionPx;
      const pinStart = cardTop - stackPositionPx - this.itemStackDistance * i;
      const pinEnd = endElementTop - containerHeight / 2;

      const scaleProgress = this.calculateProgress(scrollTop, triggerStart, triggerEnd);
      const targetScale = this.baseScale + i * this.itemScale;
      const scale = 1 - scaleProgress * (1 - targetScale);
      const rotation = this.rotationAmount ? i * this.rotationAmount * scaleProgress : 0;

      let blur = 0;
      if (this.blurAmount) {
        let topCardIndex = 0;
        for (let j = 0; j < this.cards.length; j++) {
          const jCardTop = this.getElementOffset(this.cards[j]);
          const jTriggerStart = jCardTop - stackPositionPx - this.itemStackDistance * j;
          if (scrollTop >= jTriggerStart) {
            topCardIndex = j;
          }
        }

        if (i < topCardIndex) {
          const depthInStack = topCardIndex - i;
          blur = Math.max(0, depthInStack * this.blurAmount);
        }
      }

      let translateY = 0;
      const isPinned = scrollTop >= pinStart && scrollTop <= pinEnd;

      if (isPinned) {
        translateY = scrollTop - cardTop + stackPositionPx + this.itemStackDistance * i;
      } else if (scrollTop > pinEnd) {
        translateY = pinEnd - cardTop + stackPositionPx + this.itemStackDistance * i;
      }

      const newTransform = {
        translateY: Math.round(translateY * 100) / 100,
        scale: Math.round(scale * 1000) / 1000,
        rotation: Math.round(rotation * 100) / 100,
        blur: Math.round(blur * 100) / 100
      };

      const lastTransform = this.lastTransforms.get(i);
      const hasChanged =
        !lastTransform ||
        Math.abs(lastTransform.translateY - newTransform.translateY) > 0.1 ||
        Math.abs(lastTransform.scale - newTransform.scale) > 0.001 ||
        Math.abs(lastTransform.rotation - newTransform.rotation) > 0.1 ||
        Math.abs(lastTransform.blur - newTransform.blur) > 0.1;

      if (hasChanged) {
        const transform = `translate3d(0, ${newTransform.translateY}px, 0) scale(${newTransform.scale}) rotate(${newTransform.rotation}deg)`;
        const filter = newTransform.blur > 0 ? `blur(${newTransform.blur}px)` : '';

        card.style.transform = transform;
        card.style.filter = filter;

        this.lastTransforms.set(i, newTransform);
      }

      if (i === this.cards.length - 1) {
        const isInView = scrollTop >= pinStart && scrollTop <= pinEnd;
        if (isInView && !this.stackCompleted) {
          this.stackCompleted = true;
          this.stackComplete.emit();
        } else if (!isInView && this.stackCompleted) {
          this.stackCompleted = false;
        }
      }
    });

    this.isUpdating = false;
  }
}

