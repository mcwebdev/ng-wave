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

interface ParsedSetting {
    axis: string;
    fromValue: number;
    toValue: number;
}

@Component({
    selector: 'ngw-variable-proximity',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './variable-proximity.component.html',
    styleUrl: './variable-proximity.component.css'
})
export class VariableProximityComponent implements AfterViewInit, OnDestroy {
    @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLSpanElement>;

    @Input() label = '';
    @Input() fromFontVariationSettings = "'wght' 100";
    @Input() toFontVariationSettings = "'wght' 900";
    @Input() containerRefInput?: ElementRef<HTMLElement>;
    @Input() radius = 50;
    @Input() falloff: 'linear' | 'exponential' | 'gaussian' = 'linear';
    @Input() className = '';
    @Input() style: Record<string, string> = {};

    private readonly platformId = inject(PLATFORM_ID);
    private letterRefs: HTMLElement[] = [];
    private interpolatedSettings: string[] = [];
    private mousePosition = { x: 0, y: 0 };
    private lastPosition = { x: null as number | null, y: null as number | null };
    private rafId?: number;
    private parsedSettings: ParsedSetting[] = [];

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.parseSettings();
        this.animate();
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        if (this.rafId !== undefined) {
            cancelAnimationFrame(this.rafId);
        }
    }

    private parseSettings(): void {
        const parseSettingsStr = (settingsStr: string): Map<string, number> => {
            return new Map(
                settingsStr
                    .split(',')
                    .map(s => s.trim())
                    .map(s => {
                        const [name, value] = s.split(' ');
                        return [name.replace(/['"]/g, ''), parseFloat(value)];
                    })
            );
        };

        const fromSettings = parseSettingsStr(this.fromFontVariationSettings);
        const toSettings = parseSettingsStr(this.toFontVariationSettings);

        this.parsedSettings = Array.from(fromSettings.entries()).map(([axis, fromValue]) => ({
            axis,
            fromValue,
            toValue: toSettings.get(axis) ?? fromValue
        }));
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(e: MouseEvent): void {
        this.updateMousePosition(e.clientX, e.clientY);
    }

    @HostListener('document:touchmove', ['$event'])
    onTouchMove(e: TouchEvent): void {
        if (e.touches.length > 0) {
            this.updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    private updateMousePosition(clientX: number, clientY: number): void {
        const container = this.containerRefInput?.nativeElement || this.containerRef?.nativeElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            this.mousePosition = { x: clientX - rect.left, y: clientY - rect.top };
        } else {
            this.mousePosition = { x: clientX, y: clientY };
        }
    }

    private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    private calculateFalloff(distance: number): number {
        const norm = Math.min(Math.max(1 - distance / this.radius, 0), 1);
        switch (this.falloff) {
            case 'exponential':
                return norm ** 2;
            case 'gaussian':
                return Math.exp(-((distance / (this.radius / 2)) ** 2) / 2);
            case 'linear':
            default:
                return norm;
        }
    }

    private animate = (): void => {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const container = this.containerRefInput?.nativeElement || this.containerRef?.nativeElement;
        if (!container) {
            this.rafId = requestAnimationFrame(this.animate);
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const { x, y } = this.mousePosition;

        if (this.lastPosition.x === x && this.lastPosition.y === y) {
            this.rafId = requestAnimationFrame(this.animate);
            return;
        }

        this.lastPosition = { x, y };

        this.letterRefs.forEach((letterRef, index) => {
            if (!letterRef) return;

            const rect = letterRef.getBoundingClientRect();
            const letterCenterX = rect.left + rect.width / 2 - containerRect.left;
            const letterCenterY = rect.top + rect.height / 2 - containerRect.top;

            const distance = this.calculateDistance(x, y, letterCenterX, letterCenterY);

            if (distance >= this.radius) {
                letterRef.style.fontVariationSettings = this.fromFontVariationSettings;
                return;
            }

            const falloffValue = this.calculateFalloff(distance);
            const newSettings = this.parsedSettings
                .map(({ axis, fromValue, toValue }) => {
                    const interpolatedValue = fromValue + (toValue - fromValue) * falloffValue;
                    return `'${axis}' ${interpolatedValue}`;
                })
                .join(', ');

            this.interpolatedSettings[index] = newSettings;
            letterRef.style.fontVariationSettings = newSettings;
        });

        this.rafId = requestAnimationFrame(this.animate);
    };

    setLetterRef(index: number, el: HTMLElement | null): void {
        if (el) {
            this.letterRefs[index] = el;
        }
    }

    getLetterStyle(index: number): Record<string, string> {
        return {
            display: 'inline-block',
            fontVariationSettings: this.interpolatedSettings[index] || this.fromFontVariationSettings
        };
    }

    getWords(): string[] {
        return this.label.split(' ');
    }

    getMergedStyle(): Record<string, string> {
        return { display: 'inline', ...this.style };
    }

    getLetterGlobalIndex(wordIndex: number, letterIndex: number): number {
        let globalIndex = 0;
        const words = this.getWords();
        for (let i = 0; i < wordIndex; i++) {
            globalIndex += words[i].length;
        }
        return globalIndex + letterIndex;
    }
}

