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
    effect,
    Injector
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
    selector: 'ngw-true-focus',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './true-focus.component.html',
    styleUrl: './true-focus.component.css'
})
export class TrueFocusComponent implements AfterViewInit, OnDestroy {
    @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
    @ViewChild('frameRef', { static: false }) frameRef!: ElementRef<HTMLDivElement>;

    @Input() sentence = 'True Focus';
    @Input() separator = ' ';
    @Input() manualMode = false;
    @Input() blurAmount = 5;
    @Input() borderColor = 'green';
    @Input() glowColor = 'rgba(0, 255, 0, 0.6)';
    @Input() animationDuration = 0.5;
    @Input() pauseBetweenAnimations = 1;

    private readonly platformId = inject(PLATFORM_ID);
    private readonly injector = inject(Injector);
    readonly currentIndex = signal(0);
    readonly lastActiveIndex = signal<number | null>(null);
    readonly focusRect = signal({ x: 0, y: 0, width: 0, height: 0 });
    private intervalId?: number;
    private wordRefs: HTMLElement[] = [];
    private frameAnimation?: gsap.core.Tween;

    readonly words = computed(() => this.sentence.split(this.separator));

    constructor() {
        effect(() => {
            this.currentIndex();
            if (isPlatformBrowser(this.platformId)) {
                setTimeout(() => this.updateFocusRect(), 0);
            }
        }, { injector: this.injector });
    }

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (!this.manualMode) {
            this.startAutoAnimation();
        }
        this.updateFocusRect();
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
    }

    private startAutoAnimation(): void {
        this.intervalId = window.setInterval(() => {
            this.currentIndex.set((this.currentIndex() + 1) % this.words().length);
        }, (this.animationDuration + this.pauseBetweenAnimations) * 1000);
    }

    private updateFocusRect(): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }

        const currentIdx = this.currentIndex();
        if (currentIdx === null || currentIdx === -1 || !this.wordRefs[currentIdx]) {
            return;
        }

        const parentRect = this.containerRef.nativeElement.getBoundingClientRect();
        const activeRect = this.wordRefs[currentIdx].getBoundingClientRect();

        const newRect = {
            x: activeRect.left - parentRect.left,
            y: activeRect.top - parentRect.top,
            width: activeRect.width,
            height: activeRect.height
        };

        this.focusRect.set(newRect);

        if (this.frameRef?.nativeElement) {
            if (this.frameAnimation) {
                this.frameAnimation.kill();
            }
            this.frameAnimation = gsap.to(this.frameRef.nativeElement, {
                x: newRect.x,
                y: newRect.y,
                width: newRect.width,
                height: newRect.height,
                opacity: currentIdx >= 0 ? 1 : 0,
                duration: this.animationDuration,
                ease: 'power2.out'
            });
        }
    }

    onWordMouseEnter(index: number): void {
        if (this.manualMode) {
            this.lastActiveIndex.set(this.currentIndex());
            this.currentIndex.set(index);
        }
    }

    onWordMouseLeave(): void {
        if (this.manualMode && this.lastActiveIndex() !== null) {
            this.currentIndex.set(this.lastActiveIndex()!);
        }
    }

    setWordRef(index: number, el: HTMLElement | null): void {
        if (el) {
            this.wordRefs[index] = el;
        }
    }

    isActive(index: number): boolean {
        return index === this.currentIndex();
    }

    getWordStyle(index: number): Record<string, string> {
        const isActive = this.isActive(index);
        const blur = this.manualMode
            ? isActive
                ? 'blur(0px)'
                : `blur(${this.blurAmount}px)`
            : isActive
                ? 'blur(0px)'
                : `blur(${this.blurAmount}px)`;

        return {
            filter: blur,
            '--border-color': this.borderColor,
            '--glow-color': this.glowColor,
            transition: `filter ${this.animationDuration}s ease`
        };
    }

    getFrameStyle(): Record<string, string> {
        return {
            '--border-color': this.borderColor,
            '--glow-color': this.glowColor
        };
    }

    private cleanup(): void {
        if (this.intervalId !== undefined) {
            clearInterval(this.intervalId);
        }
        if (this.frameAnimation) {
            this.frameAnimation.kill();
        }
    }
}

