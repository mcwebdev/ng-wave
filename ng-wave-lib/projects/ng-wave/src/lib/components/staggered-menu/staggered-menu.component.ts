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
  link: string;
  ariaLabel?: string;
}

interface SocialItem {
  label: string;
  link: string;
}

@Component({
  selector: 'ngw-staggered-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staggered-menu.component.html',
  styleUrl: './staggered-menu.component.css'
})
export class StaggeredMenuComponent implements AfterViewInit, OnDestroy {
  @ViewChild('preLayers', { static: false }) preLayersRef!: ElementRef<HTMLDivElement>;
  @ViewChild('panel', { static: false }) panelRef!: ElementRef<HTMLElement>;
  @ViewChild('plusH', { static: false }) plusHRef!: ElementRef<HTMLElement>;
  @ViewChild('plusV', { static: false }) plusVRef!: ElementRef<HTMLElement>;
  @ViewChild('icon', { static: false }) iconRef!: ElementRef<HTMLElement>;
  @ViewChild('textInner', { static: false }) textInnerRef!: ElementRef<HTMLElement>;
  @ViewChild('toggleBtn', { static: false }) toggleBtnRef!: ElementRef<HTMLButtonElement>;

  @Input() position: 'left' | 'right' = 'right';
  @Input() colors: string[] = ['#B19EEF', '#5227FF'];
  @Input() items: MenuItem[] = [];
  @Input() socialItems: SocialItem[] = [];
  @Input() displaySocials = true;
  @Input() displayItemNumbering = true;
  @Input() className = '';
  @Input() logoUrl = '/logo.png';
  @Input() menuButtonColor = '#fff';
  @Input() openMenuButtonColor = '#fff';
  @Input() accentColor = '#5227FF';
  @Input() changeMenuColorOnOpen = true;
  @Input() isFixed = false;

