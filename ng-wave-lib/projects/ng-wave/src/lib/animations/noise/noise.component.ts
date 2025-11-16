import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'ngw-noise',
  standalone: true,
  imports: [],
  templateUrl: './noise.component.html',
  styleUrl: './noise.component.css'
})
export class NoiseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() patternSize = 250;
  @Input() patternScaleX = 1;
  @Input() patternScaleY = 1;
  @Input() patternRefreshInterval = 2;
  @Input() patternAlpha = 15;

  private readonly platformId = inject(PLATFORM_ID);
  private animationId?: number;
  private frame = 0;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initNoise();
  }

  ngOnDestroy(): void {
    if (this.animationId !== undefined) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private initNoise(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      return;
    }

    const canvasSize = 1024;

    const resize = () => {
      if (!canvas) {
        return;
      }
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
    };

    const drawGrain = () => {
      const imageData = ctx.createImageData(canvasSize, canvasSize);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
        data[i + 3] = this.patternAlpha;
      }

      ctx.putImageData(imageData, 0, 0);
    };

    const loop = () => {
      if (this.frame % this.patternRefreshInterval === 0) {
        drawGrain();
      }
      this.frame++;
      this.animationId = requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    resize();
    loop();
  }
}

