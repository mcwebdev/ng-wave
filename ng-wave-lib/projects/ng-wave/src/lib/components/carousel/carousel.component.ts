import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostListener,
  inject,
  PLATFORM_ID,
  signal,
  computed
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

interface CarouselItem {
  title: string;
  description: string;
  id: number;
  icon?: string;
}

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;

@Component({
  selector: 'ngw-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel.component.html',
  styleUrl: './carousel.component.css'
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('track', { static: false }) trackRef!: ElementRef<HTMLDivElement>;

  @Input() items: CarouselItem[] = [];
  @Input() baseWidth = 300;
  @Input() autoplay = false;
  @Input() autoplayDelay = 3000;
  @Input() pauseOnHover = false;
  @Input() loop = false;
  @Input() round = false;

  private readonly platformId = inject(PLATFORM_ID);
  private currentIndex = signal(0);
  private isHovered = signal(false);
  private isResetting = signal(false);
  private autoplayTimer: number | null = null;
  private draggable: Draggable | null = null;
  private trackTween: gsap.core.Tween | null = null;

  readonly containerPadding = 16;
  readonly itemWidth = computed(() => this.baseWidth - this.containerPadding * 2);
  readonly trackItemOffset = computed(() => this.itemWidth() + GAP);
  readonly carouselItems = computed(() => (this.loop ? [...this.items, this.items[0]] : this.items));

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      this.setupDraggable();
      this.updatePosition();
      if (this.autoplay) {
        this.startAutoplay();
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private setupDraggable(): void {
    if (!isPlatformBrowser(this.platformId) || !this.trackRef?.nativeElement) {
      return;
    }

    const constraints = this.loop
      ? {}
      : {
        left: -this.trackItemOffset() * (this.carouselItems().length - 1),
        right: 0
      };

    this.draggable = Draggable.create(this.trackRef.nativeElement, {
      type: 'x',
      bounds: constraints,
      onDragEnd: () => {
        const x = this.draggable?.x || 0;
        const offset = -x - this.currentIndex() * this.trackItemOffset();
        // GSAP Draggable doesn't have getVelocity in all versions, use deltaX as fallback
        const deltaX = (this.draggable as any)?.deltaX || 0;
        const velocity = deltaX * 0.1; // Approximate velocity from delta

        if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
          this.next();
        } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
          this.prev();
        } else {
          this.updatePosition();
        }
      }
    })[0];
  }

  private updatePosition(): void {
    if (!isPlatformBrowser(this.platformId) || !this.trackRef?.nativeElement) {
      return;
    }

    const targetX = -(this.currentIndex() * this.trackItemOffset());
    const duration = this.isResetting() ? 0 : 0.6;

    this.trackTween?.kill();
    this.trackTween = gsap.to(this.trackRef.nativeElement, {
      x: targetX,
      duration,
      ease: 'power2.out',
      onComplete: () => {
        if (this.loop && this.currentIndex() === this.carouselItems().length - 1) {
          this.isResetting.set(true);
          gsap.set(this.trackRef.nativeElement, { x: 0 });
          this.currentIndex.set(0);
          setTimeout(() => {
            this.isResetting.set(false);
          }, 50);
        }
      }
    });
  }

  private startAutoplay(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.autoplayTimer = window.setInterval(() => {
      if (!this.pauseOnHover || !this.isHovered()) {
        if (this.currentIndex() === this.items.length - 1 && this.loop) {
          this.currentIndex.set(this.currentIndex() + 1);
        } else if (this.currentIndex() === this.carouselItems().length - 1) {
          this.currentIndex.set(this.loop ? 0 : this.currentIndex());
        } else {
          this.currentIndex.set(this.currentIndex() + 1);
        }
        this.updatePosition();
      }
    }, this.autoplayDelay);
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isHovered.set(true);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHovered.set(false);
  }

  next(): void {
    if (this.loop && this.currentIndex() === this.items.length - 1) {
      this.currentIndex.set(this.currentIndex() + 1);
    } else {
      this.currentIndex.set(Math.min(this.currentIndex() + 1, this.carouselItems().length - 1));
    }
    this.updatePosition();
  }

  prev(): void {
    if (this.loop && this.currentIndex() === 0) {
      this.currentIndex.set(this.items.length - 1);
    } else {
      this.currentIndex.set(Math.max(this.currentIndex() - 1, 0));
    }
    this.updatePosition();
  }

  goToIndex(index: number): void {
    this.currentIndex.set(index);
    this.updatePosition();
  }

  getCurrentIndex(): number {
    return this.currentIndex() % this.items.length;
  }

  getRotateY(index: number): number {
    const currentX = -(this.currentIndex() * this.trackItemOffset());
    const itemX = -(index * this.trackItemOffset());
    const diff = currentX - itemX;
    const range = this.trackItemOffset();
    const ratio = diff / range;
    return Math.max(-90, Math.min(90, ratio * 90));
  }

  private cleanup(): void {
    if (this.autoplayTimer !== null) {
      clearInterval(this.autoplayTimer);
    }
    this.draggable?.kill();
    this.trackTween?.kill();
  }
}

