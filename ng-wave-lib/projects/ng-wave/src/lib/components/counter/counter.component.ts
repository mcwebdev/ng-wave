import {
  Component,
  Input,
  computed,
  signal,
  effect,
  inject,
  PLATFORM_ID,
  Injector
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'ngw-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css'
})
export class CounterComponent {
  @Input() value = 0;
  @Input() fontSize = 100;
  @Input() padding = 0;
  @Input() places: number[] = [100, 10, 1];
  @Input() gap = 8;
  @Input() borderRadius = 4;
  @Input() horizontalPadding = 8;
  @Input() textColor = 'white';
  @Input() fontWeight = 'bold';
  @Input() containerStyle: Record<string, string> = {};
  @Input() counterStyle: Record<string, string> = {};
  @Input() digitStyle: Record<string, string> = {};
  @Input() gradientHeight = 16;
  @Input() gradientFrom = 'black';
  @Input() gradientTo = 'transparent';
  @Input() topGradientStyle: Record<string, string> = {};
  @Input() bottomGradientStyle: Record<string, string> = {};

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly animatedValues = signal<Record<number, number>>({});

  readonly height = computed(() => this.fontSize + this.padding);

  readonly defaultCounterStyle = computed(() => {
    const base = {
      fontSize: `${this.fontSize}px`,
      gap: `${this.gap}px`,
      borderRadius: `${this.borderRadius}px`,
      paddingLeft: `${this.horizontalPadding}px`,
      paddingRight: `${this.horizontalPadding}px`,
      color: this.textColor,
      fontWeight: this.fontWeight
    };
    return { ...base, ...this.counterStyle };
  });

  readonly defaultTopGradientStyle = computed(() => ({
    height: `${this.gradientHeight}px`,
    background: `linear-gradient(to bottom, ${this.gradientFrom}, ${this.gradientTo})`
  }));

  readonly defaultBottomGradientStyle = computed(() => ({
    height: `${this.gradientHeight}px`,
    background: `linear-gradient(to top, ${this.gradientFrom}, ${this.gradientTo})`
  }));

  constructor() {
    // Animate values when they change
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      this.places.forEach(place => {
        const targetValue = Math.floor(this.value / place);
        const currentValue = this.animatedValues()[place] ?? targetValue;

        if (currentValue !== targetValue) {
          const obj = { value: currentValue };
          gsap.to(obj, {
            value: targetValue,
            duration: 0.6,
            ease: 'power2.out',
            onUpdate: () => {
              this.animatedValues.update(values => ({
                ...values,
                [place]: Math.floor(obj.value)
              }));
            }
          });
        }
      });
    }, { injector: this.injector });
  }

  getAnimatedValue(place: number): number {
    return this.animatedValues()[place] ?? Math.floor(this.value / place);
  }

  getDigitValue(place: number, number: number): number {
    const animatedValue = this.getAnimatedValue(place);
    const placeValue = animatedValue % 10;
    const offset = (10 + number - placeValue) % 10;
    let y = offset * this.height();
    if (offset > 5) {
      y -= 10 * this.height();
    }
    return y;
  }

  getDigitStyle(): Record<string, string> {
    return {
      height: `${this.height()}px`,
      ...this.digitStyle
    };
  }

  getTopGradientStyle(): Record<string, string> {
    return this.topGradientStyle && Object.keys(this.topGradientStyle).length > 0
      ? this.topGradientStyle
      : this.defaultTopGradientStyle();
  }

  getBottomGradientStyle(): Record<string, string> {
    return this.bottomGradientStyle && Object.keys(this.bottomGradientStyle).length > 0
      ? this.bottomGradientStyle
      : this.defaultBottomGradientStyle();
  }
}

