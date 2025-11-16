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
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'ngw-blob-cursor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blob-cursor.component.html',
  styleUrl: './blob-cursor.component.css'
})
export class BlobCursorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() blobType: 'circle' | 'square' = 'circle';
  @Input() fillColor = '#5227FF';
  @Input() trailCount = 3;
  @Input() sizes: number[] = [60, 125, 75];
  @Input() innerSizes: number[] = [20, 35, 25];
  @Input() innerColor = 'rgba(255,255,255,0.8)';
  @Input() opacities: number[] = [0.6, 0.6, 0.6];
  @Input() shadowColor = 'rgba(0,0,0,0.75)';
  @Input() shadowBlur = 5;
  @Input() shadowOffsetX = 10;
  @Input() shadowOffsetY = 10;
  @Input() filterId = 'blob';
  @Input() filterStdDeviation = 30;
  @Input() filterColorMatrixValues = '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 35 -10';
  @Input() useFilter = true;
  @Input() fastDuration = 0.1;
  @Input() slowDuration = 0.5;
  @Input() fastEase = 'power3.out';
  @Input() slowEase = 'power1.out';
  @Input() zIndex = 100;

  private readonly platformId = inject(PLATFORM_ID);
  private blobElements: HTMLElement[] = [];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initializeBlobs();
  }

  ngOnDestroy(): void {
    // Cleanup handled by Angular
  }

  private initializeBlobs(): void {
    if (!this.containerRef?.nativeElement) {
      return;
    }

    const blobMain = this.containerRef.nativeElement.querySelector('.blob-main');
    if (!blobMain) {
      return;
    }

    this.blobElements = Array.from(blobMain.querySelectorAll('.blob')) as HTMLElement[];
  }

  private updateOffset(): { left: number; top: number } {
    if (!this.containerRef?.nativeElement) {
      return { left: 0, top: 0 };
    }
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  }

  @HostListener('mousemove', ['$event'])
  @HostListener('touchmove', ['$event'])
  handleMove(event: MouseEvent | TouchEvent): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const { left, top } = this.updateOffset();
    const x = 'clientX' in event ? event.clientX : event.touches[0].clientX;
    const y = 'clientY' in event ? event.clientY : event.touches[0].clientY;

    this.blobElements.forEach((el, i) => {
      if (!el) {
        return;
      }
      const isLead = i === 0;
      gsap.to(el, {
        x: x - left,
        y: y - top,
        duration: isLead ? this.fastDuration : this.slowDuration,
        ease: isLead ? this.fastEase : this.slowEase
      });
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    // Offset will be recalculated on next move
  }

  getBlobStyle(index: number): Record<string, string> {
    const size = this.sizes[index] || this.sizes[0];
    return {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: this.blobType === 'circle' ? '50%' : '0%',
      backgroundColor: this.fillColor,
      opacity: String(this.opacities[index] || this.opacities[0]),
      boxShadow: `${this.shadowOffsetX}px ${this.shadowOffsetY}px ${this.shadowBlur}px 0 ${this.shadowColor}`
    };
  }

  getInnerDotStyle(index: number): Record<string, string> {
    const size = this.sizes[index] || this.sizes[0];
    const innerSize = this.innerSizes[index] || this.innerSizes[0];
    return {
      width: `${innerSize}px`,
      height: `${innerSize}px`,
      top: `${(size - innerSize) / 2}px`,
      left: `${(size - innerSize) / 2}px`,
      backgroundColor: this.innerColor,
      borderRadius: this.blobType === 'circle' ? '50%' : '0%'
    };
  }
}

