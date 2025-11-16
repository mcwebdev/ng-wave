import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
  HostListener,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';

interface TrailItem {
  id: number;
  x: number;
  y: number;
  angle: number;
  randomX?: number;
  randomY?: number;
  randomRotate?: number;
}

@Component({
  selector: 'ngw-text-cursor',
  standalone: true,
  imports: [],
  templateUrl: './text-cursor.component.html',
  styleUrl: './text-cursor.component.css'
})
export class TextCursorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() text = '⚛️';
  @Input() delay = 0.01;
  @Input() spacing = 100;
  @Input() followMouseDirection = true;
  @Input() randomFloat = true;
  @Input() exitDuration = 0.5;
  @Input() removalInterval = 30;
  @Input() maxPoints = 5;

  private readonly platformId = inject(PLATFORM_ID);
  readonly trail = signal<TrailItem[]>([]);
  private lastMoveTime = Date.now();
  private idCounter = 0;
  private intervalId?: number;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.intervalId = window.setInterval(() => {
      if (Date.now() - this.lastMoveTime > 100) {
        const current = this.trail();
        if (current.length > 0) {
          this.trail.set(current.slice(1));
        }
      }
    }, this.removalInterval);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
    }
  }

  @HostListener('mousemove', ['$event'])
  handleMouseMove(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) {
      return;
    }

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const current = this.trail();
    let newTrail = [...current];

    if (newTrail.length === 0) {
      newTrail.push({
        id: this.idCounter++,
        x: mouseX,
        y: mouseY,
        angle: 0,
        ...(this.randomFloat && {
          randomX: Math.random() * 10 - 5,
          randomY: Math.random() * 10 - 5,
          randomRotate: Math.random() * 10 - 5
        })
      });
    } else {
      const last = newTrail[newTrail.length - 1];
      const dx = mouseX - last.x;
      const dy = mouseY - last.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= this.spacing) {
        let rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (rawAngle > 90) rawAngle -= 180;
        else if (rawAngle < -90) rawAngle += 180;
        const computedAngle = this.followMouseDirection ? rawAngle : 0;
        const steps = Math.floor(distance / this.spacing);

        for (let i = 1; i <= steps; i++) {
          const t = (this.spacing * i) / distance;
          const newX = last.x + dx * t;
          const newY = last.y + dy * t;
          newTrail.push({
            id: this.idCounter++,
            x: newX,
            y: newY,
            angle: computedAngle,
            ...(this.randomFloat && {
              randomX: Math.random() * 10 - 5,
              randomY: Math.random() * 10 - 5,
              randomRotate: Math.random() * 10 - 5
            })
          });
        }
      }
    }

    if (newTrail.length > this.maxPoints) {
      newTrail = newTrail.slice(newTrail.length - this.maxPoints);
    }

    this.trail.set(newTrail);
    this.lastMoveTime = Date.now();
  }

  trackByItemId(index: number, item: TrailItem): number {
    return item.id;
  }
}

