import {
  Component,
  Input,
  Output,
  EventEmitter,
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
  selector: 'ngw-count-up',
  standalone: true,
  imports: [],
  templateUrl: './count-up.component.html',
  styleUrl: './count-up.component.css'
})
export class CountUpComponent implements AfterViewInit, OnDestroy {
  @ViewChild('counter', { static: false }) counterRef!: ElementRef<HTMLSpanElement>;

  @Input() to!: number;
  @Input() from = 0;
  @Input() direction: 'up' | 'down' = 'up';
  @Input() delay = 0;
  @Input() duration = 2;
  @Input() className = '';
  @Input() startWhen = true;
  @Input() separator = '';

  @Output() start = new EventEmitter<void>();
  @Output() end = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly inView = signal(false);
  private observer?: IntersectionObserver;
  private animation?: gsap.core.Tween;
  private currentValue = signal(this.direction === 'down' ? this.to : this.from);

  readonly maxDecimals = computed(() => {
    return Math.max(this.getDecimalPlaces(this.from), this.getDecimalPlaces(this.to));
  });

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.setupIntersectionObserver();
    this.setInitialValue();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.animation?.kill();
  }

  private setupIntersectionObserver(): void {
    if (!this.counterRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.inView.set(true);
          this.observer?.unobserve(this.counterRef.nativeElement);
          if (this.startWhen) {
            this.startAnimation();
          }
        }
      },
      { threshold: 0, rootMargin: '0px' }
    );

    this.observer.observe(this.counterRef.nativeElement);
  }

  private setInitialValue(): void {
    if (!this.counterRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const initialValue = this.direction === 'down' ? this.to : this.from;
    this.currentValue.set(initialValue);
    this.counterRef.nativeElement.textContent = this.formatValue(initialValue);
  }

  private startAnimation(): void {
    if (!isPlatformBrowser(this.platformId) || !this.counterRef?.nativeElement) {
      return;
    }

    this.start.emit();

    const targetValue = this.direction === 'down' ? this.from : this.to;
    const startValue = this.direction === 'down' ? this.to : this.from;

    this.currentValue.set(startValue);

    const obj = { value: startValue };
    this.animation = gsap.to(obj, {
      value: targetValue,
      duration: this.duration,
      delay: this.delay,
      ease: 'power2.out',
      onUpdate: () => {
        this.currentValue.set(obj.value);
        if (this.counterRef?.nativeElement) {
          this.counterRef.nativeElement.textContent = this.formatValue(obj.value);
        }
      },
      onComplete: () => {
        this.end.emit();
      }
    });
  }

  private getDecimalPlaces(num: number): number {
    const str = num.toString();
    if (str.includes('.')) {
      const decimals = str.split('.')[1];
      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }
    return 0;
  }

  private formatValue(value: number): string {
    const hasDecimals = this.maxDecimals() > 0;
    const options: Intl.NumberFormatOptions = {
      useGrouping: !!this.separator,
      minimumFractionDigits: hasDecimals ? this.maxDecimals() : 0,
      maximumFractionDigits: hasDecimals ? this.maxDecimals() : 0
    };

    const formattedNumber = Intl.NumberFormat('en-US', options).format(value);
    return this.separator ? formattedNumber.replace(/,/g, this.separator) : formattedNumber;
  }
}

