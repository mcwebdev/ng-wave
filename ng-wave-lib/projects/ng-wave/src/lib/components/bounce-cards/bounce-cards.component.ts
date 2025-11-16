import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'ngw-bounce-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bounce-cards.component.html',
  styleUrl: './bounce-cards.component.css'
})
export class BounceCardsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() className = '';
  @Input() images: string[] = [];
  @Input() containerWidth = 400;
  @Input() containerHeight = 400;
  @Input() animationDelay = 0.5;
  @Input() animationStagger = 0.06;
  @Input() easeType = 'elastic.out(1, 0.8)';
  @Input() transformStyles: string[] = [
    'rotate(10deg) translate(-170px)',
    'rotate(5deg) translate(-85px)',
    'rotate(-3deg)',
    'rotate(-10deg) translate(85px)',
    'rotate(2deg) translate(170px)'
  ];
  @Input() enableHover = true;

  private readonly platformId = inject(PLATFORM_ID);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.animateIn();
  }

  ngOnDestroy(): void {
    // Cleanup handled by Angular
  }

  private animateIn(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    gsap.fromTo(
      '.card',
      { scale: 0 },
      {
        scale: 1,
        stagger: this.animationStagger,
        ease: this.easeType,
        delay: this.animationDelay
      }
    );
  }

  private getNoRotationTransform(transformStr: string): string {
    const hasRotate = /rotate\([\s\S]*?\)/.test(transformStr);
    if (hasRotate) {
      return transformStr.replace(/rotate\([\s\S]*?\)/, 'rotate(0deg)');
    } else if (transformStr === 'none') {
      return 'rotate(0deg)';
    } else {
      return `${transformStr} rotate(0deg)`;
    }
  }

  private getPushedTransform(baseTransform: string, offsetX: number): string {
    const translateRegex = /translate\(([-0-9.]+)px\)/;
    const match = baseTransform.match(translateRegex);
    if (match) {
      const currentX = parseFloat(match[1]);
      const newX = currentX + offsetX;
      return baseTransform.replace(translateRegex, `translate(${newX}px)`);
    } else {
      return baseTransform === 'none' ? `translate(${offsetX}px)` : `${baseTransform} translate(${offsetX}px)`;
    }
  }

  onCardHover(hoveredIdx: number): void {
    if (!this.enableHover || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.images.forEach((_, i) => {
      gsap.killTweensOf(`.card-${i}`);

      const baseTransform = this.transformStyles[i] || 'none';

      if (i === hoveredIdx) {
        const noRotationTransform = this.getNoRotationTransform(baseTransform);
        gsap.to(`.card-${i}`, {
          transform: noRotationTransform,
          duration: 0.4,
          ease: 'back.out(1.4)',
          overwrite: 'auto'
        });
      } else {
        const offsetX = i < hoveredIdx ? -160 : 160;
        const pushedTransform = this.getPushedTransform(baseTransform, offsetX);

        const distance = Math.abs(hoveredIdx - i);
        const delay = distance * 0.05;

        gsap.to(`.card-${i}`, {
          transform: pushedTransform,
          duration: 0.4,
          ease: 'back.out(1.4)',
          delay,
          overwrite: 'auto'
        });
      }
    });
  }

  onCardLeave(): void {
    if (!this.enableHover || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.images.forEach((_, i) => {
      gsap.killTweensOf(`.card-${i}`);
      const baseTransform = this.transformStyles[i] || 'none';
      gsap.to(`.card-${i}`, {
        transform: baseTransform,
        duration: 0.4,
        ease: 'back.out(1.4)',
        overwrite: 'auto'
      });
    });
  }

  getCardTransform(index: number): string {
    return this.transformStyles[index] ?? 'none';
  }
}

