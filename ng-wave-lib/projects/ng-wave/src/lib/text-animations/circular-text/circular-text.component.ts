import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  computed,
  signal,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'ngw-circular-text',
  standalone: true,
  imports: [],
  templateUrl: './circular-text.component.html',
  styleUrl: './circular-text.component.css'
})
export class CircularTextComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() text = '';
  @Input() spinDuration = 20;
  @Input() onHover: 'speedUp' | 'slowDown' | 'pause' | 'goBonkers' | null = 'speedUp';
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private animation?: gsap.core.Tween;
  private readonly rotation = signal(0);
  private isHovered = false;

  readonly letters = computed(() => Array.from(this.text));

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.startAnimation();
  }

  ngOnDestroy(): void {
    if (this.animation) {
      this.animation.kill();
    }
  }

  private startAnimation(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) {
      return;
    }

    const duration = this.isHovered ? this.getHoverDuration() : this.spinDuration;
    
    if (this.animation) {
      this.animation.kill();
    }

    const currentRotation = this.rotation();
    this.animation = gsap.to(this.containerRef.nativeElement, {
      rotation: currentRotation + 360,
      duration: duration,
      ease: 'none',
      repeat: -1,
      onUpdate: () => {
        const rotation = gsap.getProperty(this.containerRef.nativeElement, 'rotation') as number;
        this.rotation.set(rotation);
      }
    });
  }

  private getHoverDuration(): number {
    switch (this.onHover) {
      case 'slowDown':
        return this.spinDuration * 2;
      case 'speedUp':
        return this.spinDuration / 4;
      case 'goBonkers':
        return this.spinDuration / 20;
      case 'pause':
        return 999999; // Effectively pause
      default:
        return this.spinDuration;
    }
  }

  onMouseEnter(): void {
    if (!this.onHover || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isHovered = true;
    const scale = this.onHover === 'goBonkers' ? 0.8 : 1;
    
    if (this.containerRef?.nativeElement) {
      gsap.to(this.containerRef.nativeElement, {
        scale: scale,
        duration: 0.3,
        ease: 'back.out(1.4)'
      });
    }

    this.startAnimation();
  }

  onMouseLeave(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isHovered = false;
    
    if (this.containerRef?.nativeElement) {
      gsap.to(this.containerRef.nativeElement, {
        scale: 1,
        duration: 0.3,
        ease: 'back.out(1.4)'
      });
    }

    this.startAnimation();
  }

  getLetterTransform(index: number): string {
    const letterCount = this.letters().length;
    const rotationDeg = (360 / letterCount) * index;
    const factor = Math.PI / letterCount;
    const x = factor * index;
    const y = factor * index;
    return `rotateZ(${rotationDeg}deg) translate3d(${x}px, ${y}px, 0)`;
  }
}

