import {
    Component,
    Input,
    ContentChild,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    inject,
    PLATFORM_ID,
    TemplateRef
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
    selector: 'ngw-scroll-float',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './scroll-float.component.html',
    styleUrl: './scroll-float.component.css'
})
export class ScrollFloatComponent implements AfterViewInit, OnDestroy {
    @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;
    @ContentChild('content', { static: false }) contentTemplate?: TemplateRef<any>;

    @Input() text = '';
    @Input() scrollContainerRef?: ElementRef<HTMLElement>;
    @Input() containerClassName = '';
    @Input() textClassName = '';
    @Input() animationDuration = 1;
    @Input() ease = 'back.inOut(2)';
    @Input() scrollStart = 'center bottom+=50%';
    @Input() scrollEnd = 'bottom bottom-=40%';
    @Input() stagger = 0.03;

    private readonly platformId = inject(PLATFORM_ID);
    private scrollTrigger?: ScrollTrigger;
    private chars: string[] = [];

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        this.init();
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        if (this.scrollTrigger) {
            this.scrollTrigger.kill();
        }
    }

    private init(): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }

        const el = this.containerRef.nativeElement;
        const scroller = this.scrollContainerRef?.nativeElement || window;
        const charElements = el.querySelectorAll('.char');

        if (charElements.length === 0) {
            return;
        }

        gsap.fromTo(
            charElements,
            {
                willChange: 'opacity, transform',
                opacity: 0,
                yPercent: 120,
                scaleY: 2.3,
                scaleX: 0.7,
                transformOrigin: '50% 0%'
            },
            {
                duration: this.animationDuration,
                ease: this.ease,
                opacity: 1,
                yPercent: 0,
                scaleY: 1,
                scaleX: 1,
                stagger: this.stagger,
                scrollTrigger: {
                    trigger: el,
                    scroller: scroller as any,
                    start: this.scrollStart,
                    end: this.scrollEnd,
                    scrub: true
                }
            }
        );
    }

    getChars(): string[] {
        if (this.chars.length === 0) {
            this.chars = this.text.split('');
        }
        return this.chars;
    }
}

