import {
    Component,
    Input,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    inject,
    PLATFORM_ID,
    signal,
    computed,
    HostListener
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

interface BlurDiv {
    style: Record<string, string>;
}

const CURVE_FUNCTIONS: Record<string, (p: number) => number> = {
    linear: p => p,
    bezier: p => p * p * (3 - 2 * p),
    'ease-in': p => p * p,
    'ease-out': p => 1 - Math.pow(1 - p, 2),
    'ease-in-out': p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
};

const getGradientDirection = (position: string): string => {
    const map: Record<string, string> = {
        top: 'to top',
        bottom: 'to bottom',
        left: 'to left',
        right: 'to right'
    };
    return map[position] || 'to bottom';
};

@Component({
    selector: 'ngw-gradual-blur',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './gradual-blur.component.html',
    styleUrl: './gradual-blur.component.css'
})
export class GradualBlurComponent implements AfterViewInit, OnDestroy {
    @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

    @Input() position: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
    @Input() strength = 2;
    @Input() height = '6rem';
    @Input() width?: string;
    @Input() divCount = 5;
    @Input() exponential = false;
    @Input() zIndex = 1000;
    @Input() animated: boolean | 'scroll' = false;
    @Input() duration = '0.3s';
    @Input() easing = 'ease-out';
    @Input() opacity = 1;
    @Input() curve: 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out' = 'linear';
    @Input() responsive = false;
    @Input() target: 'parent' | 'page' = 'parent';
    @Input() className = '';
    @Input() style: Record<string, string> = {};
    @Input() hoverIntensity?: number;
    @Input() onAnimationComplete?: () => void;

    private readonly platformId = inject(PLATFORM_ID);
    readonly isHovered = signal(false);
    readonly isVisible = signal(true);
    readonly responsiveHeight = signal('');
    readonly responsiveWidth = signal('');
    private observer?: IntersectionObserver;
    private resizeListener?: () => void;
    private animationTimeout?: number;

    readonly blurDivs = computed(() => {
        const divs: BlurDiv[] = [];
        const increment = 100 / this.divCount;
        const currentStrength = this.isHovered() && this.hoverIntensity
            ? this.strength * this.hoverIntensity
            : this.strength;

        const curveFunc = CURVE_FUNCTIONS[this.curve] || CURVE_FUNCTIONS['linear'];

        for (let i = 1; i <= this.divCount; i++) {
            let progress = i / this.divCount;
            progress = curveFunc(progress);

            let blurValue: number;
            if (this.exponential) {
                blurValue = Math.pow(2, progress * 4) * 0.0625 * currentStrength;
            } else {
                blurValue = 0.0625 * (progress * this.divCount + 1) * currentStrength;
            }

            const p1 = Math.round((increment * i - increment) * 10) / 10;
            const p2 = Math.round(increment * i * 10) / 10;
            const p3 = Math.round((increment * i + increment) * 10) / 10;
            const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

            let gradient = `transparent ${p1}%, black ${p2}%`;
            if (p3 <= 100) gradient += `, black ${p3}%`;
            if (p4 <= 100) gradient += `, transparent ${p4}%`;

            const direction = getGradientDirection(this.position);

            const divStyle: Record<string, string> = {
                position: 'absolute',
                inset: '0',
                maskImage: `linear-gradient(${direction}, ${gradient})`,
                WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
                backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
                WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
                opacity: String(this.opacity),
                transition: this.animated && this.animated !== 'scroll'
                    ? `backdrop-filter ${this.duration} ${this.easing}`
                    : 'none'
            };

            divs.push({ style: divStyle });
        }

        return divs;
    });

    readonly containerStyle = computed(() => {
        const isVertical = ['top', 'bottom'].includes(this.position);
        const isHorizontal = ['left', 'right'].includes(this.position);
        const isPageTarget = this.target === 'page';

        const height = this.responsiveHeight() || this.height;
        const width = this.responsiveWidth() || this.width;

        const baseStyle: { [key: string]: string } = {
            position: isPageTarget ? 'fixed' : 'absolute',
            pointerEvents: this.hoverIntensity ? 'auto' : 'none',
            opacity: this.isVisible() ? '1' : '0',
            transition: this.animated ? `opacity ${this.duration} ${this.easing}` : 'none',
            zIndex: String(isPageTarget ? this.zIndex + 100 : this.zIndex),
            ...this.style
        };

        if (isVertical) {
            baseStyle['height'] = height;
            baseStyle['width'] = width || '100%';
            baseStyle[this.position] = '0';
            baseStyle['left'] = '0';
            baseStyle['right'] = '0';
        } else if (isHorizontal) {
            baseStyle['width'] = width || height;
            baseStyle['height'] = '100%';
            baseStyle[this.position] = '0';
            baseStyle['top'] = '0';
            baseStyle['bottom'] = '0';
        }

        return baseStyle;
    });

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (this.animated === 'scroll') {
            this.setupIntersectionObserver();
        }

        if (this.responsive) {
            this.updateResponsiveDimensions();
            this.setupResizeListener();
        } else {
            this.responsiveHeight.set(this.height);
            if (this.width) {
                this.responsiveWidth.set(this.width);
            }
        }
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
    }

    private setupIntersectionObserver(): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }

        this.observer = new IntersectionObserver(
            ([entry]) => {
                const visible = entry.isIntersecting;
                this.isVisible.set(visible);

                if (visible && this.onAnimationComplete) {
                    const ms = parseFloat(this.duration) * 1000;
                    this.animationTimeout = window.setTimeout(() => {
                        if (this.onAnimationComplete) {
                            this.onAnimationComplete();
                        }
                    }, ms);
                }
            },
            { threshold: 0.1 }
        );

        this.observer.observe(this.containerRef.nativeElement);
    }

    private updateResponsiveDimensions(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const w = window.innerWidth;
        let height = this.height;
        let width = this.width;

        if (w <= 480) {
            // Mobile
            // Could add mobileHeight/mobileWidth inputs if needed
        } else if (w <= 768) {
            // Tablet
        } else if (w <= 1024) {
            // Desktop
        }

        this.responsiveHeight.set(height);
        if (width) {
            this.responsiveWidth.set(width);
        }
    }

    private setupResizeListener(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        let timeoutId: number;
        this.resizeListener = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                this.updateResponsiveDimensions();
            }, 100);
        };

        window.addEventListener('resize', this.resizeListener);
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        if (this.hoverIntensity) {
            this.isHovered.set(true);
        }
    }

    @HostListener('mouseleave')
    onMouseLeave(): void {
        if (this.hoverIntensity) {
            this.isHovered.set(false);
        }
    }

    private cleanup(): void {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }
        if (this.animationTimeout !== undefined) {
            clearTimeout(this.animationTimeout);
        }
    }

    getContainerClasses(): string {
        const classes = ['gradual-blur'];
        if (this.target === 'page') {
            classes.push('gradual-blur-page');
        } else {
            classes.push('gradual-blur-parent');
        }
        if (this.className) {
            classes.push(this.className);
        }
        return classes.join(' ');
    }
}

