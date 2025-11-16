import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface MenuItem {
  label: string;
  href: string;
  ariaLabel?: string;
  rotation?: number;
  hoverStyles?: {
    bgColor: string;
    textColor: string;
  };
}

const DEFAULT_ITEMS: MenuItem[] = [
  {
    label: 'home',
    href: '#',
    ariaLabel: 'Home',
    rotation: -8,
    hoverStyles: { bgColor: '#3b82f6', textColor: '#ffffff' }
  },
  {
    label: 'about',
    href: '#',
    ariaLabel: 'About',
    rotation: 8,
    hoverStyles: { bgColor: '#10b981', textColor: '#ffffff' }
  },
  {
    label: 'projects',
    href: '#',
    ariaLabel: 'Documentation',
    rotation: 8,
    hoverStyles: { bgColor: '#f59e0b', textColor: '#ffffff' }
  },
  {
    label: 'blog',
    href: '#',
    ariaLabel: 'Blog',
    rotation: 8,
    hoverStyles: { bgColor: '#ef4444', textColor: '#ffffff' }
  },
  {
    label: 'contact',
    href: '#',
    ariaLabel: 'Contact',
    rotation: -8,
    hoverStyles: { bgColor: '#8b5cf6', textColor: '#ffffff' }
  }
];

@Component({
  selector: 'ngw-bubble-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bubble-menu.component.html',
  styleUrl: './bubble-menu.component.css'
})
export class BubbleMenuComponent implements AfterViewInit, OnDestroy {
  @ViewChild('overlay', { static: false }) overlayRef!: ElementRef<HTMLDivElement>;

  @Input() logo = '';
  @Input() className = '';
  @Input() menuAriaLabel = 'Toggle menu';
  @Input() menuBg = '#fff';
  @Input() menuContentColor = '#111';
  @Input() useFixedPosition = false;
  @Input() items: MenuItem[] = [];
  @Input() animationEase = 'back.out(1.5)';
  @Input() animationDuration = 0.5;
  @Input() staggerDelay = 0.12;

  @Output() menuClick = new EventEmitter<boolean>();

  private readonly platformId = inject(PLATFORM_ID);
  isMenuOpen = signal(false);
  showOverlay = signal(false);
  private bubbleRefs: HTMLElement[] = [];
  private labelRefs: HTMLElement[] = [];
  private resizeListener: (() => void) | null = null;

  readonly menuItems = this.items.length > 0 ? this.items : DEFAULT_ITEMS;
  readonly containerClassName = `bubble-menu ${this.useFixedPosition ? 'fixed' : 'absolute'} ${this.className}`.trim();

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.setupResizeListener();
  }

  ngOnDestroy(): void {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  private setupResizeListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.resizeListener = () => {
      if (this.isMenuOpen()) {
        const isDesktop = window.innerWidth >= 900;
        this.bubbleRefs.forEach((bubble, i) => {
          const item = this.menuItems[i];
          if (bubble && item) {
            const rotation = isDesktop ? (item.rotation ?? 0) : 0;
            gsap.set(bubble, { rotation });
          }
        });
      }
    };

    window.addEventListener('resize', this.resizeListener);
  }

  toggleMenu(): void {
    const nextState = !this.isMenuOpen();
    if (nextState) {
      this.showOverlay.set(true);
    }
    this.isMenuOpen.set(nextState);
    this.menuClick.emit(nextState);
    this.animateMenu();
  }

  private animateMenu(): void {
    if (!isPlatformBrowser(this.platformId) || !this.overlayRef?.nativeElement) {
      return;
    }

    const overlay = this.overlayRef.nativeElement;
    const bubbles = this.bubbleRefs.filter(Boolean);
    const labels = this.labelRefs.filter(Boolean);

    if (this.isMenuOpen()) {
      gsap.set(overlay, { display: 'flex' });
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.set(bubbles, { scale: 0, transformOrigin: '50% 50%' });
      gsap.set(labels, { y: 24, autoAlpha: 0 });

      bubbles.forEach((bubble, i) => {
        const delay = i * this.staggerDelay + gsap.utils.random(-0.05, 0.05);
        const tl = gsap.timeline({ delay });

        tl.to(bubble, {
          scale: 1,
          duration: this.animationDuration,
          ease: this.animationEase
        });

        if (labels[i]) {
          tl.to(
            labels[i],
            {
              y: 0,
              autoAlpha: 1,
              duration: this.animationDuration,
              ease: 'power3.out'
            },
            `-=${this.animationDuration * 0.9}`
          );
        }
      });
    } else if (this.showOverlay()) {
      gsap.killTweensOf([...bubbles, ...labels]);
      gsap.to(labels, {
        y: 24,
        autoAlpha: 0,
        duration: 0.2,
        ease: 'power3.in'
      });
      gsap.to(bubbles, {
        scale: 0,
        duration: 0.2,
        ease: 'power3.in',
        onComplete: () => {
          gsap.set(overlay, { display: 'none' });
          this.showOverlay.set(false);
        }
      });
    }
  }

  registerBubbleRef(el: HTMLElement | null, index: number): void {
    if (el) {
      this.bubbleRefs[index] = el;
    }
  }

  registerLabelRef(el: HTMLElement | null, index: number): void {
    if (el) {
      this.labelRefs[index] = el;
    }
  }
}

