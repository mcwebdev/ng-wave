import {
    Component,
    Input,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    inject,
    PLATFORM_ID,
    signal,
    HostListener
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'ngw-decrypted-text',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './decrypted-text.component.html',
    styleUrl: './decrypted-text.component.css'
})
export class DecryptedTextComponent implements AfterViewInit, OnDestroy {
    @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

    @Input() text = '';
    @Input() speed = 50;
    @Input() maxIterations = 10;
    @Input() sequential = false;
    @Input() revealDirection: 'start' | 'end' | 'center' = 'start';
    @Input() useOriginalCharsOnly = false;
    @Input() characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+';
    @Input() className = '';
    @Input() parentClassName = '';
    @Input() encryptedClassName = '';
    @Input() animateOn: 'hover' | 'view' | 'both' = 'hover';

    private readonly platformId = inject(PLATFORM_ID);
    readonly displayText = signal('');
    readonly isHovering = signal(false);
    readonly isScrambling = signal(false);
    readonly revealedIndices = signal<Set<number>>(new Set());
    readonly hasAnimated = signal(false);
    private intervalId?: number;
    private observer?: IntersectionObserver;
    private currentIteration = 0;

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            this.displayText.set(this.text);
            return;
        }

        this.displayText.set(this.text);

        if (this.animateOn === 'view' || this.animateOn === 'both') {
            this.setupIntersectionObserver();
        }
    }

    private setupIntersectionObserver(): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }

        this.observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.hasAnimated()) {
                        this.isHovering.set(true);
                        this.hasAnimated.set(true);
                    }
                });
            },
            {
                root: null,
                rootMargin: '0px',
                threshold: 0.1
            }
        );

        this.observer.observe(this.containerRef.nativeElement);
    }

    @HostListener('mouseenter')
    onMouseEnter(): void {
        if (this.animateOn === 'hover' || this.animateOn === 'both') {
            this.isHovering.set(true);
        }
    }

    @HostListener('mouseleave')
    onMouseLeave(): void {
        if (this.animateOn === 'hover' || this.animateOn === 'both') {
            this.isHovering.set(false);
        }
    }

    private getNextIndex(revealedSet: Set<number>): number {
        const textLength = this.text.length;
        switch (this.revealDirection) {
            case 'start':
                return revealedSet.size;
            case 'end':
                return textLength - 1 - revealedSet.size;
            case 'center': {
                const middle = Math.floor(textLength / 2);
                const offset = Math.floor(revealedSet.size / 2);
                const nextIndex = revealedSet.size % 2 === 0 ? middle + offset : middle - offset - 1;

                if (nextIndex >= 0 && nextIndex < textLength && !revealedSet.has(nextIndex)) {
                    return nextIndex;
                }

                for (let i = 0; i < textLength; i++) {
                    if (!revealedSet.has(i)) return i;
                }
                return 0;
            }
            default:
                return revealedSet.size;
        }
    }

    private shuffleText(originalText: string, currentRevealed: Set<number>): string {
        const availableChars = this.useOriginalCharsOnly
            ? Array.from(new Set(originalText.split(''))).filter(char => char !== ' ')
            : this.characters.split('');

        if (this.useOriginalCharsOnly) {
            const positions = originalText.split('').map((char, i) => ({
                char,
                isSpace: char === ' ',
                index: i,
                isRevealed: currentRevealed.has(i)
            }));

            const nonSpaceChars = positions.filter(p => !p.isSpace && !p.isRevealed).map(p => p.char);

            for (let i = nonSpaceChars.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [nonSpaceChars[i], nonSpaceChars[j]] = [nonSpaceChars[j], nonSpaceChars[i]];
            }

            let charIndex = 0;
            return positions
                .map(p => {
                    if (p.isSpace) return ' ';
                    if (p.isRevealed) return originalText[p.index];
                    return nonSpaceChars[charIndex++];
                })
                .join('');
        } else {
            return originalText
                .split('')
                .map((char, i) => {
                    if (char === ' ') return ' ';
                    if (currentRevealed.has(i)) return originalText[i];
                    return availableChars[Math.floor(Math.random() * availableChars.length)];
                })
                .join('');
        }
    }

    private startScrambling(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.cleanup();
        this.isScrambling.set(true);
        this.currentIteration = 0;

        this.intervalId = window.setInterval(() => {
            if (this.sequential) {
                const currentRevealed = new Set(this.revealedIndices());
                if (currentRevealed.size < this.text.length) {
                    const nextIndex = this.getNextIndex(currentRevealed);
                    const newRevealed = new Set(currentRevealed);
                    newRevealed.add(nextIndex);
                    this.revealedIndices.set(newRevealed);
                    this.displayText.set(this.shuffleText(this.text, newRevealed));
                } else {
                    this.cleanup();
                    this.isScrambling.set(false);
                }
            } else {
                const currentRevealed = this.revealedIndices();
                this.displayText.set(this.shuffleText(this.text, currentRevealed));
                this.currentIteration++;
                if (this.currentIteration >= this.maxIterations) {
                    this.cleanup();
                    this.isScrambling.set(false);
                    this.displayText.set(this.text);
                }
            }
        }, this.speed);
    }

    private stopScrambling(): void {
        this.cleanup();
        this.displayText.set(this.text);
        this.revealedIndices.set(new Set());
        this.isScrambling.set(false);
    }

    private cleanup(): void {
        if (this.intervalId !== undefined) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }

    // Effect to handle hovering state changes
    ngAfterViewChecked(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (this.isHovering() && !this.isScrambling()) {
            this.startScrambling();
        } else if (!this.isHovering() && this.isScrambling()) {
            this.stopScrambling();
        }
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    isRevealedOrDone(index: number): boolean {
        return this.revealedIndices().has(index) || !this.isScrambling() || !this.isHovering();
    }

    getCharClass(index: number): string {
        return this.isRevealedOrDone(index) ? this.className : this.encryptedClassName;
    }
}

