import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostListener,
  inject,
  PLATFORM_ID,
  signal,
  computed
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'ngw-animated-list',
  standalone: true,
  imports: [],
  templateUrl: './animated-list.component.html',
  styleUrl: './animated-list.component.css'
})
export class AnimatedListComponent implements AfterViewInit, OnDestroy {
  @ViewChild('listRef', { static: false }) listRef!: ElementRef<HTMLDivElement>;

  @Input() items: string[] = [
    'Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5',
    'Item 6', 'Item 7', 'Item 8', 'Item 9', 'Item 10',
    'Item 11', 'Item 12', 'Item 13', 'Item 14', 'Item 15'
  ];
  @Input() showGradients = true;
  @Input() enableArrowNavigation = true;
  @Input() className = '';
  @Input() itemClassName = '';
  @Input() displayScrollbar = true;
  @Input() initialSelectedIndex = -1;

  @Output() itemSelect = new EventEmitter<{ item: string; index: number }>();

  private readonly platformId = inject(PLATFORM_ID);
  readonly selectedIndex = signal(this.initialSelectedIndex);
  private readonly keyboardNav = signal(false);
  private readonly topGradientOpacity = signal(0);
  private readonly bottomGradientOpacity = signal(1);
  private readonly itemInView = signal<Record<number, boolean>>({});

  readonly selectedIndexValue = computed(() => this.selectedIndex());

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.setupItemObservers();
    this.updateGradients();
  }

  ngOnDestroy(): void {
    // Cleanup handled by Angular
  }

  private setupItemObservers(): void {
    if (!isPlatformBrowser(this.platformId) || !this.listRef?.nativeElement) {
      return;
    }

    const items = this.listRef.nativeElement.querySelectorAll('[data-index]');
    items.forEach((item, index) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          const inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
          this.itemInView.update(current => ({ ...current, [index]: inView }));
          
          if (inView) {
            gsap.to(item, {
              scale: 1,
              opacity: 1,
              duration: 0.2,
              delay: index * 0.1
            });
          } else {
            gsap.set(item, { scale: 0.7, opacity: 0 });
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(item);
    });
  }

  onScroll(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const target = event.target as HTMLElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    this.topGradientOpacity.set(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    this.bottomGradientOpacity.set(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  }

  private updateGradients(): void {
    if (!this.listRef?.nativeElement) {
      return;
    }

    const container = this.listRef.nativeElement;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    this.topGradientOpacity.set(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    this.bottomGradientOpacity.set(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.enableArrowNavigation || !isPlatformBrowser(this.platformId)) {
      return;
    }

    if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
      event.preventDefault();
      this.keyboardNav.set(true);
      this.selectedIndex.update(prev => Math.min(prev + 1, this.items.length - 1));
      this.scrollToSelected();
    } else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
      event.preventDefault();
      this.keyboardNav.set(true);
      this.selectedIndex.update(prev => Math.max(prev - 1, 0));
      this.scrollToSelected();
    } else if (event.key === 'Enter') {
      const index = this.selectedIndex();
      if (index >= 0 && index < this.items.length) {
        event.preventDefault();
        this.itemSelect.emit({ item: this.items[index], index });
      }
    }
  }

  private scrollToSelected(): void {
    if (!this.keyboardNav() || this.selectedIndex() < 0 || !this.listRef?.nativeElement) {
      return;
    }

    const container = this.listRef.nativeElement;
    const selectedItem = container.querySelector(`[data-index="${this.selectedIndex()}"]`) as HTMLElement;
    
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;

      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' });
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: 'smooth'
        });
      }
    }

    this.keyboardNav.set(false);
  }

  onItemMouseEnter(index: number): void {
    this.selectedIndex.set(index);
  }

  onItemClick(item: string, index: number): void {
    this.selectedIndex.set(index);
    this.itemSelect.emit({ item, index });
  }

  isSelected(index: number): boolean {
    return this.selectedIndex() === index;
  }

  getTopGradientOpacity(): string {
    return String(this.topGradientOpacity());
  }

  getBottomGradientOpacity(): string {
    return String(this.bottomGradientOpacity());
  }
}

