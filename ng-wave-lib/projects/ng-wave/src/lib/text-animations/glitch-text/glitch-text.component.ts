import { Component, Input, computed, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ngw-glitch-text',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './glitch-text.component.html',
  styleUrl: './glitch-text.component.css'
})
export class GlitchTextComponent implements AfterViewInit {
  @ViewChild('content', { static: false }) contentRef!: ElementRef<HTMLElement>;
  
  @Input() speed = 1;
  @Input() enableShadows = true;
  @Input() enableOnHover = true;
  @Input() className = '';

  readonly inlineStyles = computed(() => ({
    '--after-duration': `${this.speed * 3}s`,
    '--before-duration': `${this.speed * 2}s`,
    '--after-shadow': this.enableShadows ? '-5px 0 red' : 'none',
    '--before-shadow': this.enableShadows ? '5px 0 cyan' : 'none'
  }));

  dataText = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    if (this.contentRef?.nativeElement) {
      setTimeout(() => {
        this.dataText = this.contentRef.nativeElement.textContent || '';
        this.cdr.detectChanges();
      }, 0);
    }
  }
}

