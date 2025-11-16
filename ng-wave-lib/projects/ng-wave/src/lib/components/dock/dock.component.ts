import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  ContentChildren,
  QueryList,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  signal,
  computed
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface DockItem {
  icon: string;
  label: string;
  onClick?: () => void;
  className?: string;
}

@Component({
  selector: 'ngw-dock-item',
  standalone: true,
  imports: [CommonModule],
  template: '<ng-content></ng-content>'
})
export class DockItemComponent {
  @Input() onClick?: () => void;
  @Input() className = '';
}

@Component({
  selector: 'ngw-dock-icon',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="dock-icon"><ng-content></ng-content></div>'
})
export class DockIconComponent {}

@Component({
  selector: 'ngw-dock-label',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="dock-label"><ng-content></ng-content></div>'
})
export class DockLabelComponent {}

@Component({
  selector: 'ngw-dock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dock.component.html',
  styleUrl: './dock.component.css'
})
export class DockComponent implements AfterViewInit, OnDestroy {
  @ContentChildren(DockItemComponent) dockItems!: QueryList<DockItemComponent>;
  @ViewChild('outer', { static: false }) outerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('panel', { static: false }) panelRef!: ElementRef<HTMLDivElement>;

  @Input() items: DockItem[] = [];
  @Input() className = '';
  @Input() spring = { mass: 0.1, stiffness: 150, damping: 12 };
  @Input() magnification = 70;
  @Input() distance = 200;
  @Input() panelHeight = 68;
  @Input() dockHeight = 256;
  @Input() baseItemSize = 50;

  private readonly platformId = inject(PLATFORM_ID);
  private mouseX = signal(Infinity);
  private isHovered = signal(false);
  private itemRefs: Map<number, ElementRef<HTMLDivElement>> = new Map();
  private itemTweens: Map<number, gsap.core.Tween> = new Map();
  private heightTween: gsap.core.Tween | null = null;
  private labelTweens: Map<number, gsap.core.Tween> = new Map();

  maxHeight = computed(() => Math.max(this.dockHeight, this.magnification + this.magnification / 2 + 4));


  ngOnDestroy(): void {
    this.cleanup();
  }

  private initialize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.updateHeight();
  }

  private updateHeight(): void {
    if (!isPlatformBrowser(this.platformId) || !this.outerRef?.nativeElement) {
      return;
    }

    const targetHeight = this.isHovered() ? this.maxHeight() : this.panelHeight;
    this.heightTween?.kill();
    this.heightTween = gsap.to(this.outerRef.nativeElement, {
      height: targetHeight,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  }

  handleMouseMove(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isHovered.set(true);
    this.mouseX.set(event.pageX);
    this.updateHeight();
    setTimeout(() => {
      this.updateItemSizes();
    }, 0);
  }

  handleMouseLeave(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.isHovered.set(false);
    this.mouseX.set(Infinity);
    this.updateHeight();
    this.updateItemSizes();
  }

  private updateItemSizes(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.items.forEach((item, index) => {
      const itemRef = this.itemRefs.get(index);
      if (!itemRef?.nativeElement) return;

      const rect = itemRef.nativeElement.getBoundingClientRect();
      const itemCenterX = rect.x + this.baseItemSize / 2;
      const distance = Math.abs(this.mouseX() - itemCenterX);
      const clampedDistance = Math.min(distance, this.distance);

      let targetSize = this.baseItemSize;
      if (this.isHovered() && this.mouseX() !== Infinity) {
        const ratio = 1 - clampedDistance / this.distance;
        targetSize = this.baseItemSize + (this.magnification - this.baseItemSize) * ratio;
      }

      this.itemTweens.get(index)?.kill();
      const tween = gsap.to(itemRef.nativeElement, {
        width: targetSize,
        height: targetSize,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
      this.itemTweens.set(index, tween);

      const label = itemRef.nativeElement.querySelector('.dock-label') as HTMLElement;
      if (label) {
        const shouldShow = this.isHovered() && clampedDistance < this.distance / 2;
        this.labelTweens.get(index)?.kill();
        const labelTween = gsap.to(label, {
          opacity: shouldShow ? 1 : 0,
          y: shouldShow ? -10 : 0,
          duration: 0.2,
          ease: 'power2.out',
          overwrite: 'auto'
        });
        this.labelTweens.set(index, labelTween);
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      this.initialize();
      this.collectItemRefs();
    }, 0);
  }

  private collectItemRefs(): void {
    if (!isPlatformBrowser(this.platformId) || !this.panelRef?.nativeElement) {
      return;
    }

    const items = this.panelRef.nativeElement.querySelectorAll('.dock-item');
    items.forEach((item, index) => {
      this.itemRefs.set(index, new ElementRef(item as HTMLDivElement));
    });
  }

  handleItemClick(item: DockItem, index: number): void {
    if (item.onClick) {
      item.onClick();
    }
  }

  private cleanup(): void {
    this.heightTween?.kill();
    this.itemTweens.forEach(tween => tween.kill());
    this.labelTweens.forEach(tween => tween.kill());
    this.itemTweens.clear();
    this.labelTweens.clear();
  }
}

