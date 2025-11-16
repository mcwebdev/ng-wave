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
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

@Component({
  selector: 'ngw-tilted-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tilted-card.component.html',
  styleUrl: './tilted-card.component.css'
})
export class TiltedCardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('figure', { static: false }) figureRef!: ElementRef<HTMLElement>;
  @ViewChild('inner', { static: false }) innerRef!: ElementRef<HTMLElement>;
  @ViewChild('caption', { static: false }) captionRef!: ElementRef<HTMLElement>;

  @Input() imageSrc = '';
  @Input() altText = 'Tilted card image';
  @Input() captionText = '';
  @Input() containerHeight = '300px';
  @Input() containerWidth = '100%';
  @Input() imageHeight = '300px';
  @Input() imageWidth = '300px';
  @Input() scaleOnHover = 1.1;
  @Input() rotateAmplitude = 14;
  @Input() showMobileWarning = true;
  @Input() showTooltip = true;
  @Input() displayOverlayContent = false;

  private readonly platformId = inject(PLATFORM_ID);
  private springConfig: SpringConfig = { damping: 30, stiffness: 100, mass: 2 };
  private lastY = 0;
  private rotateXTween: gsap.core.Tween | null = null;
  private rotateYTween: gsap.core.Tween | null = null;
  private scaleTween: gsap.core.Tween | null = null;
  private opacityTween: gsap.core.Tween | null = null;
  private rotateCaptionTween: gsap.core.Tween | null = null;
  private captionXTween: gsap.core.Tween | null = null;
  private captionYTween: gsap.core.Tween | null = null;

  currentRotateX = signal(0);
  currentRotateY = signal(0);
  currentScale = signal(1);
  captionOpacity = signal(0);
  captionX = signal(0);
  captionY = signal(0);
  captionRotate = signal(0);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initializeAnimations();
  }

  ngOnDestroy(): void {
    this.cleanupAnimations();
  }

  private initializeAnimations(): void {
    if (!isPlatformBrowser(this.platformId) || !this.innerRef?.nativeElement) {
      return;
    }

    // Initialize GSAP quick setter for smooth spring animations
    gsap.set(this.innerRef.nativeElement, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      transformStyle: 'preserve-3d'
    });

    if (this.captionRef?.nativeElement) {
      gsap.set(this.captionRef.nativeElement, {
        opacity: 0,
        x: 0,
        y: 0,
        rotate: 0
      });
    }
  }

  private cleanupAnimations(): void {
    this.rotateXTween?.kill();
    this.rotateYTween?.kill();
    this.scaleTween?.kill();
    this.opacityTween?.kill();
    this.rotateCaptionTween?.kill();
    this.captionXTween?.kill();
    this.captionYTween?.kill();
  }

  private animateTo(
    target: HTMLElement,
    property: string,
    value: number,
    config: SpringConfig
  ): gsap.core.Tween {
    return gsap.to(target, {
      [property]: value,
      duration: 0.3,
      ease: `power2.out`,
      overwrite: 'auto'
    });
  }

  @HostListener('mousemove', ['$event'])
  handleMouseMove(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.figureRef?.nativeElement || !this.innerRef?.nativeElement) {
      return;
    }

    const rect = this.figureRef.nativeElement.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -this.rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * this.rotateAmplitude;

    // Animate rotation with spring-like easing
    this.rotateXTween?.kill();
    this.rotateYTween?.kill();
    this.rotateXTween = this.animateTo(this.innerRef.nativeElement, 'rotateX', rotationX, this.springConfig);
    this.rotateYTween = this.animateTo(this.innerRef.nativeElement, 'rotateY', rotationY, this.springConfig);

    // Update caption position
    const captionX = event.clientX - rect.left;
    const captionY = event.clientY - rect.top;

    this.captionX.set(captionX);
    this.captionY.set(captionY);

    if (this.captionRef?.nativeElement) {
      this.captionXTween?.kill();
      this.captionYTween?.kill();
      this.captionXTween = gsap.to(this.captionRef.nativeElement, {
        x: captionX,
        y: captionY,
        duration: 0.1,
        ease: 'none',
        overwrite: 'auto'
      });
    }

    // Calculate velocity for caption rotation
    const velocityY = offsetY - this.lastY;
    const captionRotation = -velocityY * 0.6;
    this.lastY = offsetY;

    if (this.captionRef?.nativeElement) {
      this.rotateCaptionTween?.kill();
      this.rotateCaptionTween = gsap.to(this.captionRef.nativeElement, {
        rotate: captionRotation,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }

  @HostListener('mouseenter')
  handleMouseEnter(): void {
    if (!isPlatformBrowser(this.platformId) || !this.innerRef?.nativeElement) {
      return;
    }

    this.scaleTween?.kill();
    this.opacityTween?.kill();

    this.scaleTween = gsap.to(this.innerRef.nativeElement, {
      scale: this.scaleOnHover,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    if (this.captionRef?.nativeElement) {
      this.opacityTween = gsap.to(this.captionRef.nativeElement, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
      this.captionOpacity.set(1);
    }
  }

  @HostListener('mouseleave')
  handleMouseLeave(): void {
    if (!isPlatformBrowser(this.platformId) || !this.innerRef?.nativeElement) {
      return;
    }

    this.cleanupAnimations();

    gsap.to(this.innerRef.nativeElement, {
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    if (this.captionRef?.nativeElement) {
      gsap.to(this.captionRef.nativeElement, {
        opacity: 0,
        rotate: 0,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
      this.captionOpacity.set(0);
    }

    this.lastY = 0;
  }
}

