import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  ContentChildren,
  QueryList,
  AfterViewInit,
  OnDestroy,
  HostListener,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface Slot {
  x: number;
  y: number;
  z: number;
  zIndex: number;
}

interface AnimationConfig {
  ease: string;
  durDrop: number;
  durMove: number;
  durReturn: number;
  promoteOverlap: number;
  returnDelay: number;
}

@Component({
  selector: 'ngw-card',
  standalone: true,
  imports: [CommonModule],
  template: '<div [class]="\'card-swap-card \' + (customClass || \'\') + \' \' + (className || \'\')"><ng-content></ng-content></div>'
})
export class CardComponent {
  @Input() customClass = '';
  @Input() className = '';
}

@Component({
  selector: 'ngw-card-swap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-swap.component.html',
  styleUrl: './card-swap.component.css'
})
export class CardSwapComponent implements AfterViewInit, OnDestroy {
  @ContentChildren(CardComponent, { read: ElementRef }) cardRefs!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() width = 500;
  @Input() height = 400;
  @Input() cardDistance = 60;
  @Input() verticalDistance = 70;
  @Input() delay = 5000;
  @Input() pauseOnHover = false;
  @Input() skewAmount = 6;
  @Input() easing: 'elastic' | 'smooth' = 'elastic';

  @Output() cardClick = new EventEmitter<number>();

  private readonly platformId = inject(PLATFORM_ID);
  private order: number[] = [];
  private timeline: gsap.core.Timeline | null = null;
  private intervalId: number | null = null;
  private isPaused = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      this.initialize();
    }, 0);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private getConfig(): AnimationConfig {
    if (this.easing === 'elastic') {
      return {
        ease: 'elastic.out(0.6,0.9)',
        durDrop: 2,
        durMove: 2,
        durReturn: 2,
        promoteOverlap: 0.9,
        returnDelay: 0.05
      };
    } else {
      return {
        ease: 'power1.inOut',
        durDrop: 0.8,
        durMove: 0.8,
        durReturn: 0.8,
        promoteOverlap: 0.45,
        returnDelay: 0.2
      };
    }
  }

  private makeSlot(i: number, distX: number, distY: number, total: number): Slot {
    return {
      x: i * distX,
      y: -i * distY,
      z: -i * distX * 1.5,
      zIndex: total - i
    };
  }

  private placeNow(el: HTMLElement, slot: Slot, skew: number): void {
    gsap.set(el, {
      x: slot.x,
      y: slot.y,
      z: slot.z,
      xPercent: -50,
      yPercent: -50,
      skewY: skew,
      transformOrigin: 'center center',
      zIndex: slot.zIndex,
      force3D: true
    });
  }

  private initialize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const refs = this.cardRefs.toArray();
    const total = refs.length;
    this.order = Array.from({ length: total }, (_, i) => i);

    refs.forEach((ref, i) => {
      if (ref.nativeElement) {
        this.placeNow(ref.nativeElement, this.makeSlot(i, this.cardDistance, this.verticalDistance, total), this.skewAmount);
      }
    });

    this.swap();
    this.intervalId = window.setInterval(() => {
      if (!this.isPaused) {
        this.swap();
      }
    }, this.delay);
  }

  private swap(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const refs = this.cardRefs.toArray();
    if (this.order.length < 2) return;

    const [front, ...rest] = this.order;
    const elFront = refs[front]?.nativeElement;
    if (!elFront) return;

    const config = this.getConfig();
    const tl = gsap.timeline();
    this.timeline = tl;

    tl.to(elFront, {
      y: '+=500',
      duration: config.durDrop,
      ease: config.ease
    });

    tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);
    rest.forEach((idx, i) => {
      const el = refs[idx]?.nativeElement;
      if (!el) return;

      const slot = this.makeSlot(i, this.cardDistance, this.verticalDistance, refs.length);
      tl.set(el, { zIndex: slot.zIndex }, 'promote');
      tl.to(
        el,
        {
          x: slot.x,
          y: slot.y,
          z: slot.z,
          duration: config.durMove,
          ease: config.ease
        },
        `promote+=${i * 0.15}`
      );
    });

    const backSlot = this.makeSlot(refs.length - 1, this.cardDistance, this.verticalDistance, refs.length);
    tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);
    tl.call(
      () => {
        if (elFront) {
          gsap.set(elFront, { zIndex: backSlot.zIndex });
        }
      },
      undefined,
      'return'
    );
    tl.to(
      elFront,
      {
        x: backSlot.x,
        y: backSlot.y,
        z: backSlot.z,
        duration: config.durReturn,
        ease: config.ease
      },
      'return'
    );

    tl.call(() => {
      this.order = [...rest, front];
    });
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.pauseOnHover) {
      this.isPaused = true;
      this.timeline?.pause();
      if (this.intervalId !== null) {
        clearInterval(this.intervalId);
      }
    }
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (this.pauseOnHover) {
      this.isPaused = false;
      this.timeline?.play();
      this.intervalId = window.setInterval(() => {
        if (!this.isPaused) {
          this.swap();
        }
      }, this.delay);
    }
  }

  onCardClick(index: number): void {
    this.cardClick.emit(index);
  }

  private cleanup(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
    this.timeline?.kill();
  }
}

