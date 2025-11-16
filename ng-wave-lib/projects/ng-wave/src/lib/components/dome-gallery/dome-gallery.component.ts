import {
  Component,
  Input,
  ElementRef,
  ViewChild,
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

interface GalleryImage {
  src: string;
  alt?: string;
}

interface Item {
  x: number;
  y: number;
  sizeX: number;
  sizeY: number;
  src: string;
  alt: string;
}

const DEFAULT_IMAGES: GalleryImage[] = [
  {
    src: 'https://images.unsplash.com/photo-1755331039789-7e5680e26e8f?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Abstract art'
  },
  {
    src: 'https://images.unsplash.com/photo-1755569309049-98410b94f66d?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Modern sculpture'
  },
  {
    src: 'https://images.unsplash.com/photo-1755497595318-7e5e3523854f?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Digital artwork'
  },
  {
    src: 'https://images.unsplash.com/photo-1755353985163-c2a0fe5ac3d8?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Contemporary art'
  },
  {
    src: 'https://images.unsplash.com/photo-1745965976680-d00be7dc0377?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Geometric pattern'
  },
  {
    src: 'https://images.unsplash.com/photo-1752588975228-21f44630bb3c?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Textured surface'
  },
  { src: 'https://pbs.twimg.com/media/Gyla7NnXMAAXSo_?format=jpg&name=large', alt: 'Social media image' }
];

const DEFAULTS = {
  maxVerticalRotationDeg: 5,
  dragSensitivity: 20,
  enlargeTransitionMs: 300,
  segments: 35
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function normalizeAngle(d: number): number {
  return ((d % 360) + 360) % 360;
}

function wrapAngleSigned(deg: number): number {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
}

function getDataNumber(el: HTMLElement, name: string, fallback: number): number {
  const attr = (el as any).dataset?.[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
}

function buildItems(pool: GalleryImage[], seg: number): Item[] {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  const totalSlots = coords.length;
  if (pool.length === 0) {
    return coords.map(c => ({ ...c, src: '', alt: '' }));
  }
  if (pool.length > totalSlots) {
    console.warn(
      `[DomeGallery] Provided image count (${pool.length}) exceeds available tiles (${totalSlots}). Some images will not be shown.`
    );
  }

  const normalizedImages = pool.map(image => {
    if (typeof image === 'string') {
      return { src: image, alt: '' };
    }
    return { src: image.src || '', alt: image.alt || '' };
  });

  const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length]);

  for (let i = 1; i < usedImages.length; i++) {
    if (usedImages[i].src === usedImages[i - 1].src) {
      for (let j = i + 1; j < usedImages.length; j++) {
        if (usedImages[j].src !== usedImages[i].src) {
          const tmp = usedImages[i];
          usedImages[i] = usedImages[j];
          usedImages[j] = tmp;
          break;
        }
      }
    }
  }

  return coords.map((c, i) => ({
    ...c,
    src: usedImages[i].src,
    alt: usedImages[i].alt
  }));
}

function computeItemBaseRotation(offsetX: number, offsetY: number, sizeX: number, sizeY: number, segments: number): { rotateX: number; rotateY: number } {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

@Component({
  selector: 'ngw-dome-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dome-gallery.component.html',
  styleUrl: './dome-gallery.component.css'
})
export class DomeGalleryComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('rootRef', { static: false }) rootRef!: ElementRef<HTMLDivElement>;
  @ViewChild('mainRef', { static: false }) mainRef!: ElementRef<HTMLElement>;
  @ViewChild('sphereRef', { static: false }) sphereRef!: ElementRef<HTMLDivElement>;
  @ViewChild('frameRef', { static: false }) frameRef!: ElementRef<HTMLDivElement>;
  @ViewChild('viewerRef', { static: false }) viewerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('scrimRef', { static: false }) scrimRef!: ElementRef<HTMLDivElement>;

  @Input() images: GalleryImage[] | string[] = DEFAULT_IMAGES;
  @Input() fit = 0.5;
  @Input() fitBasis: 'auto' | 'min' | 'max' | 'width' | 'height' = 'auto';
  @Input() minRadius = 600;
  @Input() maxRadius = Infinity;
  @Input() padFactor = 0.25;
  @Input() overlayBlurColor = '#060010';
  @Input() maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg;
  @Input() dragSensitivity = DEFAULTS.dragSensitivity;
  @Input() enlargeTransitionMs = DEFAULTS.enlargeTransitionMs;
  @Input() segments = DEFAULTS.segments;
  @Input() dragDampening = 2;
  @Input() openedImageWidth = '250px';
  @Input() openedImageHeight = '350px';
  @Input() imageBorderRadius = '30px';
  @Input() openedImageBorderRadius = '30px';
  @Input() grayscale = true;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private rotationRef = { x: 0, y: 0 };
  private startRotRef = { x: 0, y: 0 };
  private startPosRef: { x: number; y: number } | null = null;
  private draggingRef = false;
  private movedRef = false;
  private inertiaRAF: number | null = null;
  private openingRef = false;
  private openStartedAtRef = 0;
  private lastDragEndAt = 0;
  private scrollLockedRef = false;
  private lockedRadiusRef: number | null = null;
  private resizeObserver?: ResizeObserver;
  private focusedElRef: HTMLElement | null = null;
  private originalTilePositionRef: { left: number; top: number; width: number; height: number } | null = null;
  private items: Item[] = [];
  private keydownListener?: (e: KeyboardEvent) => void;

  readonly itemsSignal = signal<Item[]>([]);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.items = buildItems(this.normalizeImages(), this.segments);
    this.itemsSignal.set(this.items);
    this.setupResizeObserver();
    this.applyTransform(this.rotationRef.x, this.rotationRef.y);
    this.setupScrimListeners();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (changes['images'] || changes['segments']) {
      this.items = buildItems(this.normalizeImages(), this.segments);
      this.itemsSignal.set(this.items);
    }

    if (changes['fit'] || changes['fitBasis'] || changes['minRadius'] || changes['maxRadius'] || changes['padFactor'] || changes['overlayBlurColor'] || changes['grayscale'] || changes['imageBorderRadius'] || changes['openedImageBorderRadius'] || changes['openedImageWidth'] || changes['openedImageHeight']) {
      // Resize observer will handle these
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.stopInertia();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
    }
    document.body.classList.remove('dg-scroll-lock');
  }

  private normalizeImages(): GalleryImage[] {
    return this.images.map(img => {
      if (typeof img === 'string') {
        return { src: img, alt: '' };
      }
      return img;
    });
  }

  private applyTransform(xDeg: number, yDeg: number): void {
    const el = this.sphereRef?.nativeElement;
    if (el) {
      el.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
  }

  private setupResizeObserver(): void {
    const root = this.rootRef?.nativeElement;
    if (!root) return;

    this.resizeObserver = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width);
      const h = Math.max(1, cr.height);
      const minDim = Math.min(w, h);
      const maxDim = Math.max(w, h);
      const aspect = w / h;
      let basis: number;
      switch (this.fitBasis) {
        case 'min':
          basis = minDim;
          break;
        case 'max':
          basis = maxDim;
          break;
        case 'width':
          basis = w;
          break;
        case 'height':
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }
      let radius = basis * this.fit;
      const heightGuard = h * 1.35;
      radius = Math.min(radius, heightGuard);
      radius = clamp(radius, this.minRadius, this.maxRadius);
      this.lockedRadiusRef = Math.round(radius);

      const viewerPad = Math.max(8, Math.round(minDim * this.padFactor));
      root.style.setProperty('--radius', `${this.lockedRadiusRef}px`);
      root.style.setProperty('--viewer-pad', `${viewerPad}px`);
      root.style.setProperty('--overlay-blur-color', this.overlayBlurColor);
      root.style.setProperty('--tile-radius', this.imageBorderRadius);
      root.style.setProperty('--enlarge-radius', this.openedImageBorderRadius);
      root.style.setProperty('--image-filter', this.grayscale ? 'grayscale(1)' : 'none');
      this.applyTransform(this.rotationRef.x, this.rotationRef.y);

      const enlargedOverlay = this.viewerRef?.nativeElement?.querySelector('.enlarge') as HTMLElement;
      if (enlargedOverlay && this.frameRef?.nativeElement && this.mainRef?.nativeElement) {
        const frameR = this.frameRef.nativeElement.getBoundingClientRect();
        const mainR = this.mainRef.nativeElement.getBoundingClientRect();

        const hasCustomSize = this.openedImageWidth && this.openedImageHeight;
        if (hasCustomSize) {
          const tempDiv = document.createElement('div');
          tempDiv.style.cssText = `position: absolute; width: ${this.openedImageWidth}; height: ${this.openedImageHeight}; visibility: hidden;`;
          document.body.appendChild(tempDiv);
          const tempRect = tempDiv.getBoundingClientRect();
          document.body.removeChild(tempDiv);

          const centeredLeft = frameR.left - mainR.left + (frameR.width - tempRect.width) / 2;
          const centeredTop = frameR.top - mainR.top + (frameR.height - tempRect.height) / 2;

          enlargedOverlay.style.left = `${centeredLeft}px`;
          enlargedOverlay.style.top = `${centeredTop}px`;
        } else {
          enlargedOverlay.style.left = `${frameR.left - mainR.left}px`;
          enlargedOverlay.style.top = `${frameR.top - mainR.top}px`;
          enlargedOverlay.style.width = `${frameR.width}px`;
          enlargedOverlay.style.height = `${frameR.height}px`;
        }
      }
    });
    this.resizeObserver.observe(root);
  }

  private stopInertia(): void {
    if (this.inertiaRAF !== null) {
      cancelAnimationFrame(this.inertiaRAF);
      this.inertiaRAF = null;
    }
  }

  private startInertia(vx: number, vy: number): void {
    const MAX_V = 1.4;
    let vX = clamp(vx, -MAX_V, MAX_V) * 80;
    let vY = clamp(vy, -MAX_V, MAX_V) * 80;
    let frames = 0;
    const d = clamp(this.dragDampening ?? 0.6, 0, 1);
    const frictionMul = 0.94 + 0.055 * d;
    const stopThreshold = 0.015 - 0.01 * d;
    const maxFrames = Math.round(90 + 270 * d);
    const step = () => {
      vX *= frictionMul;
      vY *= frictionMul;
      if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
        this.inertiaRAF = null;
        return;
      }
      if (++frames > maxFrames) {
        this.inertiaRAF = null;
        return;
      }
      const nextX = clamp(this.rotationRef.x - vY / 200, -this.maxVerticalRotationDeg, this.maxVerticalRotationDeg);
      const nextY = wrapAngleSigned(this.rotationRef.y + vX / 200);
      this.rotationRef = { x: nextX, y: nextY };
      this.applyTransform(nextX, nextY);
      this.inertiaRAF = requestAnimationFrame(step);
    };
    this.stopInertia();
    this.inertiaRAF = requestAnimationFrame(step);
  }

  @HostListener('mousedown', ['$event'])
  onDragStart(event: MouseEvent): void {
    if (this.focusedElRef || !this.mainRef?.nativeElement.contains(event.target as Node)) return;
    this.stopInertia();
    this.draggingRef = true;
    this.movedRef = false;
    this.startRotRef = { ...this.rotationRef };
    this.startPosRef = { x: event.clientX, y: event.clientY };
  }

  @HostListener('mousemove', ['$event'])
  onDrag(event: MouseEvent): void {
    if (this.focusedElRef || !this.draggingRef || !this.startPosRef || !this.mainRef?.nativeElement.contains(event.target as Node)) return;
    const dxTotal = event.clientX - this.startPosRef.x;
    const dyTotal = event.clientY - this.startPosRef.y;
    if (!this.movedRef) {
      const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
      if (dist2 > 16) this.movedRef = true;
    }
    const nextX = clamp(
      this.startRotRef.x - dyTotal / this.dragSensitivity,
      -this.maxVerticalRotationDeg,
      this.maxVerticalRotationDeg
    );
    const nextY = wrapAngleSigned(this.startRotRef.y + dxTotal / this.dragSensitivity);
    if (this.rotationRef.x !== nextX || this.rotationRef.y !== nextY) {
      this.rotationRef = { x: nextX, y: nextY };
      this.applyTransform(nextX, nextY);
    }
  }

  @HostListener('mouseup')
  onDragEnd(): void {
    if (!this.draggingRef) return;
    this.draggingRef = false;
    if (this.movedRef) {
      this.lastDragEndAt = performance.now();
    }
    this.movedRef = false;
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (this.focusedElRef || !this.mainRef?.nativeElement.contains(event.target as Node)) return;
    event.preventDefault();
    this.stopInertia();
    this.draggingRef = true;
    this.movedRef = false;
    this.startRotRef = { ...this.rotationRef };
    this.startPosRef = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (this.focusedElRef || !this.draggingRef || !this.startPosRef || !this.mainRef?.nativeElement.contains(event.target as Node)) return;
    event.preventDefault();
    const dxTotal = event.touches[0].clientX - this.startPosRef.x;
    const dyTotal = event.touches[0].clientY - this.startPosRef.y;
    if (!this.movedRef) {
      const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
      if (dist2 > 16) this.movedRef = true;
    }
    const nextX = clamp(
      this.startRotRef.x - dyTotal / this.dragSensitivity,
      -this.maxVerticalRotationDeg,
      this.maxVerticalRotationDeg
    );
    const nextY = wrapAngleSigned(this.startRotRef.y + dxTotal / this.dragSensitivity);
    if (this.rotationRef.x !== nextX || this.rotationRef.y !== nextY) {
      this.rotationRef = { x: nextX, y: nextY };
      this.applyTransform(nextX, nextY);
    }
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    if (!this.draggingRef) return;
    this.draggingRef = false;
    if (this.movedRef) {
      this.lastDragEndAt = performance.now();
    }
    this.movedRef = false;
  }

  onTileClick(event: Event): void {
    const el = event.currentTarget as HTMLElement;
    if (this.draggingRef) return;
    if (this.movedRef) return;
    if (performance.now() - this.lastDragEndAt < 80) return;
    if (this.openingRef) return;
    this.openItemFromElement(el);
  }

  onTilePointerUp(event: PointerEvent): void {
    if (event.pointerType !== 'touch') return;
    const el = event.currentTarget as HTMLElement;
    if (this.draggingRef) return;
    if (this.movedRef) return;
    if (performance.now() - this.lastDragEndAt < 80) return;
    if (this.openingRef) return;
    this.openItemFromElement(el);
  }

  private lockScroll(): void {
    if (this.scrollLockedRef) return;
    this.scrollLockedRef = true;
    document.body.classList.add('dg-scroll-lock');
  }

  private unlockScroll(): void {
    if (!this.scrollLockedRef) return;
    if (this.rootRef?.nativeElement?.getAttribute('data-enlarging') === 'true') return;
    this.scrollLockedRef = false;
    document.body.classList.remove('dg-scroll-lock');
  }

  private openItemFromElement(el: HTMLElement): void {
    if (this.openingRef) return;
    this.openingRef = true;
    this.openStartedAtRef = performance.now();
    this.lockScroll();
    const parent = el.parentElement;
    if (!parent) return;
    this.focusedElRef = el;
    el.setAttribute('data-focused', 'true');
    const offsetX = getDataNumber(parent, 'offsetX', 0);
    const offsetY = getDataNumber(parent, 'offsetY', 0);
    const sizeX = getDataNumber(parent, 'sizeX', 2);
    const sizeY = getDataNumber(parent, 'sizeY', 2);
    const parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, this.segments);
    const parentY = normalizeAngle(parentRot.rotateY);
    const globalY = normalizeAngle(this.rotationRef.y);
    let rotY = -(parentY + globalY) % 360;
    if (rotY < -180) rotY += 360;
    const rotX = -parentRot.rotateX - this.rotationRef.x;
    parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
    parent.style.setProperty('--rot-x-delta', `${rotX}deg`);
    const refDiv = document.createElement('div');
    refDiv.className = 'item__image item__image--reference';
    refDiv.style.opacity = '0';
    refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
    parent.appendChild(refDiv);

    void refDiv.offsetHeight;

    const tileR = refDiv.getBoundingClientRect();
    const mainR = this.mainRef?.nativeElement?.getBoundingClientRect();
    const frameR = this.frameRef?.nativeElement?.getBoundingClientRect();

    if (!mainR || !frameR || tileR.width <= 0 || tileR.height <= 0) {
      this.openingRef = false;
      this.focusedElRef = null;
      parent.removeChild(refDiv);
      this.unlockScroll();
      return;
    }

    this.originalTilePositionRef = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };
    el.style.visibility = 'hidden';
    el.style.zIndex = '0';
    const overlay = document.createElement('div');
    overlay.className = 'enlarge';
    overlay.style.position = 'absolute';
    overlay.style.left = frameR.left - mainR.left + 'px';
    overlay.style.top = frameR.top - mainR.top + 'px';
    overlay.style.width = frameR.width + 'px';
    overlay.style.height = frameR.height + 'px';
    overlay.style.opacity = '0';
    overlay.style.zIndex = '30';
    overlay.style.willChange = 'transform, opacity';
    overlay.style.transformOrigin = 'top left';
    overlay.style.transition = `transform ${this.enlargeTransitionMs}ms ease, opacity ${this.enlargeTransitionMs}ms ease`;
    const rawSrc = (parent as any).dataset?.src || el.querySelector('img')?.getAttribute('src') || '';
    const img = document.createElement('img');
    img.src = rawSrc;
    overlay.appendChild(img);
    this.viewerRef?.nativeElement?.appendChild(overlay);
    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / frameR.width;
    const sy0 = tileR.height / frameR.height;

    const validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
    const validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;

    overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

    setTimeout(() => {
      if (!overlay.parentElement) return;
      overlay.style.opacity = '1';
      overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
      this.rootRef?.nativeElement?.setAttribute('data-enlarging', 'true');
    }, 16);

    const wantsResize = this.openedImageWidth || this.openedImageHeight;
    if (wantsResize) {
      const onFirstEnd = (ev: TransitionEvent) => {
        if (ev.propertyName !== 'transform') return;
        overlay.removeEventListener('transitionend', onFirstEnd);
        const prevTransition = overlay.style.transition;
        overlay.style.transition = 'none';
        const tempWidth = this.openedImageWidth || `${frameR.width}px`;
        const tempHeight = this.openedImageHeight || `${frameR.height}px`;
        overlay.style.width = tempWidth;
        overlay.style.height = tempHeight;
        const newRect = overlay.getBoundingClientRect();
        overlay.style.width = frameR.width + 'px';
        overlay.style.height = frameR.height + 'px';
        void overlay.offsetWidth;
        overlay.style.transition = `left ${this.enlargeTransitionMs}ms ease, top ${this.enlargeTransitionMs}ms ease, width ${this.enlargeTransitionMs}ms ease, height ${this.enlargeTransitionMs}ms ease`;
        const centeredLeft = frameR.left - mainR.left + (frameR.width - newRect.width) / 2;
        const centeredTop = frameR.top - mainR.top + (frameR.height - newRect.height) / 2;
        requestAnimationFrame(() => {
          overlay.style.left = `${centeredLeft}px`;
          overlay.style.top = `${centeredTop}px`;
          overlay.style.width = tempWidth;
          overlay.style.height = tempHeight;
        });
        const cleanupSecond = () => {
          overlay.removeEventListener('transitionend', cleanupSecond);
          overlay.style.transition = prevTransition;
        };
        overlay.addEventListener('transitionend', cleanupSecond, { once: true });
      };
      overlay.addEventListener('transitionend', onFirstEnd);
    }
  }

  private closeEnlarged(): void {
    if (performance.now() - this.openStartedAtRef < 250) return;
    const el = this.focusedElRef;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const overlay = this.viewerRef?.nativeElement?.querySelector('.enlarge') as HTMLElement;
    if (!overlay) return;
    const refDiv = parent.querySelector('.item__image--reference') as HTMLElement;
    const originalPos = this.originalTilePositionRef;
    if (!originalPos) {
      overlay.remove();
      if (refDiv) refDiv.remove();
      parent.style.setProperty('--rot-y-delta', '0deg');
      parent.style.setProperty('--rot-x-delta', '0deg');
      el.style.visibility = '';
      el.style.zIndex = '0';
      this.focusedElRef = null;
      this.rootRef?.nativeElement?.removeAttribute('data-enlarging');
      this.openingRef = false;
      this.unlockScroll();
      return;
    }
    const currentRect = overlay.getBoundingClientRect();
    const rootRect = this.rootRef?.nativeElement?.getBoundingClientRect();
    if (!rootRect) return;
    const originalPosRelativeToRoot = {
      left: originalPos.left - rootRect.left,
      top: originalPos.top - rootRect.top,
      width: originalPos.width,
      height: originalPos.height
    };
    const overlayRelativeToRoot = {
      left: currentRect.left - rootRect.left,
      top: currentRect.top - rootRect.top,
      width: currentRect.width,
      height: currentRect.height
    };
    const animatingOverlay = document.createElement('div');
    animatingOverlay.className = 'enlarge-closing';
    animatingOverlay.style.cssText = `position:absolute;left:${overlayRelativeToRoot.left}px;top:${overlayRelativeToRoot.top}px;width:${overlayRelativeToRoot.width}px;height:${overlayRelativeToRoot.height}px;z-index:9999;border-radius: var(--enlarge-radius, 32px);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all ${this.enlargeTransitionMs}ms ease-out;pointer-events:none;margin:0;transform:none;`;
    const originalImg = overlay.querySelector('img');
    if (originalImg) {
      const img = originalImg.cloneNode() as HTMLImageElement;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      animatingOverlay.appendChild(img);
    }
    overlay.remove();
    this.rootRef?.nativeElement?.appendChild(animatingOverlay);
    void animatingOverlay.getBoundingClientRect();
    requestAnimationFrame(() => {
      animatingOverlay.style.left = originalPosRelativeToRoot.left + 'px';
      animatingOverlay.style.top = originalPosRelativeToRoot.top + 'px';
      animatingOverlay.style.width = originalPosRelativeToRoot.width + 'px';
      animatingOverlay.style.height = originalPosRelativeToRoot.height + 'px';
      animatingOverlay.style.opacity = '0';
    });
    const cleanup = () => {
      animatingOverlay.remove();
      this.originalTilePositionRef = null;
      if (refDiv) refDiv.remove();
      parent.style.transition = 'none';
      el.style.transition = 'none';
      parent.style.setProperty('--rot-y-delta', '0deg');
      parent.style.setProperty('--rot-x-delta', '0deg');
      requestAnimationFrame(() => {
        el.style.visibility = '';
        el.style.opacity = '0';
        el.style.zIndex = '0';
        this.focusedElRef = null;
        this.rootRef?.nativeElement?.removeAttribute('data-enlarging');
        requestAnimationFrame(() => {
          parent.style.transition = '';
          el.style.transition = 'opacity 300ms ease-out';
          requestAnimationFrame(() => {
            el.style.opacity = '1';
            setTimeout(() => {
              el.style.transition = '';
              el.style.opacity = '';
              this.openingRef = false;
              if (!this.draggingRef && this.rootRef?.nativeElement?.getAttribute('data-enlarging') !== 'true')
                document.body.classList.remove('dg-scroll-lock');
            }, 300);
          });
        });
      });
    };
    animatingOverlay.addEventListener('transitionend', cleanup, { once: true });
  }

  private setupScrimListeners(): void {
    const scrim = this.scrimRef?.nativeElement;
    if (!scrim) return;
    scrim.addEventListener('click', () => this.closeEnlarged());
    this.keydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeEnlarged();
    };
    window.addEventListener('keydown', this.keydownListener);
  }
}

