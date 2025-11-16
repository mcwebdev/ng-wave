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
  AfterContentInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  signal,
  computed,
  ChangeDetectorRef
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import gsap from 'gsap';

@Component({
  selector: 'ngw-step',
  standalone: true,
  imports: [CommonModule],
  template: '<div class="step-default"><ng-content></ng-content></div>'
})
export class StepComponent { }

@Component({
  selector: 'ngw-stepper',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.css'
})
export class StepperComponent implements AfterViewInit, AfterContentInit, OnDestroy {
  @ContentChildren(StepComponent) stepComponents!: QueryList<StepComponent>;
  @ViewChild('contentWrapper', { static: false }) contentWrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('contentContainer', { static: false }) contentContainerRef!: ElementRef<HTMLDivElement>;

  @Input() initialStep = 1;
  @Input() stepCircleContainerClassName = '';
  @Input() stepContainerClassName = '';
  @Input() contentClassName = '';
  @Input() footerClassName = '';
  @Input() backButtonText = 'Back';
  @Input() nextButtonText = 'Continue';
  @Input() disableStepIndicators = false;

  @Output() stepChange = new EventEmitter<number>();
  @Output() finalStepCompleted = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly currentStep = signal(1);
  private direction = signal(0);
  private parentHeight = signal(0);
  private contentTween: gsap.core.Tween | null = null;
  private heightTween: gsap.core.Tween | null = null;
  private indicatorTweens: Map<number, gsap.core.Tween> = new Map();
  private connectorTweens: Map<number, gsap.core.Tween> = new Map();

  totalSteps = computed(() => this.stepComponents?.length || 0);
  isCompleted = computed(() => this.currentStep() > this.totalSteps());
  isLastStep = computed(() => this.currentStep() === this.totalSteps());

  ngAfterContentInit(): void {
    this.currentStep.set(this.initialStep);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    setTimeout(() => {
      this.updateContentHeight();
      this.animateIndicators();
    }, 0);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.contentTween?.kill();
    this.heightTween?.kill();
    this.indicatorTweens.forEach(tween => tween.kill());
    this.connectorTweens.forEach(tween => tween.kill());
    this.indicatorTweens.clear();
    this.connectorTweens.clear();
  }

  private updateContentHeight(): void {
    if (!isPlatformBrowser(this.platformId) || !this.contentContainerRef?.nativeElement) {
      return;
    }

    const height = this.contentContainerRef.nativeElement.offsetHeight;
    this.parentHeight.set(height);

    if (this.contentWrapperRef?.nativeElement) {
      this.heightTween?.kill();
      this.heightTween = gsap.to(this.contentWrapperRef.nativeElement, {
        height: this.isCompleted() ? 0 : height,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }

  private animateContent(direction: number): void {
    if (!isPlatformBrowser(this.platformId) || !this.contentContainerRef?.nativeElement) {
      return;
    }

    const enterX = direction >= 0 ? '-100%' : '100%';
    const exitX = direction >= 0 ? '50%' : '-50%';

    // Exit animation
    this.contentTween?.kill();
    this.contentTween = gsap.fromTo(
      this.contentContainerRef.nativeElement,
      {
        x: '0%',
        opacity: 1
      },
      {
        x: exitX,
        opacity: 0,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: () => {
          // Enter animation
          gsap.set(this.contentContainerRef.nativeElement, {
            x: enterX,
            opacity: 0
          });
          gsap.to(this.contentContainerRef.nativeElement, {
            x: '0%',
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
            onComplete: () => {
              this.updateContentHeight();
            }
          });
        }
      }
    );
  }

  private animateIndicators(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.stepComponents.forEach((_, index) => {
      const stepNumber = index + 1;
      const status = this.getStepStatus(stepNumber);
      this.animateIndicator(stepNumber, status);
      this.animateConnector(stepNumber);
    });
  }

  private animateIndicator(stepNumber: number, status: 'active' | 'inactive' | 'complete'): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const indicator = document.querySelector(`[data-step-indicator="${stepNumber}"]`) as HTMLElement;
    if (!indicator) return;

    const inner = indicator.querySelector('.stepper-indicator-inner') as HTMLElement;
    if (!inner) return;

    this.indicatorTweens.get(stepNumber)?.kill();

    const configs = {
      inactive: { scale: 1, backgroundColor: '#222', color: '#a3a3a3' },
      active: { scale: 1, backgroundColor: '#5227FF', color: '#5227FF' },
      complete: { scale: 1, backgroundColor: '#5227FF', color: '#3b82f6' }
    };

    const config = configs[status];
    const tween = gsap.to(inner, {
      ...config,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    this.indicatorTweens.set(stepNumber, tween);
  }

  private animateConnector(stepNumber: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const connector = document.querySelector(`[data-step-connector="${stepNumber}"]`) as HTMLElement;
    if (!connector) return;

    const inner = connector.querySelector('.stepper-connector-inner') as HTMLElement;
    if (!inner) return;

    this.connectorTweens.get(stepNumber)?.kill();

    const isComplete = this.currentStep() > stepNumber;
    const tween = gsap.to(inner, {
      width: isComplete ? '100%' : '0%',
      backgroundColor: isComplete ? '#5227FF' : 'transparent',
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    this.connectorTweens.set(stepNumber, tween);
  }

  updateStep(newStep: number): void {
    this.currentStep.set(newStep);
    if (newStep > this.totalSteps()) {
      this.finalStepCompleted.emit();
    } else {
      this.stepChange.emit(newStep);
    }
    this.animateIndicators();
  }

  handleBack(): void {
    if (this.currentStep() > 1) {
      this.direction.set(-1);
      this.updateStep(this.currentStep() - 1);
      this.animateContent(-1);
    }
  }

  handleNext(): void {
    if (!this.isLastStep()) {
      this.direction.set(1);
      this.updateStep(this.currentStep() + 1);
      this.animateContent(1);
    }
  }

  handleComplete(): void {
    this.direction.set(1);
    this.updateStep(this.totalSteps() + 1);
    this.animateContent(1);
  }

  handleStepClick(clickedStep: number): void {
    if (clickedStep !== this.currentStep() && !this.disableStepIndicators) {
      const direction = clickedStep > this.currentStep() ? 1 : -1;
      this.direction.set(direction);
      this.updateStep(clickedStep);
      this.animateContent(direction);
    }
  }

  getStepStatus(step: number): 'active' | 'inactive' | 'complete' {
    const current = this.currentStep();
    if (current === step) return 'active';
    if (current < step) return 'inactive';
    return 'complete';
  }

  getCurrentStepIndex(): number {
    return this.currentStep() - 1;
  }

  getStepComponentClass(step: StepComponent): typeof StepComponent {
    return StepComponent;
  }
}

