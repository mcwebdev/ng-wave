import {
    Component,
    Input,
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
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
    selector: 'ngw-split-text',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './split-text.component.html',
    styleUrl: './split-text.component.css'
})
export class SplitTextComponent implements AfterViewInit, OnDestroy {
    @ViewChild('textElement', { static: false }) textElementRef!: ElementRef<HTMLElement>;

    @Input() text = '';
    @Input() className = '';
    @Input() delay = 100;
    @Input() duration = 0.6;
    @Input() ease = 'power3.out';
    @Input() splitType: 'chars' | 'words' | 'lines' | 'chars,words' | 'chars,lines' | 'words,lines' | 'chars,words,lines' = 'chars';
    @Input() from: Record<string, any> = { opacity: 0, y: 40 };
    @Input() to: Record<string, any> = { opacity: 1, y: 0 };
    @Input() threshold = 0.1;
    @Input() rootMargin = '-100px';
    @Input() textAlign = 'center';
    @Input() tag: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div' = 'p';
    @Input() onLetterAnimationComplete?: () => void;

    private readonly platformId = inject(PLATFORM_ID);
    readonly fontsLoaded = signal(false);
    private splitInstance: any = null;
    private scrollTrigger?: ScrollTrigger;
    private animationCompleted = false;

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if ('fonts' in document) {
            if (document.fonts.status === 'loaded') {
                this.fontsLoaded.set(true);
                this.init();
            } else {
                document.fonts.ready.then(() => {
                    this.fontsLoaded.set(true);
                    this.init();
                });
            }
        } else {
            this.fontsLoaded.set(true);
            this.init();
        }
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
    }

    private init(): void {
        if (!this.textElementRef?.nativeElement || !this.text || !this.fontsLoaded()) {
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        const el = this.textElementRef.nativeElement;

        if ((el as any)._rbsplitInstance) {
            try {
                (el as any)._rbsplitInstance.revert();
            } catch {
                // Ignore
            }
            (el as any)._rbsplitInstance = null;
        }

        const startPct = (1 - this.threshold) * 100;
        const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(this.rootMargin);
        const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
        const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
        const sign =
            marginValue === 0
                ? ''
                : marginValue < 0
                    ? `-=${Math.abs(marginValue)}${marginUnit}`
                    : `+=${marginValue}${marginUnit}`;
        const start = `top ${startPct}%${sign}`;

        let targets: HTMLElement[] = [];

        const assignTargets = (self: any) => {
            if (this.splitType.includes('chars') && self.chars?.length) targets = self.chars;
            if (!targets.length && this.splitType.includes('words') && self.words?.length) targets = self.words;
            if (!targets.length && this.splitType.includes('lines') && self.lines?.length) targets = self.lines;
            if (!targets.length) targets = self.chars || self.words || self.lines || [];
        };

        try {
            const SplitTextModule = (window as any).SplitText || (gsap as any).SplitText;
            if (SplitTextModule && SplitTextModule.create) {
                this.splitInstance = SplitTextModule.create(el, {
                    type: this.splitType,
                    smartWrap: true,
                    autoSplit: this.splitType === 'lines',
                    linesClass: 'split-line',
                    wordsClass: 'split-word',
                    charsClass: 'split-char',
                    reduceWhiteSpace: false,
                    onSplit: (self: any) => {
                        assignTargets(self);
                        if (targets.length) {
                            const tween = gsap.fromTo(
                                targets,
                                { ...this.from },
                                {
                                    ...this.to,
                                    duration: this.duration,
                                    ease: this.ease,
                                    stagger: this.delay / 1000,
                                    scrollTrigger: {
                                        trigger: el,
                                        start,
                                        once: true,
                                        fastScrollEnd: true,
                                        anticipatePin: 0.4
                                    },
                                    onComplete: () => {
                                        this.animationCompleted = true;
                                        if (this.onLetterAnimationComplete) {
                                            this.onLetterAnimationComplete();
                                        }
                                    },
                                    willChange: 'transform, opacity',
                                    force3D: true
                                }
                            );
                            return tween;
                        }
                        return undefined;
                    }
                });
                (el as any)._rbsplitInstance = this.splitInstance;
            } else {
                // Fallback: manual split
                this.fallbackSplit();
            }
        } catch (error) {
            console.warn('SplitText not available, using fallback', error);
            this.fallbackSplit();
        }
    }

    private fallbackSplit(): void {
        if (!this.textElementRef?.nativeElement) {
            return;
        }
        const text = this.text;
        const chars = text.split('');
        this.textElementRef.nativeElement.innerHTML = '';
        chars.forEach(char => {
            const span = document.createElement('span');
            span.className = 'split-char';
            span.textContent = char === ' ' ? '\u00A0' : char;
            this.textElementRef.nativeElement.appendChild(span);
        });

        const targets = Array.from(this.textElementRef.nativeElement.querySelectorAll('.split-char')) as HTMLElement[];
        if (targets.length) {
            const startPct = (1 - this.threshold) * 100;
            const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(this.rootMargin);
            const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
            const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px';
            const sign =
                marginValue === 0
                    ? ''
                    : marginValue < 0
                        ? `-=${Math.abs(marginValue)}${marginUnit}`
                        : `+=${marginValue}${marginUnit}`;
            const start = `top ${startPct}%${sign}`;

            gsap.fromTo(
                targets,
                { ...this.from },
                {
                    ...this.to,
                    duration: this.duration,
                    ease: this.ease,
                    stagger: this.delay / 1000,
                    scrollTrigger: {
                        trigger: this.textElementRef.nativeElement,
                        start,
                        once: true
                    },
                    onComplete: () => {
                        this.animationCompleted = true;
                        if (this.onLetterAnimationComplete) {
                            this.onLetterAnimationComplete();
                        }
                    },
                    willChange: 'transform, opacity',
                    force3D: true
                }
            );
        }
    }

    private cleanup(): void {
        if (this.scrollTrigger) {
            this.scrollTrigger.kill();
        }
        if (this.textElementRef?.nativeElement) {
            ScrollTrigger.getAll().forEach(st => {
                if (st.trigger === this.textElementRef.nativeElement) {
                    st.kill();
                }
            });
            try {
                if ((this.textElementRef.nativeElement as any)._rbsplitInstance) {
                    (this.textElementRef.nativeElement as any)._rbsplitInstance.revert();
                }
                if (this.splitInstance) {
                    this.splitInstance.revert();
                }
            } catch {
                // Ignore
            }
            (this.textElementRef.nativeElement as any)._rbsplitInstance = null;
        }
        this.splitInstance = null;
    }

    getTextStyle(): Record<string, string> {
        return {
            textAlign: this.textAlign,
            overflow: 'hidden',
            display: 'inline-block',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            willChange: 'transform, opacity'
        };
    }

    getClasses(): string {
        return `split-parent ${this.className}`;
    }
}