  @Output() menuOpen = new EventEmitter<void>();
  @Output() menuClose = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  readonly open = signal(false);
  private openRef = { current: false };
  private preLayerEls: HTMLElement[] = [];
  private openTl: gsap.core.Timeline | null = null;
  private closeTween: gsap.core.Tween | null = null;
  private spinTween: gsap.core.Tween | null = null;
  private textCycleAnim: gsap.core.Tween | null = null;
  private colorTween: gsap.core.Tween | null = null;
  private itemEntranceTween: gsap.core.Tween | null = null;
  private busy = false;
  readonly textLines = signal<string[]>(['Menu', 'Close']);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      this.initialize();
    }, 0);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initialize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const panel = this.panelRef?.nativeElement;
    const preContainer = this.preLayersRef?.nativeElement;
    const plusH = this.plusHRef?.nativeElement;
    const plusV = this.plusVRef?.nativeElement;
    const icon = this.iconRef?.nativeElement;
    const textInner = this.textInnerRef?.nativeElement;

    if (!panel || !plusH || !plusV || !icon || !textInner) return;

    let preLayers: HTMLElement[] = [];
    if (preContainer) {
      preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer')) as HTMLElement[];
    }
    this.preLayerEls = preLayers;

    const offscreen = this.position === 'left' ? -100 : 100;
    gsap.set([panel, ...preLayers], { xPercent: offscreen });
    gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
    gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
    gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
    gsap.set(textInner, { yPercent: 0 });
    if (this.toggleBtnRef?.nativeElement) {
      gsap.set(this.toggleBtnRef.nativeElement, { color: this.menuButtonColor });
    }
  }

  private buildOpenTimeline(): gsap.core.Timeline | null {
    const panel = this.panelRef?.nativeElement;
    const layers = this.preLayerEls;
    if (!panel) return null;

    this.openTl?.kill();
    if (this.closeTween) {
      this.closeTween.kill();
      this.closeTween = null;
    }
    this.itemEntranceTween?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel')) as HTMLElement[];
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item')) as HTMLElement[];
    const socialTitle = panel.querySelector('.sm-socials-title') as HTMLElement;
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link')) as HTMLElement[];

    const layerStates = layers.map(el => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }));
    const panelStart = Number(gsap.getProperty(panel, 'xPercent'));

    if (itemEls.length) {
      gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    }
    if (numberEls.length) {
      gsap.set(numberEls, { '--sm-num-opacity': 0 });
    }
    if (socialTitle) {
      gsap.set(socialTitle, { opacity: 0 });
    }
    if (socialLinks.length) {
      gsap.set(socialLinks, { y: 25, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: { each: 0.1, from: 'start' }
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: 'power2.out',
            '--sm-num-opacity': 1,
            stagger: { each: 0.08, from: 'start' }
          },
          itemsStart + 0.1
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) {
        tl.to(
          socialTitle,
          {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
          },
          socialsStart
        );
      }
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => {
              gsap.set(socialLinks, { clearProps: 'opacity' });
            }
          },
          socialsStart + 0.04
        );
      }
    }

    this.openTl = tl;
    return tl;
  }

  private playOpen(): void {
    if (this.busy) return;
    this.busy = true;
    const tl = this.buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        this.busy = false;
      });
      tl.play(0);
    } else {
      this.busy = false;
    }
  }

  private playClose(): void {
    this.openTl?.kill();
    this.openTl = null;
    this.itemEntranceTween?.kill();

    const panel = this.panelRef?.nativeElement;
    const layers = this.preLayerEls;
    if (!panel) return;

    const all = [...layers, panel];
    this.closeTween?.kill();
    const offscreen = this.position === 'left' ? -100 : 100;
    this.closeTween = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel')) as HTMLElement[];
        if (itemEls.length) {
          gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        }
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item')) as HTMLElement[];
        if (numberEls.length) {
          gsap.set(numberEls, { '--sm-num-opacity': 0 });
        }
        const socialTitle = panel.querySelector('.sm-socials-title') as HTMLElement;
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link')) as HTMLElement[];
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        this.busy = false;
      }
    });
  }

  private animateIcon(opening: boolean): void {
    const icon = this.iconRef?.nativeElement;
    if (!icon) return;
    this.spinTween?.kill();
    if (opening) {
      this.spinTween = gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' });
    } else {
      this.spinTween = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
    }
  }

  private animateColor(opening: boolean): void {
    const btn = this.toggleBtnRef?.nativeElement;
    if (!btn) return;
    this.colorTween?.kill();
    if (this.changeMenuColorOnOpen) {
      const targetColor = opening ? this.openMenuButtonColor : this.menuButtonColor;
      this.colorTween = gsap.to(btn, {
        color: targetColor,
        delay: 0.18,
        duration: 0.3,
        ease: 'power2.out'
      });
    } else {
      gsap.set(btn, { color: this.menuButtonColor });
    }
  }

  private animateText(opening: boolean): void {
    const inner = this.textInnerRef?.nativeElement;
    if (!inner) return;
    this.textCycleAnim?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;
    const seq: string[] = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    this.textLines.set(seq);

    gsap.set(inner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    this.textCycleAnim = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out'
    });
  }

  toggleMenu(): void {
    const target = !this.openRef.current;
    this.openRef.current = target;
    this.open.set(target);
    if (target) {
      this.menuOpen.emit();
      this.playOpen();
    } else {
      this.menuClose.emit();
      this.playClose();
    }
    this.animateIcon(target);
    this.animateColor(target);
    this.animateText(target);
  }

  getColors(): string[] {
    const raw = this.colors && this.colors.length ? this.colors.slice(0, 4) : ['#1e1e22', '#35353c'];
    let arr = [...raw];
    if (arr.length >= 3) {
      const mid = Math.floor(arr.length / 2);
      arr.splice(mid, 1);
    }
    return arr;
  }

  private cleanup(): void {
    this.openTl?.kill();
    this.closeTween?.kill();
    this.spinTween?.kill();
    this.textCycleAnim?.kill();
    this.colorTween?.kill();
    this.itemEntranceTween?.kill();
  }
}

