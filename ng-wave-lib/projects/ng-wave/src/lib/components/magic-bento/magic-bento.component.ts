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

interface BentoCard {
  color: string;
  title: string;
  description: string;
  label: string;
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '132, 0, 255';
const MOBILE_BREAKPOINT = 768;

const DEFAULT_CARD_DATA: BentoCard[] = [
  {
    color: '#060010',
    title: 'Analytics',
    description: 'Track user behavior',
    label: 'Insights'
  },
  {
    color: '#060010',
    title: 'Dashboard',
    description: 'Centralized data view',
    label: 'Overview'
  },
  {
    color: '#060010',
    title: 'Collaboration',
    description: 'Work together seamlessly',
    label: 'Teamwork'
  },
  {
    color: '#060010',
    title: 'Automation',
    description: 'Streamline workflows',
    label: 'Efficiency'
  },
  {
    color: '#060010',
    title: 'Integration',
    description: 'Connect favorite tools',
    label: 'Connectivity'
  },
  {
    color: '#060010',
    title: 'Security',
    description: 'Enterprise-grade protection',
    label: 'Protection'
  }
];

function createParticleElement(x: number, y: number, color = DEFAULT_GLOW_COLOR): HTMLElement {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
}

function calculateSpotlightValues(radius: number): { proximity: number; fadeDistance: number } {
  return {
    proximity: radius * 0.5,
    fadeDistance: radius * 0.75
  };
}

function updateCardGlowProperties(card: HTMLElement, mouseX: number, mouseY: number, glow: number, radius: number): void {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
}

@Component({
  selector: 'ngw-magic-bento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './magic-bento.component.html',
  styleUrl: './magic-bento.component.css'
})
export class MagicBentoComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('gridRef', { static: false }) gridRef!: ElementRef<HTMLElement>;
  @ViewChildren('cardRef') cardRefElements!: QueryList<ElementRef<HTMLElement>>;

  @Input() cards: BentoCard[] = DEFAULT_CARD_DATA;
  @Input() textAutoHide = true;
  @Input() enableStars = true;
  @Input() enableSpotlight = true;
  @Input() enableBorderGlow = true;
  @Input() disableAnimations = false;
  @Input() spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS;
  @Input() particleCount = DEFAULT_PARTICLE_COUNT;
  @Input() enableTilt = false;
  @Input() glowColor = DEFAULT_GLOW_COLOR;
  @Input() clickEffect = true;
  @Input() enableMagnetism = true;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private spotlight?: HTMLElement;
  private isInsideSection = false;
  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseLeaveListener?: () => void;
  private isMobile = signal(false);
  private particleRefs: Map<number, HTMLElement[]> = new Map();
  private timeoutsRefs: Map<number, number[]> = new Map();
  private isHoveredRefs: Map<number, boolean> = new Map();
  private magnetismAnimationRefs: Map<number, gsap.core.Tween | null> = new Map();
  private memoizedParticlesRefs: Map<number, HTMLElement[]> = new Map();
  private particlesInitializedRefs: Map<number, boolean> = new Map();

  readonly shouldDisableAnimations = signal(false);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.checkMobile();
    this.shouldDisableAnimations.set(this.disableAnimations || this.isMobile());
    setTimeout(() => {
      this.setupSpotlight();
    }, 0);
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (changes['disableAnimations']) {
      this.shouldDisableAnimations.set(this.disableAnimations || this.isMobile());
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cleanup();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.checkMobile();
    this.shouldDisableAnimations.set(this.disableAnimations || this.isMobile());
  }

  private checkMobile(): void {
    this.isMobile.set(window.innerWidth <= MOBILE_BREAKPOINT);
  }

  private setupSpotlight(): void {
    if (this.shouldDisableAnimations() || !this.enableSpotlight || !this.gridRef?.nativeElement) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${this.glowColor}, 0.15) 0%,
        rgba(${this.glowColor}, 0.08) 15%,
        rgba(${this.glowColor}, 0.04) 25%,
        rgba(${this.glowColor}, 0.02) 40%,
        rgba(${this.glowColor}, 0.01) 65%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    this.spotlight = spotlight;

