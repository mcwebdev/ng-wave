import {
  Component,
  Input,
  AfterViewInit,
  inject,
  PLATFORM_ID,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

interface PaperOffset {
  x: number;
  y: number;
}

@Component({
  selector: 'ngw-folder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './folder.component.html',
  styleUrl: './folder.component.css'
})
export class FolderComponent implements AfterViewInit {
  @Input() color = '#5227FF';
  @Input() size = 1;
  @Input() items: unknown[] = [];
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  readonly open = signal(false);
  readonly paperOffsets = signal<PaperOffset[]>([]);

  readonly maxItems = 3;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.paperOffsets.set(Array.from({ length: this.maxItems }, () => ({ x: 0, y: 0 })));
  }

  private darkenColor(hex: string, percent: number): string {
    let color = hex.startsWith('#') ? hex.slice(1) : hex;
    if (color.length === 3) {
      color = color
        .split('')
        .map(c => c + c)
        .join('');
    }
    const num = parseInt(color, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
    g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
    b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  handleClick(): void {
    this.open.set(!this.open());
    if (!this.open()) {
      this.paperOffsets.set(Array.from({ length: this.maxItems }, () => ({ x: 0, y: 0 })));
    }
  }

  handlePaperMouseMove(event: MouseEvent, index: number): void {
    if (!this.open()) return;

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (event.clientX - centerX) * 0.15;
    const offsetY = (event.clientY - centerY) * 0.15;

    const newOffsets = [...this.paperOffsets()];
    newOffsets[index] = { x: offsetX, y: offsetY };
    this.paperOffsets.set(newOffsets);
  }

  handlePaperMouseLeave(index: number): void {
    const newOffsets = [...this.paperOffsets()];
    newOffsets[index] = { x: 0, y: 0 };
    this.paperOffsets.set(newOffsets);
  }

  getPapers(): (unknown | null)[] {
    const papers = this.items.slice(0, this.maxItems);
    while (papers.length < this.maxItems) {
      papers.push(null);
    }
    return papers;
  }

  getFolderStyle(): Record<string, string> {
    const folderBackColor = this.darkenColor(this.color, 0.08);
    const paper1 = this.darkenColor('#ffffff', 0.1);
    const paper2 = this.darkenColor('#ffffff', 0.05);
    const paper3 = '#ffffff';

    return {
      '--folder-color': this.color,
      '--folder-back-color': folderBackColor,
      '--paper-1': paper1,
      '--paper-2': paper2,
      '--paper-3': paper3
    };
  }
}

