import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface MenuItem {
  link: string;
  text: string;
  image: string;
}

@Component({
  selector: 'ngw-flowing-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flowing-menu.component.html',
  styleUrl: './flowing-menu.component.css'
})
export class FlowingMenuComponent implements AfterViewInit {
  @Input() items: MenuItem[] = [];

  private readonly platformId = inject(PLATFORM_ID);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
  }

  findClosestEdge(mouseX: number, mouseY: number, width: number, height: number): 'top' | 'bottom' {
    const topEdgeDist = this.distMetric(mouseX, mouseY, width / 2, 0);
    const bottomEdgeDist = this.distMetric(mouseX, mouseY, width / 2, height);
    return topEdgeDist < bottomEdgeDist ? 'top' : 'bottom';
  }

  private distMetric(x: number, y: number, x2: number, y2: number): number {
    const xDiff = x - x2;
    const yDiff = y - y2;
    return xDiff * xDiff + yDiff * yDiff;
  }

  handleMouseEnter(event: MouseEvent, itemIndex: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const marquee = target.querySelector('.marquee') as HTMLElement;
    const marqueeInner = target.querySelector('.marquee__inner-wrap') as HTMLElement;

    if (!target || !marquee || !marqueeInner) return;

    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const edge = this.findClosestEdge(x, y, rect.width, rect.height);

    const animationDefaults = { duration: 0.6, ease: 'expo' };

    gsap
      .timeline({ defaults: animationDefaults })
      .set(marquee, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .set(marqueeInner, { y: edge === 'top' ? '101%' : '-101%' }, 0)
      .to([marquee, marqueeInner], { y: '0%' }, 0);
  }

  handleMouseLeave(event: MouseEvent, itemIndex: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const marquee = target.querySelector('.marquee') as HTMLElement;
    const marqueeInner = target.querySelector('.marquee__inner-wrap') as HTMLElement;

    if (!target || !marquee || !marqueeInner) return;

    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const edge = this.findClosestEdge(x, y, rect.width, rect.height);

    const animationDefaults = { duration: 0.6, ease: 'expo' };

    gsap
      .timeline({ defaults: animationDefaults })
      .to(marquee, { y: edge === 'top' ? '-101%' : '101%' }, 0)
      .to(marqueeInner, { y: edge === 'top' ? '101%' : '-101%' }, 0);
  }
}

