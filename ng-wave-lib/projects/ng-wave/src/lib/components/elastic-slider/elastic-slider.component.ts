import {
  Component,
  Input,
  Output,
  EventEmitter,
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
import gsap from 'gsap';

const MAX_OVERFLOW = 50;

function decay(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }

  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);

  return sigmoid * max;
}

@Component({
  selector: 'ngw-elastic-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './elastic-slider.component.html',
  styleUrl: './elastic-slider.component.css'
})
export class ElasticSliderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sliderRoot', { static: false }) sliderRootRef!: ElementRef<HTMLDivElement>;
  @ViewChild('sliderWrapper', { static: false }) sliderWrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('leftIcon', { static: false }) leftIconRef!: ElementRef<HTMLDivElement>;
  @ViewChild('rightIcon', { static: false }) rightIconRef!: ElementRef<HTMLDivElement>;
  @ViewChild('trackWrapper', { static: false }) trackWrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('range', { static: false }) rangeRef!: ElementRef<HTMLDivElement>;

  @Input() defaultValue = 50;
  @Input() startingValue = 0;
  @Input() maxValue = 100;
  @Input() className = '';
  @Input() isStepped = false;
  @Input() stepSize = 1;
  @Input() leftIcon = '';
  @Input() rightIcon = '';

  @Output() valueChange = new EventEmitter<number>();

  private readonly platformId = inject(PLATFORM_ID);
  value = signal(50);
  private region = signal<'left' | 'middle' | 'right'>('middle');
  private clientX = signal(0);
  private overflow = signal(0);
  private scale = signal(1);
  private isDragging = false;
  private scaleTween: gsap.core.Tween | null = null;
  private overflowTween: gsap.core.Tween | null = null;
  private leftIconTween: gsap.core.Tween | null = null;
  private rightIconTween: gsap.core.Tween | null = null;
  private trackTween: gsap.core.Tween | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.value.set(this.defaultValue);
    setTimeout(() => {
      this.setupEventListeners();
    }, 0);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private setupEventListeners(): void {
    if (!isPlatformBrowser(this.platformId) || !this.sliderRootRef?.nativeElement) {
      return;
    }

    const root = this.sliderRootRef.nativeElement;
    root.addEventListener('pointermove', this.handlePointerMove.bind(this));
    root.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    root.addEventListener('pointerup', this.handlePointerUp.bind(this));
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.isDragging || !this.sliderRootRef?.nativeElement) {
      return;
    }

    const { left, width } = this.sliderRootRef.nativeElement.getBoundingClientRect();
    let newValue = this.startingValue + ((event.clientX - left) / width) * (this.maxValue - this.startingValue);

    if (this.isStepped) {
      newValue = Math.round(newValue / this.stepSize) * this.stepSize;
    }

    newValue = Math.min(Math.max(newValue, this.startingValue), this.maxValue);
    this.value.set(newValue);
    this.valueChange.emit(newValue);
    this.clientX.set(event.clientX);
    this.updateOverflow();
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.sliderRootRef?.nativeElement) {
      return;
    }

    this.isDragging = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.handlePointerMove(event);
  }

  private handlePointerUp(): void {
    this.isDragging = false;
    this.overflowTween?.kill();
    this.overflowTween = gsap.to({ value: this.overflow() }, {
      value: 0,
      duration: 0.5,
      ease: 'elastic.out(1, 0.5)',
      onUpdate: () => {
        this.overflow.set((this.overflowTween?.targets()[0] as { value: number }).value);
        this.updateTrackTransform();
      }
    });
  }

  private updateOverflow(): void {
    if (!isPlatformBrowser(this.platformId) || !this.sliderRootRef?.nativeElement) {
      return;
    }

    const { left, right } = this.sliderRootRef.nativeElement.getBoundingClientRect();
    const x = this.clientX();
    let newRegion: 'left' | 'middle' | 'right' = 'middle';
    let overflowValue = 0;

    if (x < left) {
      newRegion = 'left';
      overflowValue = left - x;
    } else if (x > right) {
      newRegion = 'right';
      overflowValue = x - right;
    }

    this.region.set(newRegion);
    this.overflow.set(decay(overflowValue, MAX_OVERFLOW));
    this.updateTrackTransform();
    this.updateIconTransforms();
  }

  private updateTrackTransform(): void {
    if (!isPlatformBrowser(this.platformId) || !this.trackWrapperRef?.nativeElement || !this.sliderRootRef?.nativeElement) {
      return;
    }

    const { width } = this.sliderRootRef.nativeElement.getBoundingClientRect();
    const overflow = this.overflow();
    const scaleX = 1 + overflow / width;
    const scaleY = 1 - (overflow / MAX_OVERFLOW) * 0.2;

    const { left, width: rootWidth } = this.sliderRootRef.nativeElement.getBoundingClientRect();
    const transformOrigin = this.clientX() < left + rootWidth / 2 ? 'right' : 'left';

    gsap.set(this.trackWrapperRef.nativeElement, {
      scaleX,
      scaleY,
      transformOrigin
    });
  }

  private updateIconTransforms(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const region = this.region();
    const overflow = this.overflow();
    const scale = this.scale();

    if (this.leftIconRef?.nativeElement) {
      const x = region === 'left' ? -overflow / scale : 0;
      const iconScale = region === 'left' ? 1.4 : 1;
      gsap.set(this.leftIconRef.nativeElement, { x, scale: iconScale });
    }

    if (this.rightIconRef?.nativeElement) {
      const x = region === 'right' ? overflow / scale : 0;
      const iconScale = region === 'right' ? 1.4 : 1;
      gsap.set(this.rightIconRef.nativeElement, { x, scale: iconScale });
    }
  }

  handleMouseEnter(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.scaleTween?.kill();
    this.scaleTween = gsap.to({ value: this.scale() }, {
      value: 1.2,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        const val = (this.scaleTween?.targets()[0] as { value: number }).value;
        this.scale.set(val);
        if (this.trackWrapperRef?.nativeElement) {
          const height = 6 + (val - 1) * 6;
          const margin = (val - 1) * -3;
          gsap.set(this.trackWrapperRef.nativeElement, {
            height: `${height}px`,
            marginTop: `${margin}px`,
            marginBottom: `${margin}px`
          });
        }
      }
    });
  }

  handleMouseLeave(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.scaleTween?.kill();
    this.scaleTween = gsap.to({ value: this.scale() }, {
      value: 1,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        const val = (this.scaleTween?.targets()[0] as { value: number }).value;
        this.scale.set(val);
        if (this.trackWrapperRef?.nativeElement) {
          const height = 6 + (val - 1) * 6;
          const margin = (val - 1) * -3;
          gsap.set(this.trackWrapperRef.nativeElement, {
            height: `${height}px`,
            marginTop: `${margin}px`,
            marginBottom: `${margin}px`
          });
        }
      }
    });
  }

  getRangePercentage(): number {
    const totalRange = this.maxValue - this.startingValue;
    if (totalRange === 0) return 0;
    return ((this.value() - this.startingValue) / totalRange) * 100;
  }

  getRoundedValue(): number {
    if (this.isStepped) {
      return Math.round(this.value() / this.stepSize) * this.stepSize;
    }
    return Math.round(this.value());
  }

  private cleanup(): void {
    this.scaleTween?.kill();
    this.overflowTween?.kill();
    this.leftIconTween?.kill();
    this.rightIconTween?.kill();
    this.trackTween?.kill();
  }
}

