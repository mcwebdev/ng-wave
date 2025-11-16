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
import { gsap } from 'gsap';

interface CellGap {
    col?: number;
    row?: number;
}

interface Duration {
    enter: number;
    leave: number;
}

@Component({
    selector: 'ngw-cubes',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './cubes.component.html',
    styleUrl: './cubes.component.css'
})
export class CubesComponent implements AfterViewInit, OnDestroy {
    @ViewChild('sceneRef', { static: false }) sceneRef!: ElementRef<HTMLDivElement>;

    @Input() gridSize = 10;
    @Input() cubeSize?: number;
    @Input() maxAngle = 45;
    @Input() radius = 3;
    @Input() easing = 'power3.out';
    @Input() duration: Duration = { enter: 0.3, leave: 0.6 };
    @Input() cellGap?: number | CellGap;
    @Input() borderStyle = '1px solid #fff';
    @Input() faceColor = '#060010';
    @Input() shadow = false;
    @Input() autoAnimate = true;
    @Input() rippleOnClick = true;
    @Input() rippleColor = '#fff';
    @Input() rippleSpeed = 2;

    private readonly platformId = inject(PLATFORM_ID);
    private rafId?: number;
    private idleTimerId?: number;
    private userActive = false;
    private simPos = { x: 0, y: 0 };
    private simTarget = { x: 0, y: 0 };
    private simRafId?: number;

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (this.autoAnimate) {
            this.startAutoAnimation();
        }
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
    }

    private get colGap(): string {
        if (typeof this.cellGap === 'number') {
            return `${this.cellGap}px`;
        }
        if (this.cellGap?.col !== undefined) {
            return `${this.cellGap.col}px`;
        }
        return '5%';
    }

    private get rowGap(): string {
        if (typeof this.cellGap === 'number') {
            return `${this.cellGap}px`;
        }
        if (this.cellGap?.row !== undefined) {
            return `${this.cellGap.row}px`;
        }
        return '5%';
    }

    private tiltAt(rowCenter: number, colCenter: number): void {
        if (!this.sceneRef?.nativeElement) {
            return;
        }

        const cubes = this.sceneRef.nativeElement.querySelectorAll('.cube');
        cubes.forEach(cube => {
            const r = +(cube as HTMLElement).dataset['row']!;
            const c = +(cube as HTMLElement).dataset['col']!;
            const dist = Math.hypot(r - rowCenter, c - colCenter);
            if (dist <= this.radius) {
                const pct = 1 - dist / this.radius;
                const angle = pct * this.maxAngle;
                gsap.to(cube, {
                    duration: this.duration.enter,
                    ease: this.easing,
                    overwrite: true,
                    rotateX: -angle,
                    rotateY: angle
                });
            } else {
                gsap.to(cube, {
                    duration: this.duration.leave,
                    ease: 'power3.out',
                    overwrite: true,
                    rotateX: 0,
                    rotateY: 0
                });
            }
        });
    }

    @HostListener('pointermove', ['$event'])
    onPointerMove(e: PointerEvent): void {
        if (!this.sceneRef?.nativeElement) {
            return;
        }

        this.userActive = true;
        if (this.idleTimerId !== undefined) {
            clearTimeout(this.idleTimerId);
        }

        const rect = this.sceneRef.nativeElement.getBoundingClientRect();
        const cellW = rect.width / this.gridSize;
        const cellH = rect.height / this.gridSize;
        const colCenter = (e.clientX - rect.left) / cellW;
        const rowCenter = (e.clientY - rect.top) / cellH;

        if (this.rafId !== undefined) {
            cancelAnimationFrame(this.rafId);
        }
        this.rafId = requestAnimationFrame(() => this.tiltAt(rowCenter, colCenter));

        this.idleTimerId = window.setTimeout(() => {
            this.userActive = false;
        }, 3000);
    }

    @HostListener('pointerleave')
    onPointerLeave(): void {
        this.resetAll();
    }

    @HostListener('click', ['$event'])
    onClick(e: MouseEvent): void {
        if (!this.rippleOnClick || !this.sceneRef?.nativeElement) {
            return;
        }

        const rect = this.sceneRef.nativeElement.getBoundingClientRect();
        const cellW = rect.width / this.gridSize;
        const cellH = rect.height / this.gridSize;

        const clientX = e.clientX;
        const clientY = e.clientY;

        const colHit = Math.floor((clientX - rect.left) / cellW);
        const rowHit = Math.floor((clientY - rect.top) / cellH);

        const baseRingDelay = 0.15;
        const baseAnimDur = 0.3;
        const baseHold = 0.6;

        const spreadDelay = baseRingDelay / this.rippleSpeed;
        const animDuration = baseAnimDur / this.rippleSpeed;
        const holdTime = baseHold / this.rippleSpeed;

        const rings: { [key: number]: HTMLElement[] } = {};
        this.sceneRef.nativeElement.querySelectorAll('.cube').forEach(cube => {
            const r = +(cube as HTMLElement).dataset['row']!;
            const c = +(cube as HTMLElement).dataset['col']!;
            const dist = Math.hypot(r - rowHit, c - colHit);
            const ring = Math.round(dist);
            if (!rings[ring]) {
                rings[ring] = [];
            }
            rings[ring].push(cube as HTMLElement);
        });

        Object.keys(rings)
            .map(Number)
            .sort((a, b) => a - b)
            .forEach(ring => {
                const delay = ring * spreadDelay;
                const faces = rings[ring].flatMap(cube =>
                    Array.from(cube.querySelectorAll('.cube-face')) as HTMLElement[]
                );

                gsap.to(faces, {
                    backgroundColor: this.rippleColor,
                    duration: animDuration,
                    delay,
                    ease: 'power3.out'
                });
                gsap.to(faces, {
                    backgroundColor: this.faceColor,
                    duration: animDuration,
                    delay: delay + animDuration + holdTime,
                    ease: 'power3.out'
                });
            });
    }

    private resetAll(): void {
        if (!this.sceneRef?.nativeElement) {
            return;
        }
        this.sceneRef.nativeElement.querySelectorAll('.cube').forEach(cube =>
            gsap.to(cube, {
                duration: this.duration.leave,
                rotateX: 0,
                rotateY: 0,
                ease: 'power3.out'
            })
        );
    }

    private startAutoAnimation(): void {
        if (!this.sceneRef?.nativeElement) {
            return;
        }

        this.simPos = {
            x: Math.random() * this.gridSize,
            y: Math.random() * this.gridSize
        };
        this.simTarget = {
            x: Math.random() * this.gridSize,
            y: Math.random() * this.gridSize
        };

        const speed = 0.02;
        const loop = () => {
            if (!this.userActive) {
                const pos = this.simPos;
                const tgt = this.simTarget;
                pos.x += (tgt.x - pos.x) * speed;
                pos.y += (tgt.y - pos.y) * speed;
                this.tiltAt(pos.y, pos.x);
                if (Math.hypot(pos.x - tgt.x, pos.y - tgt.y) < 0.1) {
                    this.simTarget = {
                        x: Math.random() * this.gridSize,
                        y: Math.random() * this.gridSize
                    };
                }
            }
            this.simRafId = requestAnimationFrame(loop);
        };
        this.simRafId = requestAnimationFrame(loop);
    }

    private cleanup(): void {
        if (this.rafId !== undefined) {
            cancelAnimationFrame(this.rafId);
        }
        if (this.simRafId !== undefined) {
            cancelAnimationFrame(this.simRafId);
        }
        if (this.idleTimerId !== undefined) {
            clearTimeout(this.idleTimerId);
        }
    }

    getSceneStyle(): Record<string, string> {
        return {
            gridTemplateColumns: this.cubeSize
                ? `repeat(${this.gridSize}, ${this.cubeSize}px)`
                : `repeat(${this.gridSize}, 1fr)`,
            gridTemplateRows: this.cubeSize
                ? `repeat(${this.gridSize}, ${this.cubeSize}px)`
                : `repeat(${this.gridSize}, 1fr)`,
            columnGap: this.colGap,
            rowGap: this.rowGap
        };
    }

    getWrapperStyle(): Record<string, string> {
        const style: Record<string, string> = {
            '--cube-face-border': this.borderStyle,
            '--cube-face-bg': this.faceColor,
            '--cube-face-shadow': this.shadow === true ? '0 0 6px rgba(0,0,0,.5)' : this.shadow || 'none'
        };

        if (this.cubeSize) {
            style['width'] = `${this.gridSize * this.cubeSize}px`;
            style['height'] = `${this.gridSize * this.cubeSize}px`;
        }

        return style;
    }

    getCells(): number[] {
        return Array.from({ length: this.gridSize });
    }
}

