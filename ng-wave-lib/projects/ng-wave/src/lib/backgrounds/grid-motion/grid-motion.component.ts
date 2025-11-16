import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  HostListener,
  computed
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'ngw-grid-motion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid-motion.component.html',
  styleUrl: './grid-motion.component.css'
})
export class GridMotionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gridRef', { static: false }) gridRef!: ElementRef<HTMLDivElement>;
  @ViewChild('row0', { static: false }) row0!: ElementRef<HTMLDivElement>;
  @ViewChild('row1', { static: false }) row1!: ElementRef<HTMLDivElement>;
  @ViewChild('row2', { static: false }) row2!: ElementRef<HTMLDivElement>;
  @ViewChild('row3', { static: false }) row3!: ElementRef<HTMLDivElement>;

  @Input() items: string[] = [];
  @Input() gradientColor = 'black';
  @Input() className = '';
  @Input() style: Record<string, string> = {};

  private readonly platformId = inject(PLATFORM_ID);
  private readonly totalItems = 28;
  private mouseX = 0;
  private tickerRemove?: () => void;

  readonly combinedItems = computed(() => {
    const defaultItems = Array.from({ length: this.totalItems }, (_, index) => `Item ${index + 1}`);
    return this.items.length > 0 ? this.items.slice(0, this.totalItems) : defaultItems;
  });

  getRowRefs(): Array<ElementRef<HTMLDivElement> | undefined> {
    return [this.row0, this.row1, this.row2, this.row3];
  }

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
    gsap.ticker.lagSmoothing(0);
    this.mouseX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
    this.tickerRemove = gsap.ticker.add(() => this.updateMotion());
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
  }

  private updateMotion(): void {
    const maxMoveAmount = 300;
    const baseDuration = 0.8;
    const inertiaFactors = [0.6, 0.4, 0.3, 0.2];
    const rowRefs = this.getRowRefs();

    rowRefs.forEach((row, index) => {
      if (row?.nativeElement) {
        const direction = index % 2 === 0 ? 1 : -1;
        const moveAmount = ((this.mouseX / (typeof window !== 'undefined' ? window.innerWidth : 1)) * maxMoveAmount - maxMoveAmount / 2) * direction;

        gsap.to(row.nativeElement, {
          x: moveAmount,
          duration: baseDuration + inertiaFactors[index % inertiaFactors.length],
          ease: 'power3.out',
          overwrite: 'auto'
        });
      }
    });
  }

  private cleanup(): void {
    if (this.tickerRemove) {
      this.tickerRemove();
    }
  }

  getGradientStyle(): Record<string, string> {
    return {
      background: `radial-gradient(circle, ${this.gradientColor} 0%, transparent 100%)`
    };
  }

  getContainerStyle(): Record<string, string> {
    return {
      position: 'relative',
      width: '100%',
      height: '100%',
      ...this.style
    };
  }

  isImageUrl(content: string): boolean {
    if (typeof content !== 'string') return false;
    return content.startsWith('http') || 
           content.startsWith('//') || 
           (content.startsWith('/') && /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(content));
  }
}

