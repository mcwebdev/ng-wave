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

@Component({
  selector: 'ngw-glass-surface',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './glass-surface.component.html',
  styleUrl: './glass-surface.component.css'
})
export class GlassSurfaceComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('feImage', { static: false }) feImageRef!: ElementRef<SVGFEImageElement>;
  @ViewChild('redChannel', { static: false }) redChannelRef!: ElementRef<SVGFEDisplacementMapElement>;
  @ViewChild('greenChannel', { static: false }) greenChannelRef!: ElementRef<SVGFEDisplacementMapElement>;
  @ViewChild('blueChannel', { static: false }) blueChannelRef!: ElementRef<SVGFEDisplacementMapElement>;
  @ViewChild('gaussianBlur', { static: false }) gaussianBlurRef!: ElementRef<SVGFEGaussianBlurElement>;

  @Input() width: number | string = 200;
  @Input() height: number | string = 80;
  @Input() borderRadius = 20;
  @Input() borderWidth = 0.07;
  @Input() brightness = 50;
  @Input() opacity = 0.93;
  @Input() blur = 11;
  @Input() displace = 0;
  @Input() backgroundOpacity = 0;
  @Input() saturation = 1;
  @Input() distortionScale = -180;
  @Input() redOffset = 0;
  @Input() greenOffset = 10;
  @Input() blueOffset = 20;
  @Input() xChannel: 'R' | 'G' | 'B' = 'R';
  @Input() yChannel: 'R' | 'G' | 'B' = 'G';
  @Input() mixBlendMode = 'difference';
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private uniqueId = `glass-${Math.random().toString(36).substr(2, 9)}`;
  private resizeObserver: ResizeObserver | null = null;

  readonly filterId = `glass-filter-${this.uniqueId}`;
  readonly redGradId = `red-grad-${this.uniqueId}`;
  readonly blueGradId = `blue-grad-${this.uniqueId}`;
  readonly displacementMapUrl = signal<string>('');

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      this.updateDisplacementMap();
      this.setupResizeObserver();
    }, 0);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  private generateDisplacementMap(): string {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) {
      return '';
    }

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const actualWidth = rect?.width || 400;
    const actualHeight = rect?.height || 200;
    const edgeSize = Math.min(actualWidth, actualHeight) * (this.borderWidth * 0.5);

    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${this.redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${this.blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${this.borderRadius}" fill="url(#${this.redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${this.borderRadius}" fill="url(#${this.blueGradId})" style="mix-blend-mode: ${this.mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${this.borderRadius}" fill="hsl(0 0% ${this.brightness}% / ${this.opacity})" style="filter:blur(${this.blur}px)" />
      </svg>
    `;

    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  }

  private updateDisplacementMap(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const mapUrl = this.generateDisplacementMap();
    this.displacementMapUrl.set(mapUrl);
    if (this.feImageRef?.nativeElement && mapUrl) {
      this.feImageRef.nativeElement.setAttribute('href', mapUrl);
    }

    const channels = [
      { ref: this.redChannelRef, offset: this.redOffset },
      { ref: this.greenChannelRef, offset: this.greenOffset },
      { ref: this.blueChannelRef, offset: this.blueOffset }
    ];

    channels.forEach(({ ref, offset }) => {
      if (ref?.nativeElement) {
        ref.nativeElement.setAttribute('scale', String(this.distortionScale + offset));
        ref.nativeElement.setAttribute('xChannelSelector', this.xChannel);
        ref.nativeElement.setAttribute('yChannelSelector', this.yChannel);
      }
    });

    if (this.gaussianBlurRef?.nativeElement) {
      this.gaussianBlurRef.nativeElement.setAttribute('stdDeviation', String(this.displace));
    }
  }

  private setupResizeObserver(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        this.updateDisplacementMap();
      }, 0);
    });

    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  supportsSVGFilters(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);

    if (isWebkit || isFirefox) {
      return false;
    }

    const div = document.createElement('div');
    div.style.backdropFilter = `url(#${this.filterId})`;
    return div.style.backdropFilter !== '';
  }

  getContainerStyle(): Record<string, string> {
    return {
      width: typeof this.width === 'number' ? `${this.width}px` : this.width,
      height: typeof this.height === 'number' ? `${this.height}px` : this.height,
      borderRadius: `${this.borderRadius}px`,
      '--glass-frost': String(this.backgroundOpacity),
      '--glass-saturation': String(this.saturation),
      '--filter-id': `url(#${this.filterId})`
    };
  }
}

