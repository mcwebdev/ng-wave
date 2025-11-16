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

@Component({
  selector: 'ngw-fade-content',
  standalone: true,
  imports: [],
  templateUrl: './fade-content.component.html',
  styleUrl: './fade-content.component.css'
})
export class FadeContentComponent implements AfterViewInit, OnDestroy {
  @ViewChild('content', { static: false }) contentRef!: ElementRef<HTMLDivElement>;

  @Input() blur = false;
  @Input() duration = 1000;
  @Input() easing = 'ease-out';
  @Input() delay = 0;
  @Input() threshold = 0.1;
  @Input() initialOpacity = 0;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly inView = signal(false);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.inView.set(true);
      return;
    }

    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private setupIntersectionObserver(): void {
    if (!this.contentRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.observer?.unobserve(this.contentRef.nativeElement);
          setTimeout(() => {
            this.inView.set(true);
          }, this.delay);
        }
      },
      { threshold: this.threshold }
    );

    this.observer.observe(this.contentRef.nativeElement);
  }

  getStyle(): Record<string, string> {
    const inViewValue = this.inView();
    return {
      opacity: String(inViewValue ? 1 : this.initialOpacity),
      transition: `opacity ${this.duration}ms ${this.easing}, filter ${this.duration}ms ${this.easing}`,
      filter: this.blur ? (inViewValue ? 'blur(0px)' : 'blur(10px)') : 'none'
    };
  }
}

