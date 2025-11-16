import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  HostListener,
  inject,
  PLATFORM_ID,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface NavItem {
  href: string;
  label: string;
  ariaLabel?: string;
}

@Component({
  selector: 'ngw-pill-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pill-nav.component.html',
  styleUrl: './pill-nav.component.css'
})
export class PillNavComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('logoRef', { static: false }) logoRef!: ElementRef<HTMLElement>;
  @ViewChild('logoImgRef', { static: false }) logoImgRef!: ElementRef<HTMLImageElement>;
  @ViewChild('navItemsRef', { static: false }) navItemsRef!: ElementRef<HTMLElement>;
  @ViewChild('hamburgerRef', { static: false }) hamburgerRef!: ElementRef<HTMLElement>;
  @ViewChild('mobileMenuRef', { static: false }) mobileMenuRef!: ElementRef<HTMLElement>;
  @ViewChildren('circleRef') circleRefElements!: QueryList<ElementRef<HTMLElement>>;

  @Input() logo = '';
  @Input() logoAlt = 'Logo';
  @Input() items: NavItem[] = [];
  @Input() activeHref = '';
  @Input() className = '';
  @Input() ease = 'power3.easeOut';
  @Input() baseColor = '#fff';
  @Input() pillColor = '#060010';
  @Input() hoveredPillTextColor = '#060010';
  @Input() pillTextColor?: string;
  @Input() onMobileMenuClick?: () => void;
  @Input() initialLoadAnimation = true;

  private readonly platformId = inject(PLATFORM_ID);
  private circleRefs: (HTMLElement | null)[] = [];
  private tlRefs: (gsap.core.Timeline | null)[] = [];
  private activeTweenRefs: (gsap.core.Tween | null)[] = [];
  private logoTweenRef: gsap.core.Tween | null = null;
  private resizeListener?: () => void;
  readonly isMobileMenuOpen = signal(false);

  readonly resolvedPillTextColor = signal<string>('');

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.resolvedPillTextColor.set(this.pillTextColor ?? this.baseColor);
    // Initialize arrays
    this.tlRefs = new Array(this.items.length).fill(null);
    this.activeTweenRefs = new Array(this.items.length).fill(null);
    
    // Wait for view to be ready
    setTimeout(() => {
      this.updateCircleRefs();
      this.layout();
      this.setupResizeListener();
      this.setupInitialAnimation();
    }, 0);
  }

  private updateCircleRefs(): void {
    this.circleRefs = this.circleRefElements.map(ref => ref.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (changes['pillTextColor'] || changes['baseColor']) {
      this.resolvedPillTextColor.set(this.pillTextColor ?? this.baseColor);
    }

    if (changes['items'] || changes['ease']) {
      if (changes['items']) {
        this.tlRefs = new Array(this.items.length).fill(null);
        this.activeTweenRefs = new Array(this.items.length).fill(null);
      }
      setTimeout(() => {
        this.updateCircleRefs();
        this.layout();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }

    // Kill all GSAP animations
    this.tlRefs.forEach(tl => tl?.kill());
    this.activeTweenRefs.forEach(tween => tween?.kill());
    this.logoTweenRef?.kill();
  }

  private layout(): void {
    this.circleRefs.forEach((circle, index) => {
      if (!circle?.parentElement) return;

      const pill = circle.parentElement;
      const rect = pill.getBoundingClientRect();
      const { width: w, height: h } = rect;
      const R = ((w * w) / 4 + h * h) / (2 * h);
      const D = Math.ceil(2 * R) + 2;
      const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
      const originY = D - delta;

      circle.style.width = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, {
        xPercent: -50,
        scale: 0,
        transformOrigin: `50% ${originY}px`
      });

      const label = pill.querySelector('.pill-label') as HTMLElement;
      const white = pill.querySelector('.pill-label-hover') as HTMLElement;

      if (label) gsap.set(label, { y: 0 });
      if (white) gsap.set(white, { y: h + 12, opacity: 0 });

      this.tlRefs[index]?.kill();
      const tl = gsap.timeline({ paused: true });

      tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease: this.ease, overwrite: 'auto' }, 0);

      if (label) {
        tl.to(label, { y: -(h + 8), duration: 2, ease: this.ease, overwrite: 'auto' }, 0);
      }

      if (white) {
        gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
        tl.to(white, { y: 0, opacity: 1, duration: 2, ease: this.ease, overwrite: 'auto' }, 0);
      }

      this.tlRefs[index] = tl;
    });
  }

  private setupResizeListener(): void {
    this.resizeListener = () => this.layout();
    window.addEventListener('resize', this.resizeListener);

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => this.layout()).catch(() => {});
    }
  }

  private setupInitialAnimation(): void {
    const menu = this.mobileMenuRef?.nativeElement;
    if (menu) {
      gsap.set(menu, { visibility: 'hidden', opacity: 0, scaleY: 1 });
    }

    if (this.initialLoadAnimation) {
      const logo = this.logoRef?.nativeElement;
      const navItems = this.navItemsRef?.nativeElement;

      if (logo) {
        gsap.set(logo, { scale: 0 });
        gsap.to(logo, {
          scale: 1,
          duration: 0.6,
          ease: this.ease
        });
      }

      if (navItems) {
        gsap.set(navItems, { width: 0, overflow: 'hidden' });
        gsap.to(navItems, {
          width: 'auto',
          duration: 0.6,
          ease: this.ease
        });
      }
    }
  }

  onItemMouseEnter(i: number): void {
    const tl = this.tlRefs[i];
    if (!tl) return;
    this.activeTweenRefs[i]?.kill();
    this.activeTweenRefs[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease: this.ease,
      overwrite: 'auto'
    });
  }

  onItemMouseLeave(i: number): void {
    const tl = this.tlRefs[i];
    if (!tl) return;
    this.activeTweenRefs[i]?.kill();
    this.activeTweenRefs[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease: this.ease,
      overwrite: 'auto'
    });
  }

  onLogoMouseEnter(): void {
    const img = this.logoImgRef?.nativeElement;
    if (!img) return;
    this.logoTweenRef?.kill();
    gsap.set(img, { rotate: 0 });
    this.logoTweenRef = gsap.to(img, {
      rotate: 360,
      duration: 0.2,
      ease: this.ease,
      overwrite: 'auto'
    });
  }

  toggleMobileMenu(): void {
    const newState = !this.isMobileMenuOpen();
    this.isMobileMenuOpen.set(newState);

    const hamburger = this.hamburgerRef?.nativeElement;
    const menu = this.mobileMenuRef?.nativeElement;

    if (hamburger) {
      const lines = hamburger.querySelectorAll('.hamburger-line');
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease: this.ease });
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease: this.ease });
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease: this.ease });
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease: this.ease });
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: 'visible' });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10, scaleY: 1 },
          {
            opacity: 1,
            y: 0,
            scaleY: 1,
            duration: 0.3,
            ease: this.ease,
            transformOrigin: 'top center'
          }
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
          duration: 0.2,
          ease: this.ease,
          transformOrigin: 'top center',
          onComplete: () => {
            gsap.set(menu, { visibility: 'hidden' });
          }
        });
      }
    }

    this.onMobileMenuClick?.();
  }

  isExternalLink(href: string): boolean {
    return (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('//') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('#')
    );
  }

  isRouterLink(href: string): boolean {
    return !!href && !this.isExternalLink(href);
  }

  getCssVars(): Record<string, string> {
    return {
      '--base': this.baseColor,
      '--pill-bg': this.pillColor,
      '--hover-text': this.hoveredPillTextColor,
      '--pill-text': this.resolvedPillTextColor()
    };
  }

}

