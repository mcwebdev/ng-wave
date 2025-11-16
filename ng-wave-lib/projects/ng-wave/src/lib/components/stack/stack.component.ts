import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostListener,
  inject,
  PLATFORM_ID,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';

gsap.registerPlugin(Draggable);

interface CardData {
  id: number;
  img: string;
}

interface CardDimensions {
  width: number;
  height: number;
}

interface AnimationConfig {
  stiffness: number;
  damping: number;
}

@Component({
  selector: 'ngw-stack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stack.component.html',
  styleUrl: './stack.component.css'
})
export class StackComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() randomRotation = false;
  @Input() sensitivity = 200;
  @Input() cardDimensions: CardDimensions = { width: 208, height: 208 };
  @Input() cardsData: CardData[] = [];
  @Input() animationConfig: AnimationConfig = { stiffness: 260, damping: 20 };
  @Input() sendToBackOnClick = false;

  private readonly platformId = inject(PLATFORM_ID);
  private cards = signal<CardData[]>([]);
  private draggables: Draggable[] = [];
  private cardTweens: Map<number, gsap.core.Tween> = new Map();

  readonly cardsValue = this.cards.asReadonly();

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initializeCards();
    setTimeout(() => {
      this.setupDraggables();
      this.animateCards();
    }, 0);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initializeCards(): void {
    const defaultCards: CardData[] = [
      { id: 1, img: 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?q=80&w=500&auto=format' },
      { id: 2, img: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=500&auto=format' },
      { id: 3, img: 'https://images.unsplash.com/photo-1452626212852-811d58933cae?q=80&w=500&auto=format' },
      { id: 4, img: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?q=80&w=500&auto=format' }
    ];

    this.cards.set(this.cardsData.length > 0 ? [...this.cardsData] : defaultCards);
  }

  private setupDraggables(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) {
      return;
    }

    const cardElements = this.containerRef.nativeElement.querySelectorAll('.stack-card-rotate');
    cardElements.forEach((cardEl, index) => {
      const card = this.cards()[index];
      if (!card) return;

      const draggable = Draggable.create(cardEl as HTMLElement, {
        type: 'x,y',
        bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
        dragResistance: 0.4,
        onDragEnd: () => {
          const x = (draggable as Draggable).x;
          const y = (draggable as Draggable).y;
          const distance = Math.sqrt(x * x + y * y);

          if (distance > this.sensitivity) {
            this.sendToBack(card.id);
          } else {
            gsap.to(cardEl, {
              x: 0,
              y: 0,
              duration: 0.3,
              ease: 'power2.out'
            });
          }
        }
      })[0];

      this.draggables.push(draggable);
    });
  }

  private animateCards(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const cards = this.cards();
    cards.forEach((card, index) => {
      const cardEl = this.containerRef.nativeElement.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement;
      if (!cardEl) return;

      const randomRotate = this.randomRotation ? Math.random() * 10 - 5 : 0;
      const rotateZ = (cards.length - index - 1) * 4 + randomRotate;
      const scale = 1 + index * 0.06 - cards.length * 0.06;

      this.cardTweens.get(card.id)?.kill();
      const tween = gsap.to(cardEl, {
        rotateZ,
        scale,
        transformOrigin: '90% 90%',
        duration: 0.6,
        ease: `elastic.out(${this.animationConfig.stiffness / 100}, ${this.animationConfig.damping / 100})`,
        overwrite: 'auto'
      });

      this.cardTweens.set(card.id, tween);
    });
  }

  sendToBack(id: number): void {
    const currentCards = [...this.cards()];
    const index = currentCards.findIndex(card => card.id === id);
    if (index === -1) return;

    const [card] = currentCards.splice(index, 1);
    currentCards.unshift(card);
    this.cards.set(currentCards);

    setTimeout(() => {
      this.cleanupDraggables();
      this.setupDraggables();
      this.animateCards();
    }, 0);
  }

  onCardClick(cardId: number): void {
    if (this.sendToBackOnClick) {
      this.sendToBack(cardId);
    }
  }

  private cleanupDraggables(): void {
    this.draggables.forEach(draggable => draggable.kill());
    this.draggables = [];
  }

  private cleanup(): void {
    this.cleanupDraggables();
    this.cardTweens.forEach(tween => tween.kill());
    this.cardTweens.clear();
  }
}

