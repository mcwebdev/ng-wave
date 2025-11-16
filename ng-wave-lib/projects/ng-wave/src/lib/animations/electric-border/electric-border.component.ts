import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  Injector
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ngw-electric-border',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './electric-border.component.html',
  styleUrl: './electric-border.component.css'
})
export class ElectricBorderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: false }) rootRef!: ElementRef<HTMLDivElement>;
  @ViewChild('svg', { static: false }) svgRef!: ElementRef<SVGSVGElement>;
  @ViewChild('stroke', { static: false }) strokeRef!: ElementRef<HTMLDivElement>;

  @Input() color = '#5227FF';
  @Input() speed = 1;
  @Input() chaos = 1;
  @Input() thickness = 2;
  @Input() className = '';
  @Input() style: Record<string, string> = {};

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private resizeObserver?: ResizeObserver;
  private filterId = `turbulent-displace-${Math.random().toString(36).substring(2, 11)}`;

  readonly cssVars = computed(() => ({
    '--electric-border-color': this.color,
    '--eb-border-width': `${this.thickness}px`
  }));

  readonly mergedStyles = computed(() => {
    return { ...this.cssVars(), ...this.style };
  });

  constructor() {
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.updateAnim();
      }
    }, { injector: this.injector });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.setupResizeObserver();
    this.updateAnim();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private setupResizeObserver(): void {
    if (!this.rootRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.updateAnim();
    });

    this.resizeObserver.observe(this.rootRef.nativeElement);
  }

  private updateAnim(): void {
    if (!isPlatformBrowser(this.platformId) || !this.svgRef?.nativeElement || !this.rootRef?.nativeElement) {
      return;
    }

    const svg = this.svgRef.nativeElement;
    const host = this.rootRef.nativeElement;

    if (this.strokeRef?.nativeElement) {
      this.strokeRef.nativeElement.style.filter = `url(#${this.filterId})`;
    }

    const width = Math.max(1, Math.round(host.clientWidth || host.getBoundingClientRect().width || 0));
    const height = Math.max(1, Math.round(host.clientHeight || host.getBoundingClientRect().height || 0));

    const dyAnims = Array.from(svg.querySelectorAll('feOffset > animate[attributeName="dy"]'));
    if (dyAnims.length >= 2) {
      dyAnims[0].setAttribute('values', `${height}; 0`);
      dyAnims[1].setAttribute('values', `0; -${height}`);
    }

    const dxAnims = Array.from(svg.querySelectorAll('feOffset > animate[attributeName="dx"]'));
    if (dxAnims.length >= 2) {
      dxAnims[0].setAttribute('values', `${width}; 0`);
      dxAnims[1].setAttribute('values', `0; -${width}`);
    }

    const baseDur = 6;
    const dur = Math.max(0.001, baseDur / (this.speed || 1));
    [...dyAnims, ...dxAnims].forEach(a => a.setAttribute('dur', `${dur}s`));

    const disp = svg.querySelector('feDisplacementMap');
    if (disp) {
      disp.setAttribute('scale', String(30 * (this.chaos || 1)));
    }

    const filterEl = svg.querySelector(`#${CSS.escape(this.filterId)}`);
    if (filterEl) {
      filterEl.setAttribute('x', '-200%');
      filterEl.setAttribute('y', '-200%');
      filterEl.setAttribute('width', '500%');
      filterEl.setAttribute('height', '500%');
    }

    requestAnimationFrame(() => {
      [...dyAnims, ...dxAnims].forEach(a => {
        if (typeof (a as any).beginElement === 'function') {
          try {
            (a as any).beginElement();
          } catch {
            console.warn('ElectricBorder: beginElement failed, this may be due to a browser limitation.');
          }
        }
      });
    });
  }

  getFilterId(): string {
    return this.filterId;
  }
}

