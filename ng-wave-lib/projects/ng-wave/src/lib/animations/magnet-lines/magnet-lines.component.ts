import {
    Component,
    Input,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    inject,
    PLATFORM_ID,
    HostListener
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'ngw-magnet-lines',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './magnet-lines.component.html',
    styleUrl: './magnet-lines.component.css'
})
export class MagnetLinesComponent implements AfterViewInit, OnDestroy {
    @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

    @Input() rows = 9;
    @Input() columns = 9;
    @Input() containerSize = '80vmin';
    @Input() lineColor = '#efefef';
    @Input() lineWidth = '1vmin';
    @Input() lineHeight = '6vmin';
    @Input() baseAngle = -10;
    @Input() className = '';
    @Input() style: Record<string, string> = {};

    private readonly platformId = inject(PLATFORM_ID);
    private pointerMoveHandler?: (e: PointerEvent) => void;

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.setupPointerTracking();
        this.initializeMiddlePosition();
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
    }

    private setupPointerTracking(): void {
        this.pointerMoveHandler = (e: PointerEvent) => {
            if (!this.containerRef?.nativeElement) {
                return;
            }

            const items = this.containerRef.nativeElement.querySelectorAll('span');
            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const centerX = rect.x + rect.width / 2;
                const centerY = rect.y + rect.height / 2;

                const b = e.clientX - centerX;
                const a = e.clientY - centerY;
                const c = Math.sqrt(a * a + b * b) || 1;
                const r = ((Math.acos(b / c) * 180) / Math.PI) * (e.clientY > centerY ? 1 : -1);

                (item as HTMLElement).style.setProperty('--rotate', `${r}deg`);
            });
        };

        window.addEventListener('pointermove', this.pointerMoveHandler);
    }

    private initializeMiddlePosition(): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }

        const items = this.containerRef.nativeElement.querySelectorAll('span');
        if (items.length > 0 && this.pointerMoveHandler) {
            const middleIndex = Math.floor(items.length / 2);
            const rect = items[middleIndex].getBoundingClientRect();
            const syntheticEvent = new PointerEvent('pointermove', {
                clientX: rect.x,
                clientY: rect.y
            });
            this.pointerMoveHandler(syntheticEvent);
        }
    }

    private cleanup(): void {
        if (this.pointerMoveHandler) {
            window.removeEventListener('pointermove', this.pointerMoveHandler);
        }
    }

    getTotal(): number {
        return this.rows * this.columns;
    }

    getSpans(): number[] {
        return Array.from({ length: this.getTotal() }, (_, i) => i);
    }

    getSpanStyle(): Record<string, string> {
        return {
            '--rotate': `${this.baseAngle}deg`,
            backgroundColor: this.lineColor,
            width: this.lineWidth,
            height: this.lineHeight
        };
    }

    getContainerStyle(): Record<string, string> {
        return {
            display: 'grid',
            gridTemplateColumns: `repeat(${this.columns}, 1fr)`,
            gridTemplateRows: `repeat(${this.rows}, 1fr)`,
            width: this.containerSize,
            height: this.containerSize,
            ...this.style
        };
    }
}