    this.mouseMoveListener = (e: MouseEvent) => {
      if (!this.spotlight || !this.gridRef?.nativeElement) return;

      const section = this.gridRef.nativeElement.closest('.bento-section');
      const rect = section?.getBoundingClientRect();
      const mouseInside =
        rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      this.isInsideSection = mouseInside || false;
      const cards = this.gridRef.nativeElement.querySelectorAll('.magic-bento-card');

      if (!mouseInside) {
        gsap.to(this.spotlight, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
        cards.forEach(card => {
          (card as HTMLElement).style.setProperty('--glow-intensity', '0');
        });
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(this.spotlightRadius);
      let minDistance = Infinity;

      cards.forEach(card => {
        const cardElement = card as HTMLElement;
        const cardRect = cardElement.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(cardElement, e.clientX, e.clientY, glowIntensity, this.spotlightRadius);
      });

      gsap.to(this.spotlight, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: 'power2.out'
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

      gsap.to(this.spotlight, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: 'power2.out'
      });
    };

    this.mouseLeaveListener = () => {
      this.isInsideSection = false;
      this.gridRef?.nativeElement?.querySelectorAll('.magic-bento-card').forEach(card => {
        (card as HTMLElement).style.setProperty('--glow-intensity', '0');
      });
      if (this.spotlight) {
        gsap.to(this.spotlight, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseleave', this.mouseLeaveListener);
  }


  private cleanup(): void {
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.mouseLeaveListener) {
      document.removeEventListener('mouseleave', this.mouseLeaveListener);
    }
    if (this.spotlight?.parentNode) {
      this.spotlight.parentNode.removeChild(this.spotlight);
    }

    // Clean up all particles and animations
    this.particleRefs.forEach(particles => {
      particles.forEach(particle => {
        gsap.killTweensOf(particle);
        particle.parentNode?.removeChild(particle);
      });
    });
    this.timeoutsRefs.forEach(timeouts => {
      timeouts.forEach(clearTimeout);
    });
    this.magnetismAnimationRefs.forEach(tween => tween?.kill());
  }

  initializeParticles(index: number): void {
    if (this.particlesInitializedRefs.get(index) || this.shouldDisableAnimations()) return;

    const cardRef = this.cardRefElements.get(index);
    if (!cardRef?.nativeElement) return;

    const { width, height } = cardRef.nativeElement.getBoundingClientRect();
    const particles: HTMLElement[] = Array.from({ length: this.particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, this.glowColor)
    );
    this.memoizedParticlesRefs.set(index, particles);
    this.particlesInitializedRefs.set(index, true);
  }

  clearAllParticles(index: number): void {
    const timeouts = this.timeoutsRefs.get(index) || [];
    timeouts.forEach(clearTimeout);
    this.timeoutsRefs.set(index, []);

    this.magnetismAnimationRefs.get(index)?.kill();

    const particles = this.particleRefs.get(index) || [];
    particles.forEach(particle => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        }
      });
    });
    this.particleRefs.set(index, []);
  }

  animateParticles(index: number): void {
    const cardRef = this.cardRefElements.get(index);
    if (!cardRef?.nativeElement || !this.isHoveredRefs.get(index) || this.shouldDisableAnimations()) return;

    if (!this.particlesInitializedRefs.get(index)) {
      this.initializeParticles(index);
    }

    const memoizedParticles = this.memoizedParticlesRefs.get(index) || [];
    const timeouts: number[] = [];

    memoizedParticles.forEach((particle, i) => {
      const timeoutId = window.setTimeout(() => {
        if (!this.isHoveredRefs.get(index) || !cardRef?.nativeElement) return;

        const clone = particle.cloneNode(true) as HTMLElement;
        cardRef.nativeElement.appendChild(clone);
        const particles = this.particleRefs.get(index) || [];
        particles.push(clone);
        this.particleRefs.set(index, particles);

        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          rotation: Math.random() * 360,
          duration: 2 + Math.random() * 2,
          ease: 'none',
          repeat: -1,
          yoyo: true
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true
        });
      }, i * 100);

      timeouts.push(timeoutId);
    });

    this.timeoutsRefs.set(index, timeouts);
  }

  onCardMouseEnter(index: number, event: MouseEvent): void {
    if (this.shouldDisableAnimations()) return;

    this.isHoveredRefs.set(index, true);
    this.animateParticles(index);

    const cardRef = this.cardRefElements.get(index);
    if (!cardRef?.nativeElement || !this.enableTilt) return;

    gsap.to(cardRef.nativeElement, {
      rotateX: 5,
      rotateY: 5,
      duration: 0.3,
      ease: 'power2.out',
      transformPerspective: 1000
    });
  }

  onCardMouseLeave(index: number): void {
    if (this.shouldDisableAnimations()) return;

    this.isHoveredRefs.set(index, false);
    this.clearAllParticles(index);

    const cardRef = this.cardRefElements.get(index);
    if (!cardRef?.nativeElement) return;

    if (this.enableTilt) {
      gsap.to(cardRef.nativeElement, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    }

    if (this.enableMagnetism) {
      gsap.to(cardRef.nativeElement, {
        x: 0,
        y: 0,
        duration: 0.3,
        ease: 'power2.out'
      });
    }
  }

  onCardMouseMove(index: number, event: MouseEvent): void {
    if (this.shouldDisableAnimations() || (!this.enableTilt && !this.enableMagnetism)) return;

    const cardRef = this.cardRefElements.get(index);
    if (!cardRef?.nativeElement) return;

    const rect = cardRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    if (this.enableTilt) {
      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      gsap.to(cardRef.nativeElement, {
        rotateX,
        rotateY,
        duration: 0.1,
        ease: 'power2.out',
        transformPerspective: 1000
      });
    }

    if (this.enableMagnetism) {
      const magnetX = (x - centerX) * 0.05;
      const magnetY = (y - centerY) * 0.05;

      this.magnetismAnimationRefs.get(index)?.kill();
      const tween = gsap.to(cardRef.nativeElement, {
        x: magnetX,
        y: magnetY,
        duration: 0.3,
        ease: 'power2.out'
      });
      this.magnetismAnimationRefs.set(index, tween);
    }
  }

  onCardClick(index: number, event: MouseEvent): void {
    if (!this.clickEffect || this.shouldDisableAnimations()) return;

    const cardRef = this.cardRefElements.get(index);
    if (!cardRef?.nativeElement) return;

    const rect = cardRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const maxDistance = Math.max(
      Math.hypot(x, y),
      Math.hypot(x - rect.width, y),
      Math.hypot(x, y - rect.height),
      Math.hypot(x - rect.width, y - rect.height)
    );

    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: absolute;
      width: ${maxDistance * 2}px;
      height: ${maxDistance * 2}px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(${this.glowColor}, 0.4) 0%, rgba(${this.glowColor}, 0.2) 30%, transparent 70%);
      left: ${x - maxDistance}px;
      top: ${y - maxDistance}px;
      pointer-events: none;
      z-index: 1000;
    `;

    cardRef.nativeElement.appendChild(ripple);

    gsap.fromTo(
      ripple,
      {
        scale: 0,
        opacity: 1
      },
      {
        scale: 1,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => ripple.remove()
      }
    );
  }


  getCardStyle(card: BentoCard): Record<string, string> {
    return {
      backgroundColor: card.color,
      '--glow-color': this.glowColor
    };
  }

  getCardClasses(card: BentoCard, index: number): string {
    let classes = 'magic-bento-card';
    if (this.textAutoHide) classes += ' magic-bento-card--text-autohide';
    if (this.enableBorderGlow) classes += ' magic-bento-card--border-glow';
    return classes;
  }
}

