import { Component, input, effect, ElementRef, ViewChild, PLATFORM_ID, inject, OnDestroy, AfterViewInit, EffectRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { CommonModule } from '@angular/common';

function lerp(a: number, b: number, n: number): number {
    return (1 - n) * a + n * b;
}

function getLocalPointerPos(e: MouseEvent | TouchEvent, rect: DOMRect): { x: number; y: number } {
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function getMouseDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.hypot(dx, dy);
}

interface ImageItem {
    DOM: { el: HTMLElement; inner: HTMLElement | null };
    defaultStyle: { scale: number; x: number; y: number; opacity: number };
    rect: DOMRect | null;
    resize: () => void;
}

class ImageItemClass implements ImageItem {
    DOM: { el: HTMLElement; inner: HTMLElement | null } = { el: null as any, inner: null };
    defaultStyle = { scale: 1, x: 0, y: 0, opacity: 0 };
    rect: DOMRect | null = null;
    resize: () => void = () => { };

    constructor(DOM_el: HTMLElement) {
        this.DOM.el = DOM_el;
        this.DOM.inner = this.DOM.el.querySelector('.content__img-inner');
        this.getRect();
        this.initEvents();
    }

    initEvents(): void {
        this.resize = () => {
            gsap.set(this.DOM.el, this.defaultStyle);
            this.getRect();
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', this.resize);
        }
    }

    getRect(): void {
        this.rect = this.DOM.el.getBoundingClientRect();
    }

    destroy(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this.resize);
        }
    }
}

abstract class ImageTrailVariantBase {
    protected container: HTMLElement;
    protected DOM: { el: HTMLElement };
    protected images: ImageItemClass[] = [];
    protected imagesTotal = 0;
    protected imgPosition = 0;
    protected zIndexVal = 1;
    protected activeImagesCount = 0;
    protected isIdle = true;
    protected threshold = 80;
    protected mousePos = { x: 0, y: 0 };
    protected lastMousePos = { x: 0, y: 0 };
    protected cacheMousePos = { x: 0, y: 0 };
    protected rafId: number | null = null;
    protected handlePointerMove: ((ev: MouseEvent | TouchEvent) => void) | null = null;
    protected initRender: ((ev: MouseEvent | TouchEvent) => void) | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.DOM = { el: container };
        this.images = [...this.DOM.el.querySelectorAll<HTMLElement>('.content__img')].map(img => new ImageItemClass(img));
        this.imagesTotal = this.images.length;
        this.setupEvents();
    }

    protected setupEvents(): void {
        this.handlePointerMove = (ev: MouseEvent | TouchEvent) => {
            const rect = this.container.getBoundingClientRect();
            this.mousePos = getLocalPointerPos(ev, rect);
        };
        this.container.addEventListener('mousemove', this.handlePointerMove as EventListener);
        this.container.addEventListener('touchmove', this.handlePointerMove as EventListener);

        this.initRender = (ev: MouseEvent | TouchEvent) => {
            const rect = this.container.getBoundingClientRect();
            this.mousePos = getLocalPointerPos(ev, rect);
            this.cacheMousePos = { ...this.mousePos };

            this.rafId = requestAnimationFrame(() => this.render());

            if (this.initRender) {
                this.container.removeEventListener('mousemove', this.initRender as EventListener);
                this.container.removeEventListener('touchmove', this.initRender as EventListener);
            }
        };
        this.container.addEventListener('mousemove', this.initRender as EventListener);
        this.container.addEventListener('touchmove', this.initRender as EventListener);
    }

    protected abstract render(): void;
    protected abstract showNextImage(): void;

    protected onImageActivated(): void {
        this.activeImagesCount++;
        this.isIdle = false;
    }

    protected onImageDeactivated(): void {
        this.activeImagesCount--;
        if (this.activeImagesCount === 0) {
            this.isIdle = true;
        }
    }

    destroy(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        if (this.handlePointerMove) {
            this.container.removeEventListener('mousemove', this.handlePointerMove as EventListener);
            this.container.removeEventListener('touchmove', this.handlePointerMove as EventListener);
        }
        if (this.initRender) {
            this.container.removeEventListener('mousemove', this.initRender as EventListener);
            this.container.removeEventListener('touchmove', this.initRender as EventListener);
        }
        this.images.forEach(img => img.destroy());
    }
}

class ImageTrailVariant1 extends ImageTrailVariantBase {
    protected render(): void {
        const distance = getMouseDistance(this.mousePos, this.lastMousePos);
        this.cacheMousePos.x = lerp(this.cacheMousePos.x, this.mousePos.x, 0.1);
        this.cacheMousePos.y = lerp(this.cacheMousePos.y, this.mousePos.y, 0.1);

        if (distance > this.threshold) {
            this.showNextImage();
            this.lastMousePos = { ...this.mousePos };
        }
        if (this.isIdle && this.zIndexVal !== 1) {
            this.zIndexVal = 1;
        }
        this.rafId = requestAnimationFrame(() => this.render());
    }

    protected showNextImage(): void {
        ++this.zIndexVal;
        this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
        const img = this.images[this.imgPosition];

        gsap.killTweensOf(img.DOM.el);
        gsap
            .timeline({
                onStart: () => this.onImageActivated(),
                onComplete: () => this.onImageDeactivated()
            })
            .fromTo(
                img.DOM.el,
                {
                    opacity: 1,
                    scale: 1,
                    zIndex: this.zIndexVal,
                    x: this.cacheMousePos.x - (img.rect?.width || 0) / 2,
                    y: this.cacheMousePos.y - (img.rect?.height || 0) / 2
                },
                {
                    duration: 0.4,
                    ease: 'power1',
                    x: this.mousePos.x - (img.rect?.width || 0) / 2,
                    y: this.mousePos.y - (img.rect?.height || 0) / 2
                },
                0
            )
            .to(
                img.DOM.el,
                {
                    duration: 0.4,
                    ease: 'power3',
                    opacity: 0,
                    scale: 0.2
                },
                0.4
            );
    }
}

// Simplified - only implementing variant 1 for now, can add others as needed
const variantMap: Record<number, typeof ImageTrailVariant1> = {
    1: ImageTrailVariant1,
    // Add other variants here as needed
};

export interface ImageTrailProps {
    items?: string[];
    variant?: number;
}

@Component({
    selector: 'ngw-image-trail',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './image-trail.component.html',
    styleUrl: './image-trail.component.css'
})
export class ImageTrailComponent implements AfterViewInit, OnDestroy {
    @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;

    readonly items = input<string[]>([]);
    readonly variant = input<number>(1);

    private readonly platformId = inject(PLATFORM_ID);
    private variantInstance: ImageTrailVariantBase | null = null;
    private effectCleanup: EffectRef | null = null;

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            const cleanup = effect(() => {
                this.variant();
                this.items();
                if (this.containerRef?.nativeElement) {
                    this.initVariant();
                }
            });
            this.effectCleanup = cleanup;
        }
    }

    private initVariant(): void {
        if (!this.containerRef?.nativeElement || !isPlatformBrowser(this.platformId)) return;

        if (this.variantInstance) {
            this.variantInstance.destroy();
            this.variantInstance = null;
        }

        const Cls = variantMap[this.variant()] || variantMap[1];
        if (Cls) {
            this.variantInstance = new Cls(this.containerRef.nativeElement);
        }
    }

    ngAfterViewInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => this.initVariant(), 0);
        }
    }

    ngOnDestroy(): void {
        if (this.effectCleanup) {
            this.effectCleanup.destroy();
        }
        if (this.variantInstance) {
            this.variantInstance.destroy();
            this.variantInstance = null;
        }
    }
}

