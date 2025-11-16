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
    computed
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface VelocityMapping {
    input: [number, number];
    output: [number, number];
}

@Component({
    selector: 'ngw-scroll-velocity',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './scroll-velocity.component.html',
    styleUrl: './scroll-velocity.component.css'
})
export class ScrollVelocityComponent implements AfterViewInit, OnDestroy {
    @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

    @Input() scrollContainerRef?: ElementRef<HTMLElement>;
    @Input() texts: string[] = [];
    @Input() velocity = 100;
    @Input() className = '';
    @Input() damping = 50;
    @Input() stiffness = 400;
    @Input() numCopies = 6;
    @Input() velocityMapping: VelocityMapping = { input: [0, 1000], output: [0, 5] };
    @Input() parallaxClassName = 'parallax';
    @Input() scrollerClassName = 'scroller';
    @Input() parallaxStyle: Record<string, string> = {};
    @Input() scrollerStyle: Record<string, string> = {};

    private readonly platformId = inject(PLATFORM_ID);
    readonly copyWidth = signal(0);
    readonly baseX = signal(0);
    readonly scrollY = signal(0);
    readonly scrollVelocity = signal(0);
    readonly smoothVelocity = signal(0);
    readonly directionFactor = signal(1);
    private rafId?: number;
    private lastTime = 0;
    private lastScrollY = 0;
    private resizeObserver?: ResizeObserver;
    private scrollListener?: () => void;
    private smoothVelocityTarget = 0;

    readonly x = computed(() => {
        const width = this.copyWidth();
        if (width === 0) return '0px';
        const wrapped = this.wrap(-width, 0, this.baseX());
        return `${wrapped}px`;
    });

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        this.updateCopyWidth();
        this.setupResizeObserver();
        this.setupScrollListener();
        this.animate();
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
    }

    private wrap(min: number, max: number, v: number): number {
        const range = max - min;
        const mod = (((v - min) % range) + range) % range;
        return mod + min;
    }

    private updateCopyWidth(): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }
        const firstCopy = this.containerRef.nativeElement.querySelector('[data-first-copy]') as HTMLElement;
        if (firstCopy) {
            this.copyWidth.set(firstCopy.offsetWidth);
        }
    }

    private setupResizeObserver(): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }

        this.resizeObserver = new ResizeObserver(() => {
            this.updateCopyWidth();
        });
        this.resizeObserver.observe(this.containerRef.nativeElement);
    }

    private setupScrollListener(): void {
        const scroller = this.scrollContainerRef?.nativeElement || window;
        const getScrollY = () => {
            if (this.scrollContainerRef?.nativeElement) {
                return this.scrollContainerRef.nativeElement.scrollTop;
            }
            return window.scrollY || window.pageYOffset || 0;
        };

        this.scrollListener = () => {
            const currentScrollY = getScrollY();
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const deltaTime = now - this.lastTime;

            if (deltaTime > 0 && this.lastTime > 0) {
                const deltaY = currentScrollY - this.lastScrollY;
                const velocity = (deltaY / deltaTime) * 1000;
                this.scrollVelocity.set(velocity);

                // Smooth velocity with spring physics
                const currentSmooth = this.smoothVelocity();
                const target = velocity;
                const delta = target - currentSmooth;
                const springForce = delta * (this.stiffness / 1000);
                const dampingForce = currentSmooth * (this.damping / 1000);
                const newSmooth = currentSmooth + (springForce - dampingForce) * (deltaTime / 1000);
                this.smoothVelocity.set(newSmooth);
            }

            this.lastScrollY = currentScrollY;
            this.lastTime = now;
            this.scrollY.set(currentScrollY);
        };

        if (this.scrollContainerRef?.nativeElement) {
            this.scrollContainerRef.nativeElement.addEventListener('scroll', this.scrollListener, { passive: true });
        } else {
            window.addEventListener('scroll', this.scrollListener, { passive: true });
        }

        this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.lastScrollY = getScrollY();
    }

    private getVelocityFactor(): number {
        const smooth = this.smoothVelocity();
        const [inputMin, inputMax] = this.velocityMapping.input;
        const [outputMin, outputMax] = this.velocityMapping.output;

        if (smooth <= inputMin) return outputMin;
        if (smooth >= inputMax) return outputMax;

        const t = (smooth - inputMin) / (inputMax - inputMin);
        return outputMin + t * (outputMax - outputMin);
    }

    private animate = (): void => {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const delta = this.lastTime > 0 ? now - this.lastTime : 16;
        this.lastTime = now;

        const velocityFactor = this.getVelocityFactor();

        if (velocityFactor < 0) {
            this.directionFactor.set(-1);
        } else if (velocityFactor > 0) {
            this.directionFactor.set(1);
        }

        let moveBy = this.directionFactor() * this.velocity * (delta / 1000);
        moveBy += this.directionFactor() * moveBy * velocityFactor;

        this.baseX.set(this.baseX() + moveBy);

        if (this.containerRef?.nativeElement) {
            const scrollers = this.containerRef.nativeElement.querySelectorAll('.scroller');
            scrollers.forEach(scroller => {
                (scroller as HTMLElement).style.transform = `translateX(${this.x()})`;
            });
        }

        this.rafId = requestAnimationFrame(this.animate);
    };

    private cleanup(): void {
        if (this.rafId !== undefined) {
            cancelAnimationFrame(this.rafId);
        }
        this.resizeObserver?.disconnect();
        if (this.scrollListener) {
            if (this.scrollContainerRef?.nativeElement) {
                this.scrollContainerRef.nativeElement.removeEventListener('scroll', this.scrollListener);
            } else {
                window.removeEventListener('scroll', this.scrollListener);
            }
        }
    }

    getCopies(): number[] {
        return Array.from({ length: this.numCopies }, (_, i) => i);
    }

    getTexts(): string[] {
        return this.texts.length > 0 ? this.texts : ['Scroll Velocity'];
    }

    getMergedParallaxStyle(): Record<string, string> {
        return { ...this.parallaxStyle };
    }

    getMergedScrollerStyle(): Record<string, string> {
        return { ...this.scrollerStyle };
    }
}

