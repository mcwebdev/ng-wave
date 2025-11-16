import {
  Component,
  Input,
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

interface NavItem {
  label: string;
  bgColor?: string;
  textColor?: string;
  links?: Array<{
    label: string;
    href: string;
    ariaLabel?: string;
  }>;
}

@Component({
  selector: 'ngw-card-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-nav.component.html',
  styleUrl: './card-nav.component.css'
})
export class CardNavComponent implements AfterViewInit, OnDestroy {
  @ViewChild('nav', { static: false }) navRef!: ElementRef<HTMLElement>;
  @ViewChild('content', { static: false }) contentRef!: ElementRef<HTMLElement>;

  @Input() logo = '';
  @Input() logoAlt = 'Logo';
  @Input() items: NavItem[] = [];
  @Input() className = '';
  @Input() ease = 'power3.out';
  @Input() baseColor = '#fff';
  @Input() menuColor?: string;
  @Input() buttonBgColor?: string;
  @Input() buttonTextColor?: string;

  private readonly platformId = inject(PLATFORM_ID);
  isHamburgerOpen = signal(false);
  isExpanded = signal(false);
  private cardRefs: HTMLElement[] = [];
  private timeline: gsap.core.Timeline | null = null;
  private resizeListener: (() => void) | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      this.createTimeline();
      this.setupResizeListener();
    }, 0);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private calculateHeight(): number {
    if (!isPlatformBrowser(this.platformId) || !this.navRef?.nativeElement) {
      return 260;
    }

    const navEl = this.navRef.nativeElement;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile && this.contentRef?.nativeElement) {
      const contentEl = this.contentRef.nativeElement;
      const wasVisible = contentEl.style.visibility;
      const wasPointerEvents = contentEl.style.pointerEvents;
      const wasPosition = contentEl.style.position;
      const wasHeight = contentEl.style.height;

      contentEl.style.visibility = 'visible';
      contentEl.style.pointerEvents = 'auto';
      contentEl.style.position = 'static';
      contentEl.style.height = 'auto';

      contentEl.offsetHeight;

      const topBar = 60;
      const padding = 16;
      const contentHeight = contentEl.scrollHeight;

      contentEl.style.visibility = wasVisible;
      contentEl.style.pointerEvents = wasPointerEvents;
      contentEl.style.position = wasPosition;
      contentEl.style.height = wasHeight;

      return topBar + contentHeight + padding;
    }

    return 260;
  }

  private createTimeline(): gsap.core.Timeline | null {
    if (!isPlatformBrowser(this.platformId) || !this.navRef?.nativeElement) {
      return null;
    }

    const navEl = this.navRef.nativeElement;
    gsap.set(navEl, { height: 60, overflow: 'hidden' });
    gsap.set(this.cardRefs, { y: 50, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    tl.to(navEl, {
      height: this.calculateHeight(),
      duration: 0.4,
      ease: this.ease
    });

    tl.to(this.cardRefs, { y: 0, opacity: 1, duration: 0.4, ease: this.ease, stagger: 0.08 }, '-=0.1');

    this.timeline = tl;
    return tl;
  }

  private setupResizeListener(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.resizeListener = () => {
      if (!this.timeline) return;

      if (this.isExpanded()) {
        const newHeight = this.calculateHeight();
        gsap.set(this.navRef.nativeElement, { height: newHeight });

        this.timeline.kill();
        const newTl = this.createTimeline();
        if (newTl) {
          newTl.progress(1);
          this.timeline = newTl;
        }
      } else {
        this.timeline.kill();
        const newTl = this.createTimeline();
        if (newTl) {
          this.timeline = newTl;
        }
      }
    };

    window.addEventListener('resize', this.resizeListener);
  }

  toggleMenu(): void {
    if (!this.timeline) return;

    if (!this.isExpanded()) {
      this.isHamburgerOpen.set(true);
      this.isExpanded.set(true);
      this.timeline.play(0);
    } else {
      this.isHamburgerOpen.set(false);
      this.timeline.eventCallback('onReverseComplete', () => {
        this.isExpanded.set(false);
      });
      this.timeline.reverse();
    }
  }

  setCardRef(el: HTMLElement | null, index: number): void {
    if (el) {
      this.cardRefs[index] = el;
    }
  }

  getDisplayItems(): NavItem[] {
    return (this.items || []).slice(0, 3);
  }

  private cleanup(): void {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.timeline?.kill();
  }
}

