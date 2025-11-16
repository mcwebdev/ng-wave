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
    HostListener
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'ngw-text-pressure',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './text-pressure.component.html',
    styleUrl: './text-pressure.component.css'
})
export class TextPressureComponent implements AfterViewInit, OnDestroy {
    @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
    @ViewChild('titleRef', { static: false }) titleRef!: ElementRef<HTMLHeadingElement>;

    @Input() text = 'Compressa';
    @Input() fontFamily = 'Compressa VF';
    @Input() fontUrl = 'https://res.cloudinary.com/dr6lvwubh/raw/upload/v1529908256/CompressaPRO-GX.woff2';
    @Input() width = true;
    @Input() weight = true;
    @Input() italic = true;
    @Input() alpha = false;
    @Input() flex = true;
    @Input() stroke = false;
    @Input() scale = false;
    @Input() textColor = '#FFFFFF';
    @Input() strokeColor = '#FF0000';
    @Input() className = '';
    @Input() minFontSize = 24;

    private readonly platformId = inject(PLATFORM_ID);
    readonly fontSize = signal(24);
    readonly scaleY = signal(1);
    readonly lineHeight = signal(1);
    private mousePos = { x: 0, y: 0 };
    private cursorPos = { x: 0, y: 0 };
    private rafId?: number;
    private spanRefs: HTMLElement[] = [];
    private resizeListener?: () => void;

    readonly chars = signal<string[]>([]);

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.chars.set(this.text.split(''));
        this.injectFont();
        this.setSize();
        this.setupResizeListener();
        this.animate();
    }

    private injectFont(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const styleId = 'text-pressure-font';
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      @font-face {
        font-family: '${this.fontFamily}';
        src: url('${this.fontUrl}');
        font-style: normal;
      }
    `;
        document.head.appendChild(style);
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(e: MouseEvent): void {
        this.cursorPos = { x: e.clientX, y: e.clientY };
    }

    @HostListener('document:touchmove', ['$event'])
    onTouchMove(e: TouchEvent): void {
        if (e.touches.length > 0) {
            this.cursorPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }

    private setSize(): void {
        if (!this.containerRef?.nativeElement || !this.titleRef?.nativeElement) {
            return;
        }

        const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
        const containerW = containerRect.width;
        const containerH = containerRect.height;

        let newFontSize = containerW / (this.chars().length / 2);
        newFontSize = Math.max(newFontSize, this.minFontSize);

        this.fontSize.set(newFontSize);
        this.scaleY.set(1);
        this.lineHeight.set(1);

        requestAnimationFrame(() => {
            if (!this.titleRef?.nativeElement) {
                return;
            }
            const textRect = this.titleRef.nativeElement.getBoundingClientRect();

            if (this.scale && textRect.height > 0) {
                const yRatio = containerH / textRect.height;
                this.scaleY.set(yRatio);
                this.lineHeight.set(yRatio);
            }
        });

        if (this.containerRef.nativeElement) {
            const { left, top, width, height } = this.containerRef.nativeElement.getBoundingClientRect();
            this.mousePos.x = left + width / 2;
            this.mousePos.y = top + height / 2;
            this.cursorPos.x = this.mousePos.x;
            this.cursorPos.y = this.mousePos.y;
        }
    }

    private setupResizeListener(): void {
        this.resizeListener = () => {
            this.setSize();
        };
        window.addEventListener('resize', this.resizeListener);
    }

    private dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private getAttr(distance: number, minVal: number, maxVal: number, maxDist: number): number {
        const val = maxVal - Math.abs((maxVal * distance) / maxDist);
        return Math.max(minVal, val + minVal);
    }

    private animate = (): void => {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.mousePos.x += (this.cursorPos.x - this.mousePos.x) / 15;
        this.mousePos.y += (this.cursorPos.y - this.mousePos.y) / 15;

        if (this.titleRef?.nativeElement) {
            const titleRect = this.titleRef.nativeElement.getBoundingClientRect();
            const maxDist = titleRect.width / 2;

            this.spanRefs.forEach(span => {
                if (!span) return;

                const rect = span.getBoundingClientRect();
                const charCenter = {
                    x: rect.x + rect.width / 2,
                    y: rect.y + rect.height / 2
                };

                const d = this.dist(this.mousePos, charCenter);

                const wdth = this.width ? Math.floor(this.getAttr(d, 5, 200, maxDist)) : 100;
                const wght = this.weight ? Math.floor(this.getAttr(d, 100, 900, maxDist)) : 400;
                const italVal = this.italic ? this.getAttr(d, 0, 1, maxDist).toFixed(2) : '0';
                const alphaVal = this.alpha ? this.getAttr(d, 0, 1, maxDist).toFixed(2) : '1';

                span.style.opacity = alphaVal;
                span.style.fontVariationSettings = `'wght' ${wght}, 'wdth' ${wdth}, 'ital' ${italVal}`;
            });
        }

        this.rafId = requestAnimationFrame(this.animate);
    };

    private cleanup(): void {
        if (this.rafId !== undefined) {
            cancelAnimationFrame(this.rafId);
        }
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }
    }

    setSpanRef(index: number, el: HTMLElement | null): void {
        if (el) {
            this.spanRefs[index] = el;
        }
    }

    getTitleStyle(): { [key: string]: string } {
        const style: { [key: string]: string } = {
            fontFamily: this.fontFamily,
            textTransform: 'uppercase',
            fontSize: `${this.fontSize()}px`,
            lineHeight: String(this.lineHeight()),
            transform: `scale(1, ${this.scaleY()})`,
            transformOrigin: 'center top',
            margin: '0',
            textAlign: 'center',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            fontWeight: '100',
            width: '100%'
        };
        if (!this.stroke) {
            style['color'] = this.textColor;
        }
        return style;
    }

    getContainerStyle(): Record<string, string> {
        return {
            position: 'relative',
            width: '100%',
            height: '100%',
            background: 'transparent'
        };
    }

    getDynamicClassName(): string {
        const classes = [this.className];
        if (this.flex) classes.push('flex');
        if (this.stroke) classes.push('stroke');
        return classes.filter(Boolean).join(' ');
    }
}

