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
    effect,
    Injector
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
    selector: 'ngw-shuffle',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './shuffle.component.html',
    styleUrl: './shuffle.component.css'
})
export class ShuffleComponent implements AfterViewInit, OnDestroy {
    @ViewChild('textElement', { static: false }) textElementRef!: ElementRef<HTMLElement>;

    @Input() text = '';
    @Input() className = '';
    @Input() style: Record<string, string> = {};
    @Input() shuffleDirection: 'left' | 'right' = 'right';
    @Input() duration = 0.35;
    @Input() maxDelay = 0;
    @Input() ease = 'power3.out';
    @Input() threshold = 0.1;
    @Input() rootMargin = '-100px';
    @Input() tag: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div' = 'p';
    @Input() textAlign = 'center';
    @Input() shuffleTimes = 1;
    @Input() animationMode: 'evenodd' | 'random' = 'evenodd';
    @Input() loop = false;
    @Input() loopDelay = 0;
    @Input() stagger = 0.03;
    @Input() scrambleCharset = '';
    @Input() colorFrom?: string;
    @Input() colorTo?: string;
    @Input() triggerOnce = true;
    @Input() respectReducedMotion = true;
    @Input() triggerOnHover = true;

    private readonly platformId = inject(PLATFORM_ID);
    private readonly injector = inject(Injector);
    readonly ready = signal(false);
    private fontsLoaded = false;
    private splitInstance: any = null;
    private wrappersRef: HTMLElement[] = [];
    private tl?: gsap.core.Timeline;
    private playing = false;
    private hoverHandler?: () => void;
    private scrollTrigger?: ScrollTrigger;
    private reducedMotion = false;

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
        }
    }

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        // Wait for fonts to load
        if ('fonts' in document) {
            if (document.fonts.status === 'loaded') {
                this.fontsLoaded = true;
                this.init();
            } else {
                document.fonts.ready.then(() => {
                    this.fontsLoaded = true;
                    this.init();
                });
            }
        } else {
            this.fontsLoaded = true;
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
        if (!this.textElementRef?.nativeElement || !this.text || !this.fontsLoaded) {
            return;
        }

        if (this.respectReducedMotion && this.reducedMotion) {
            this.ready.set(true);
            return;
        }

        const el = this.textElementRef.nativeElement;

        const startPct = (1 - this.threshold) * 100;
        const mm = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(this.rootMargin || '');
        const mv = mm ? parseFloat(mm[1]) : 0;
        const mu = mm ? mm[2] || 'px' : 'px';
        const sign = mv === 0 ? '' : mv < 0 ? `-=${Math.abs(mv)}${mu}` : `+=${mv}${mu}`;
        const start = `top ${startPct}%${sign}`;

        const create = () => {
            this.build();
            if (this.scrambleCharset) {
                this.randomizeScrambles();
            }
            this.play();
            this.armHover();
            this.ready.set(true);
        };

        this.scrollTrigger = ScrollTrigger.create({
            trigger: el,
            start,
            once: this.triggerOnce,
            onEnter: create
        });
    }

    private build(): void {
        this.teardown();

        if (!this.textElementRef?.nativeElement) {
            return;
        }

        const el = this.textElementRef.nativeElement;

        // Try to use SplitText if available, otherwise use fallback
        try {
            const SplitTextModule = (window as any).SplitText || (gsap as any).SplitText;
            if (SplitTextModule && SplitTextModule.create) {
                this.splitInstance = SplitTextModule.create(el, {
                    type: 'chars',
                    charsClass: 'shuffle-char',
                    wordsClass: 'shuffle-word',
                    linesClass: 'shuffle-line',
                    smartWrap: true,
                    reduceWhiteSpace: false
                });
            } else {
                // Fallback: manually split
                this.fallbackSplit();
            }
        } catch (error) {
            console.warn('SplitText not available, using fallback', error);
            this.fallbackSplit();
        }

        const chars = this.splitInstance?.chars || Array.from(el.querySelectorAll('.shuffle-char'));
        this.wrappersRef = [];

        const rolls = Math.max(1, Math.floor(this.shuffleTimes));
        const rand = (set: string) => set.charAt(Math.floor(Math.random() * set.length)) || '';

        chars.forEach((ch: HTMLElement) => {
            const parent = ch.parentElement;
            if (!parent) return;

            const w = ch.getBoundingClientRect().width;
            if (!w) return;

            const wrap = document.createElement('span');
            Object.assign(wrap.style, {
                display: 'inline-block',
                overflow: 'hidden',
                width: w + 'px',
                verticalAlign: 'baseline'
            });

            const inner = document.createElement('span');
            Object.assign(inner.style, {
                display: 'inline-block',
                whiteSpace: 'nowrap',
                willChange: 'transform'
            });

            parent.insertBefore(wrap, ch);
            wrap.appendChild(inner);

            const firstOrig = ch.cloneNode(true) as HTMLElement;
            Object.assign(firstOrig.style, { display: 'inline-block', width: w + 'px', textAlign: 'center' });

            ch.setAttribute('data-orig', '1');
            Object.assign(ch.style, { display: 'inline-block', width: w + 'px', textAlign: 'center' });

            inner.appendChild(firstOrig);
            for (let k = 0; k < rolls; k++) {
                const c = ch.cloneNode(true) as HTMLElement;
                if (this.scrambleCharset) {
                    c.textContent = rand(this.scrambleCharset);
                }
                Object.assign(c.style, { display: 'inline-block', width: w + 'px', textAlign: 'center' });
                inner.appendChild(c);
            }
            inner.appendChild(ch);

            const steps = rolls + 1;
            let startX = 0;
            let finalX = -steps * w;
            if (this.shuffleDirection === 'right') {
                const firstCopy = inner.firstElementChild;
                const real = inner.lastElementChild;
                if (real) {
                    inner.insertBefore(real, inner.firstChild);
                }
                if (firstCopy) {
                    inner.appendChild(firstCopy);
                }
                startX = -steps * w;
                finalX = 0;
            }

            gsap.set(inner, { x: startX, force3D: true });
            if (this.colorFrom) {
                inner.style.color = this.colorFrom;
            }

            inner.setAttribute('data-final-x', String(finalX));
            inner.setAttribute('data-start-x', String(startX));

            this.wrappersRef.push(wrap);
        });
    }

    private fallbackSplit(): void {
        if (!this.textElementRef?.nativeElement) {
            return;
        }
        const text = this.text;
        const chars = text.split('');
        this.textElementRef.nativeElement.innerHTML = '';
        const charElements = chars.map(char => {
            const span = document.createElement('span');
            span.className = 'shuffle-char';
            span.textContent = char;
            this.textElementRef.nativeElement.appendChild(span);
            return span;
        });
        this.splitInstance = { chars: charElements };
    }

    private randomizeScrambles(): void {
        if (!this.scrambleCharset) {
            return;
        }
        this.wrappersRef.forEach(w => {
            const strip = w.firstElementChild as HTMLElement;
            if (!strip) {
                return;
            }
            const kids = Array.from(strip.children) as HTMLElement[];
            for (let i = 1; i < kids.length - 1; i++) {
                kids[i].textContent = this.scrambleCharset.charAt(Math.floor(Math.random() * this.scrambleCharset.length));
            }
        });
    }

    private play(): void {
        const strips = this.wrappersRef.map(w => w.firstElementChild as HTMLElement).filter(Boolean);
        if (!strips.length) {
            return;
        }

        this.playing = true;

        const tl = gsap.timeline({
            smoothChildTiming: true,
            repeat: this.loop ? -1 : 0,
            repeatDelay: this.loop ? this.loopDelay : 0,
            onRepeat: () => {
                if (this.scrambleCharset) {
                    this.randomizeScrambles();
                }
                gsap.set(strips, { x: (i, t) => parseFloat((t as HTMLElement).getAttribute('data-start-x') || '0') });
            },
            onComplete: () => {
                this.playing = false;
                if (!this.loop) {
                    this.cleanupToStill();
                    if (this.colorTo) {
                        gsap.set(strips, { color: this.colorTo });
                    }
                    this.armHover();
                }
            }
        });

        const addTween = (targets: HTMLElement[], at: number) => {
            tl.to(
                targets,
                {
                    x: (i, t) => parseFloat((t as HTMLElement).getAttribute('data-final-x') || '0'),
                    duration: this.duration,
                    ease: this.ease,
                    force3D: true,
                    stagger: this.animationMode === 'evenodd' ? this.stagger : 0
                },
                at
            );
            if (this.colorFrom && this.colorTo) {
                tl.to(targets, { color: this.colorTo, duration: this.duration, ease: this.ease }, at);
            }
        };

        if (this.animationMode === 'evenodd') {
            const odd = strips.filter((_, i) => i % 2 === 1);
            const even = strips.filter((_, i) => i % 2 === 0);
            const oddTotal = this.duration + Math.max(0, odd.length - 1) * this.stagger;
            const evenStart = odd.length ? oddTotal * 0.7 : 0;
            if (odd.length) {
                addTween(odd, 0);
            }
            if (even.length) {
                addTween(even, evenStart);
            }
        } else {
            strips.forEach(strip => {
                const d = Math.random() * this.maxDelay;
                tl.to(
                    strip,
                    {
                        x: parseFloat(strip.getAttribute('data-final-x') || '0'),
                        duration: this.duration,
                        ease: this.ease,
                        force3D: true
                    },
                    d
                );
                if (this.colorFrom && this.colorTo) {
                    tl.fromTo(strip, { color: this.colorFrom }, { color: this.colorTo, duration: this.duration, ease: this.ease }, d);
                }
            });
        }

        this.tl = tl;
    }

    private armHover(): void {
        if (!this.triggerOnHover || !this.textElementRef?.nativeElement) {
            return;
        }
        this.removeHover();
        const handler = () => {
            if (this.playing) {
                return;
            }
            this.build();
            if (this.scrambleCharset) {
                this.randomizeScrambles();
            }
            this.play();
        };
        this.hoverHandler = handler;
        this.textElementRef.nativeElement.addEventListener('mouseenter', handler);
    }

    private removeHover(): void {
        if (this.hoverHandler && this.textElementRef?.nativeElement) {
            this.textElementRef.nativeElement.removeEventListener('mouseenter', this.hoverHandler);
            this.hoverHandler = undefined;
        }
    }

    private cleanupToStill(): void {
        this.wrappersRef.forEach(w => {
            const strip = w.firstElementChild as HTMLElement;
            if (!strip) {
                return;
            }
            const real = strip.querySelector('[data-orig="1"]');
            if (!real) {
                return;
            }
            strip.replaceChildren(real);
            strip.style.transform = 'none';
            strip.style.willChange = 'auto';
        });
    }

    private teardown(): void {
        if (this.tl) {
            this.tl.kill();
            this.tl = undefined;
        }
        if (this.wrappersRef.length) {
            this.wrappersRef.forEach(wrap => {
                const inner = wrap.firstElementChild;
                const orig = inner?.querySelector('[data-orig="1"]');
                if (orig && wrap.parentNode) {
                    wrap.parentNode.replaceChild(orig, wrap);
                }
            });
            this.wrappersRef = [];
        }
        try {
            this.splitInstance?.revert();
        } catch {
            // Ignore errors
        }
        this.splitInstance = null;
        this.playing = false;
    }

    private cleanup(): void {
        if (this.scrollTrigger) {
            this.scrollTrigger.kill();
        }
        this.removeHover();
        this.teardown();
        this.ready.set(false);
    }

    getCommonStyle(): Record<string, string> {
        return { textAlign: this.textAlign, ...this.style };
    }

    getClasses(): string {
        return `shuffle-parent ${this.ready() ? 'is-ready' : ''} ${this.className}`;
    }
}

