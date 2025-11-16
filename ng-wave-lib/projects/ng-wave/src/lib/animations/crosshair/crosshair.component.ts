import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostListener,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';

interface RenderedStyle {
  previous: number;
  current: number;
  amt: number;
}

@Component({
  selector: 'ngw-crosshair',
  standalone: true,
  imports: [],
  templateUrl: './crosshair.component.html',
  styleUrl: './crosshair.component.css'
})
export class CrosshairComponent implements AfterViewInit, OnDestroy {
  @ViewChild('lineHorizontal', { static: false }) lineHorizontalRef!: ElementRef<HTMLDivElement>;
  @ViewChild('lineVertical', { static: false }) lineVerticalRef!: ElementRef<HTMLDivElement>;
  @ViewChild('filterX', { static: false }) filterXRef!: ElementRef<SVGFETurbulenceElement>;
  @ViewChild('filterY', { static: false }) filterYRef!: ElementRef<SVGFETurbulenceElement>;

  @Input() color = 'white';
  @Input() containerRef?: ElementRef<HTMLElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private mouse = { x: 0, y: 0 };
  private renderedStyles: { tx: RenderedStyle; ty: RenderedStyle } = {
    tx: { previous: 0, current: 0, amt: 0.15 },
    ty: { previous: 0, current: 0, amt: 0.15 }
  };
  private animationId?: number;
  private mouseMoveHandler?: EventListener;
  private onMouseMoveHandler?: EventListener;
  private enterHandler?: () => void;
  private leaveHandler?: () => void;
  private links: NodeListOf<HTMLAnchorElement> | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.setupCrosshair();
  }

  ngOnDestroy(): void {
    if (this.animationId !== undefined) {
      cancelAnimationFrame(this.animationId);
    }
    this.cleanup();
  }

  private lerp(a: number, b: number, n: number): number {
    return (1 - n) * a + n * b;
  }

  private getMousePos(e: MouseEvent, container: HTMLElement | null): { x: number; y: number } {
    if (container) {
      const bounds = container.getBoundingClientRect();
      return {
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top
      };
    }
    return { x: e.clientX, y: e.clientY };
  }

  private setupCrosshair(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = this.containerRef?.nativeElement || window;

    this.mouseMoveHandler = (ev: Event) => {
      const mouseEv = ev as MouseEvent;
      this.mouse = this.getMousePos(mouseEv, this.containerRef?.nativeElement || null);

      if (this.containerRef?.nativeElement) {
        const bounds = this.containerRef.nativeElement.getBoundingClientRect();
        if (
          mouseEv.clientX < bounds.left ||
          mouseEv.clientX > bounds.right ||
          mouseEv.clientY < bounds.top ||
          mouseEv.clientY > bounds.bottom
        ) {
          gsap.to([this.lineHorizontalRef?.nativeElement, this.lineVerticalRef?.nativeElement], { opacity: 0 });
        } else {
          gsap.to([this.lineHorizontalRef?.nativeElement, this.lineVerticalRef?.nativeElement], { opacity: 1 });
        }
      }
    };

    target.addEventListener('mousemove', this.mouseMoveHandler);

    gsap.set([this.lineHorizontalRef?.nativeElement, this.lineVerticalRef?.nativeElement], { opacity: 0 });

    this.onMouseMoveHandler = () => {
      this.renderedStyles.tx.previous = this.renderedStyles.tx.current = this.mouse.x;
      this.renderedStyles.ty.previous = this.renderedStyles.ty.current = this.mouse.y;

      gsap.to([this.lineHorizontalRef?.nativeElement, this.lineVerticalRef?.nativeElement], {
        duration: 0.9,
        ease: 'Power3.easeOut',
        opacity: 1
      });

      this.animationId = requestAnimationFrame(() => this.render());

      target.removeEventListener('mousemove', this.onMouseMoveHandler!);
    };

    target.addEventListener('mousemove', this.onMouseMoveHandler);

    const primitiveValues = { turbulence: 0 };

    const tl = gsap
      .timeline({
        paused: true,
        onStart: () => {
          if (this.lineHorizontalRef?.nativeElement && this.lineVerticalRef?.nativeElement) {
            this.lineHorizontalRef.nativeElement.style.filter = 'url(#filter-noise-x)';
            this.lineVerticalRef.nativeElement.style.filter = 'url(#filter-noise-y)';
          }
        },
        onUpdate: () => {
          if (this.filterXRef?.nativeElement && this.filterYRef?.nativeElement) {
            this.filterXRef.nativeElement.setAttribute('baseFrequency', String(primitiveValues.turbulence));
            this.filterYRef.nativeElement.setAttribute('baseFrequency', String(primitiveValues.turbulence));
          }
        },
        onComplete: () => {
          if (this.lineHorizontalRef?.nativeElement && this.lineVerticalRef?.nativeElement) {
            this.lineHorizontalRef.nativeElement.style.filter = 'none';
            this.lineVerticalRef.nativeElement.style.filter = 'none';
          }
        }
      })
      .to(primitiveValues, {
        duration: 0.5,
        ease: 'power1',
        startAt: { turbulence: 1 },
        turbulence: 0
      });

    this.enterHandler = () => tl.restart();
    this.leaveHandler = () => tl.progress(1).kill();

    this.links = this.containerRef?.nativeElement
      ? this.containerRef.nativeElement.querySelectorAll('a')
      : document.querySelectorAll('a');

    this.links.forEach(link => {
      link.addEventListener('mouseenter', this.enterHandler!);
      link.addEventListener('mouseleave', this.leaveHandler!);
    });
  }

  private render(): void {
    this.renderedStyles.tx.current = this.mouse.x;
    this.renderedStyles.ty.current = this.mouse.y;

    for (const key in this.renderedStyles) {
      const style = this.renderedStyles[key as keyof typeof this.renderedStyles];
      style.previous = this.lerp(style.previous, style.current, style.amt);
    }

    if (this.lineHorizontalRef?.nativeElement && this.lineVerticalRef?.nativeElement) {
      gsap.set(this.lineVerticalRef.nativeElement, { x: this.renderedStyles.tx.previous });
      gsap.set(this.lineHorizontalRef.nativeElement, { y: this.renderedStyles.ty.previous });
    }

    this.animationId = requestAnimationFrame(() => this.render());
  }

  private cleanup(): void {
    const target = this.containerRef?.nativeElement || window;

    if (this.mouseMoveHandler) {
      target.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.onMouseMoveHandler) {
      target.removeEventListener('mousemove', this.onMouseMoveHandler);
    }
    if (this.links && this.enterHandler && this.leaveHandler) {
      this.links.forEach(link => {
        link.removeEventListener('mouseenter', this.enterHandler!);
        link.removeEventListener('mouseleave', this.leaveHandler!);
      });
    }
  }
}

