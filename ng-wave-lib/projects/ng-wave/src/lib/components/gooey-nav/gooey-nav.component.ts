import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

interface MenuItem {
  label: string;
  href: string;
  ariaLabel?: string;
}

interface Particle {
  start: [number, number];
  end: [number, number];
  time: number;
  scale: number;
  color: number;
  rotate: number;
}

@Component({
  selector: 'ngw-gooey-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gooey-nav.component.html',
  styleUrl: './gooey-nav.component.css'
})
export class GooeyNavComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('nav', { static: false }) navRef!: ElementRef<HTMLElement>;
  @ViewChild('filter', { static: false }) filterRef!: ElementRef<HTMLElement>;
  @ViewChild('text', { static: false }) textRef!: ElementRef<HTMLElement>;

  @Input() items: MenuItem[] = [];
  @Input() animationTime = 600;
  @Input() particleCount = 15;
  @Input() particleDistances: [number, number] = [90, 10];
  @Input() particleR = 100;
  @Input() timeVariance = 300;
  @Input() colors: number[] = [1, 2, 3, 1, 2, 3, 1, 4];
  @Input() initialActiveIndex = 0;

  private readonly platformId = inject(PLATFORM_ID);
  readonly activeIndex = signal(0);
  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.activeIndex.set(this.initialActiveIndex);
    setTimeout(() => {
      this.updateEffectPosition();
      this.setupResizeObserver();
    }, 0);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private noise(n = 1): number {
    return n / 2 - Math.random() * n;
  }

  private getXY(distance: number, pointIndex: number, totalPoints: number): [number, number] {
    const angle = ((360 + this.noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  }

  private createParticle(i: number, t: number, d: [number, number], r: number): Particle {
    const rotate = this.noise(r / 10);
    return {
      start: this.getXY(d[0], this.particleCount - i, this.particleCount),
      end: this.getXY(d[1] + this.noise(7), this.particleCount - i, this.particleCount),
      time: t,
      scale: 1 + this.noise(0.2),
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  }

  private makeParticles(element: HTMLElement): void {
    const d = this.particleDistances;
    const r = this.particleR;
    const bubbleTime = this.animationTime * 2 + this.timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);

    for (let i = 0; i < this.particleCount; i++) {
      const t = this.animationTime * 2 + this.noise(this.timeVariance * 2);
      const p = this.createParticle(i, t, d, r);
      element.classList.remove('active');

      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);

        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => {
          element.classList.add('active');
        });
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch {
            // Do nothing
          }
        }, t);
      }, 30);
    }
  }

  private updateEffectPosition(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement || !this.filterRef?.nativeElement || !this.textRef?.nativeElement || !this.navRef?.nativeElement) {
      return;
    }

    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
    const activeLi = this.navRef.nativeElement.querySelectorAll('li')[this.activeIndex()];
    if (!activeLi) return;

    const pos = activeLi.getBoundingClientRect();

    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };

    Object.assign(this.filterRef.nativeElement.style, styles);
    Object.assign(this.textRef.nativeElement.style, styles);
    this.textRef.nativeElement.innerText = activeLi.textContent || '';
  }

  handleClick(index: number): void {
    if (this.activeIndex() === index) return;

    this.activeIndex.set(index);
    this.updateEffectPosition();

    if (this.filterRef?.nativeElement) {
      const particles = this.filterRef.nativeElement.querySelectorAll('.particle');
      particles.forEach(p => {
        try {
          this.filterRef.nativeElement.removeChild(p);
        } catch {
          // Do nothing
        }
      });
    }

    if (this.textRef?.nativeElement) {
      this.textRef.nativeElement.classList.remove('active');
      void this.textRef.nativeElement.offsetWidth;
      this.textRef.nativeElement.classList.add('active');
    }

    if (this.filterRef?.nativeElement) {
      this.makeParticles(this.filterRef.nativeElement);
    }
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick(index);
    }
  }

  private setupResizeObserver(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.updateEffectPosition();
    });

    this.resizeObserver.observe(this.containerRef.nativeElement);
  }
}

