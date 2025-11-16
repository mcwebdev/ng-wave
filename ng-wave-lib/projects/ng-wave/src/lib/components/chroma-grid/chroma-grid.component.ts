import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import gsap from 'gsap';

interface ChromaGridItem {
  image: string;
  title: string;
  subtitle?: string;
  handle?: string;
  location?: string;
  borderColor?: string;
  gradient?: string;
  url?: string;
}

@Component({
  selector: 'ngw-chroma-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chroma-grid.component.html',
  styleUrl: './chroma-grid.component.css'
})
export class ChromaGridComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: false }) rootRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fade', { static: false }) fadeRef!: ElementRef<HTMLDivElement>;

  @Input() items: ChromaGridItem[] = [];
  @Input() className = '';
  @Input() radius = 300;
  @Input() columns = 3;
  @Input() rows = 2;
  @Input() damping = 0.45;
  @Input() fadeOut = 0.6;
  @Input() ease = 'power3.out';

  private readonly platformId = inject(PLATFORM_ID);
  private setX: ((value: number) => void) | null = null;
  private setY: ((value: number) => void) | null = null;
  private pos = { x: 0, y: 0 };

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    setTimeout(() => {
      this.initialize();
    }, 0);
  }

  ngOnDestroy(): void {
    // Cleanup handled by GSAP
  }

  private initialize(): void {
    if (!isPlatformBrowser(this.platformId) || !this.rootRef?.nativeElement) {
      return;
    }

    const el = this.rootRef.nativeElement;
    this.setX = gsap.quickSetter(el, '--x', 'px') as (value: number) => void;
    this.setY = gsap.quickSetter(el, '--y', 'px') as (value: number) => void;
    const { width, height } = el.getBoundingClientRect();
    this.pos = { x: width / 2, y: height / 2 };
    if (this.setX) this.setX(this.pos.x);
    if (this.setY) this.setY(this.pos.y);
  }

  private moveTo(x: number, y: number): void {
    if (!isPlatformBrowser(this.platformId) || !this.setX || !this.setY) {
      return;
    }

    gsap.to(this.pos, {
      x,
      y,
      duration: this.damping,
      ease: this.ease,
      onUpdate: () => {
        this.setX?.(this.pos.x);
        this.setY?.(this.pos.y);
      },
      overwrite: true
    });
  }

  handleMove(event: PointerEvent): void {
    if (!isPlatformBrowser(this.platformId) || !this.rootRef?.nativeElement || !this.fadeRef?.nativeElement) {
      return;
    }

    const r = this.rootRef.nativeElement.getBoundingClientRect();
    this.moveTo(event.clientX - r.left, event.clientY - r.top);
    gsap.to(this.fadeRef.nativeElement, { opacity: 0, duration: 0.25, overwrite: true });
  }

  handleLeave(): void {
    if (!isPlatformBrowser(this.platformId) || !this.fadeRef?.nativeElement) {
      return;
    }

    gsap.to(this.fadeRef.nativeElement, {
      opacity: 1,
      duration: this.fadeOut,
      overwrite: true
    });
  }

  handleCardClick(url?: string): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  handleCardMove(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  }

  getDisplayItems(): ChromaGridItem[] {
    if (this.items && this.items.length > 0) {
      return this.items;
    }

    return [
      {
        image: 'https://i.pravatar.cc/300?img=8',
        title: 'Alex Rivera',
        subtitle: 'Full Stack Developer',
        handle: '@alexrivera',
        borderColor: '#4F46E5',
        gradient: 'linear-gradient(145deg, #4F46E5, #000)',
        url: 'https://github.com/'
      },
      {
        image: 'https://i.pravatar.cc/300?img=11',
        title: 'Jordan Chen',
        subtitle: 'DevOps Engineer',
        handle: '@jordanchen',
        borderColor: '#10B981',
        gradient: 'linear-gradient(210deg, #10B981, #000)',
        url: 'https://linkedin.com/in/'
      },
      {
        image: 'https://i.pravatar.cc/300?img=3',
        title: 'Morgan Blake',
        subtitle: 'UI/UX Designer',
        handle: '@morganblake',
        borderColor: '#F59E0B',
        gradient: 'linear-gradient(165deg, #F59E0B, #000)',
        url: 'https://dribbble.com/'
      },
      {
        image: 'https://i.pravatar.cc/300?img=16',
        title: 'Casey Park',
        subtitle: 'Data Scientist',
        handle: '@caseypark',
        borderColor: '#EF4444',
        gradient: 'linear-gradient(195deg, #EF4444, #000)',
        url: 'https://kaggle.com/'
      },
      {
        image: 'https://i.pravatar.cc/300?img=25',
        title: 'Sam Kim',
        subtitle: 'Mobile Developer',
        handle: '@thesamkim',
        borderColor: '#8B5CF6',
        gradient: 'linear-gradient(225deg, #8B5CF6, #000)',
        url: 'https://github.com/'
      },
      {
        image: 'https://i.pravatar.cc/300?img=60',
        title: 'Tyler Rodriguez',
        subtitle: 'Cloud Architect',
        handle: '@tylerrod',
        borderColor: '#06B6D4',
        gradient: 'linear-gradient(135deg, #06B6D4, #000)',
        url: 'https://aws.amazon.com/'
      }
    ];
  }
}

