import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  HostListener,
  inject,
  PLATFORM_ID,
  signal,
  computed
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface MasonryItem {
  id: string;
  img: string;
  url: string;
  height: number;
}

interface GridItem extends MasonryItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      src =>
        new Promise<void>(resolve => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        })
    )
  ).then(() => {});
}

@Component({
  selector: 'ngw-masonry',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './masonry.component.html',
  styleUrl: './masonry.component.css'
})
export class MasonryComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() items: MasonryItem[] = [];
  @Input() ease = 'power3.out';
  @Input() duration = 0.6;
  @Input() stagger = 0.05;
  @Input() animateFrom: string = 'bottom';
  @Input() scaleOnHover = true;
  @Input() hoverScale = 0.95;
  @Input() blurToFocus = true;
  @Input() colorShiftOnHover = false;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly width = signal(0);
  private readonly imagesReady = signal(false);
  private hasMounted = false;
  private resizeObserver?: ResizeObserver;
  private mediaQueries: MediaQueryList[] = [];
  private mediaHandlers: (() => void)[] = [];
  private readonly columns = signal(1);

  readonly grid = computed<GridItem[]>(() => {
    const w = this.width();
    const cols = this.columns();
    if (!w || !this.items.length) return [];

    const colHeights = new Array(cols).fill(0);
    const columnWidth = w / cols;

    return this.items.map(child => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * col;
      const height = child.height / 2;
      const y = colHeights[col];

      colHeights[col] += height;

      return { ...child, x, y, w: columnWidth, h: height };
    });
  });

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.setupMediaQueries();
    this.setupResizeObserver();
    this.preloadImages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (changes['items']) {
      this.imagesReady.set(false);
      this.preloadImages();
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.mediaQueries.forEach((mq, i) => {
      mq.removeEventListener('change', this.mediaHandlers[i]);
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // ResizeObserver handles this
  }

  private setupMediaQueries(): void {
    const queries = [
      '(min-width:1500px)',
      '(min-width:1000px)',
      '(min-width:600px)',
      '(min-width:400px)'
    ];
    const values = [5, 4, 3, 2];
    const defaultValue = 1;

    const getColumns = (): number => {
      const index = queries.findIndex(q => window.matchMedia(q).matches);
      return index >= 0 ? values[index] : defaultValue;
    };

    this.columns.set(getColumns());

    queries.forEach((query, i) => {
      const mq = window.matchMedia(query);
      const handler = () => {
        this.columns.set(getColumns());
      };
      mq.addEventListener('change', handler);
      this.mediaQueries.push(mq);
      this.mediaHandlers.push(handler);
    });
  }

  private setupResizeObserver(): void {
    if (!this.containerRef?.nativeElement) return;

    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect;
      this.width.set(width);
      if (this.imagesReady() && this.hasMounted) {
        this.animateGrid();
      }
    });

    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private async preloadImages(): Promise<void> {
    if (!this.items.length) return;

    await preloadImages(this.items.map(i => i.img));
    this.imagesReady.set(true);
    setTimeout(() => {
      this.animateGrid(true);
      this.hasMounted = true;
    }, 0);
  }

  private animateGrid(isInitial = false): void {
    const grid = this.grid();
    if (!grid.length || !this.imagesReady()) return;

    grid.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`;
      const animationProps = {
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h
      };

      if (isInitial && !this.hasMounted) {
        const initialPos = this.getInitialPosition(item);
        const initialState = {
          opacity: 0,
          x: initialPos.x,
          y: initialPos.y,
          width: item.w,
          height: item.h,
          ...(this.blurToFocus && { filter: 'blur(10px)' })
        };

        gsap.fromTo(selector, initialState, {
          opacity: 1,
          ...animationProps,
          ...(this.blurToFocus && { filter: 'blur(0px)' }),
          duration: 0.8,
          ease: this.ease,
          delay: index * this.stagger
        });
      } else {
        gsap.to(selector, {
          ...animationProps,
          duration: this.duration,
          ease: this.ease,
          overwrite: 'auto'
        });
      }
    });
  }

  private getInitialPosition(item: GridItem): { x: number; y: number } {
    const containerRect = this.containerRef?.nativeElement?.getBoundingClientRect();
    if (!containerRect) return { x: item.x, y: item.y };

    let direction = this.animateFrom;

    if (this.animateFrom === 'random') {
      const directions: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
      direction = directions[Math.floor(Math.random() * directions.length)];
    }

    switch (direction) {
      case 'top':
        return { x: item.x, y: -200 };
      case 'bottom':
        return { x: item.x, y: window.innerHeight + 200 };
      case 'left':
        return { x: -200, y: item.y };
      case 'right':
        return { x: window.innerWidth + 200, y: item.y };
      case 'center':
        return {
          x: containerRect.width / 2 - item.w / 2,
          y: containerRect.height / 2 - item.h / 2
        };
      default:
        return { x: item.x, y: item.y + 100 };
    }
  }

  onItemMouseEnter(item: GridItem, event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const selector = `[data-key="${item.id}"]`;

    if (this.scaleOnHover) {
      gsap.to(selector, {
        scale: this.hoverScale,
        duration: 0.3,
        ease: 'power2.out'
      });
    }

    if (this.colorShiftOnHover) {
      const overlay = element.querySelector('.color-overlay');
      if (overlay) {
        gsap.to(overlay, {
          opacity: 0.3,
          duration: 0.3
        });
      }
    }
  }

  onItemMouseLeave(item: GridItem, event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const selector = `[data-key="${item.id}"]`;

    if (this.scaleOnHover) {
      gsap.to(selector, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
    }

    if (this.colorShiftOnHover) {
      const overlay = element.querySelector('.color-overlay');
      if (overlay) {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.3
        });
      }
    }
  }

  onItemClick(item: MasonryItem): void {
    window.open(item.url, '_blank', 'noopener');
  }
}

