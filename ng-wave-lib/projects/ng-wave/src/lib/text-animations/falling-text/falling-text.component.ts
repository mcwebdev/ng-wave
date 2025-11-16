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
  HostListener,
  effect,
  Injector
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import * as Matter from 'matter-js';

@Component({
  selector: 'ngw-falling-text',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './falling-text.component.html',
  styleUrl: './falling-text.component.css'
})
export class FallingTextComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('textElement', { static: false }) textElementRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasContainer', { static: false }) canvasContainerRef!: ElementRef<HTMLDivElement>;

  @Input() className = '';
  @Input() text = '';
  @Input() highlightWords: string[] = [];
  @Input() highlightClass = 'highlighted';
  @Input() trigger: 'auto' | 'scroll' | 'click' | 'hover' = 'auto';
  @Input() backgroundColor = 'transparent';
  @Input() wireframes = false;
  @Input() gravity = 1;
  @Input() mouseConstraintStiffness = 0.2;
  @Input() fontSize = '1rem';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  readonly effectStarted = signal(false);
  private engine?: Matter.Engine;
  private render?: Matter.Render;
  private runner?: Matter.Runner;
  private wordBodies: Array<{ elem: HTMLElement; body: Matter.Body }> = [];
  private updateLoopId?: number;
  private observer?: IntersectionObserver;
  private effectStartedOnce = false;

  constructor() {
    // Watch for effectStarted signal changes
    effect(() => {
      if (this.effectStarted() && !this.effectStartedOnce && isPlatformBrowser(this.platformId)) {
        this.effectStartedOnce = true;
        setTimeout(() => this.startEffect(), 0);
      }
    }, { injector: this.injector });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.setupText();
    this.setupTrigger();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  private setupText(): void {
    if (!this.textElementRef?.nativeElement) {
      return;
    }

    const words = this.text.split(' ');
    const newHTML = words
      .map(word => {
        const isHighlighted = this.highlightWords.some(hw => word.startsWith(hw));
        return `<span class="word ${isHighlighted ? this.highlightClass : ''}">${word}</span>`;
      })
      .join(' ');
    this.textElementRef.nativeElement.innerHTML = newHTML;
  }

  private setupTrigger(): void {
    if (this.trigger === 'auto') {
      this.effectStarted.set(true);
      return;
    }

    if (this.trigger === 'scroll' && this.containerRef?.nativeElement) {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.effectStarted.set(true);
            this.observer?.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      this.observer.observe(this.containerRef.nativeElement);
    }
  }

  @HostListener('click')
  onClick(): void {
    if (this.trigger === 'click' && !this.effectStarted()) {
      this.effectStarted.set(true);
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (this.trigger === 'hover' && !this.effectStarted()) {
      this.effectStarted.set(true);
    }
  }

  private startEffect(): void {
    if (!this.containerRef?.nativeElement || !this.textElementRef?.nativeElement || !this.canvasContainerRef?.nativeElement) {
      return;
    }

    const { Engine, Render, World, Bodies, Runner, Mouse, MouseConstraint } = Matter;
    const RenderModule = Render;
    const RunnerModule = Runner;

    const containerRect = this.containerRef.nativeElement.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    if (width <= 0 || height <= 0) {
      return;
    }

    this.engine = Engine.create();
    this.engine.world.gravity.y = this.gravity;

    this.render = Render.create({
      element: this.canvasContainerRef.nativeElement,
      engine: this.engine,
      options: {
        width,
        height,
        background: this.backgroundColor,
        wireframes: this.wireframes
      }
    });

    const boundaryOptions = {
      isStatic: true,
      render: { fillStyle: 'transparent' }
    };
    const floor = Bodies.rectangle(width / 2, height + 25, width, 50, boundaryOptions);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height, boundaryOptions);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, boundaryOptions);
    const ceiling = Bodies.rectangle(width / 2, -25, width, 50, boundaryOptions);

    const wordSpans = this.textElementRef.nativeElement.querySelectorAll('.word');
    this.wordBodies = Array.from(wordSpans).map(elem => {
      const rect = elem.getBoundingClientRect();

      const x = rect.left - containerRect.left + rect.width / 2;
      const y = rect.top - containerRect.top + rect.height / 2;

      const body = Bodies.rectangle(x, y, rect.width, rect.height, {
        render: { fillStyle: 'transparent' },
        restitution: 0.8,
        frictionAir: 0.01,
        friction: 0.2
      });

      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 5,
        y: 0
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
      return { elem: elem as HTMLElement, body };
    });

    this.wordBodies.forEach(({ elem, body }) => {
      elem.style.position = 'absolute';
      elem.style.left = `${body.position.x - body.bounds.max.x + body.bounds.min.x / 2}px`;
      elem.style.top = `${body.position.y - body.bounds.max.y + body.bounds.min.y / 2}px`;
      elem.style.transform = 'none';
    });

    const mouse = Mouse.create(this.containerRef.nativeElement);
    const mouseConstraint = MouseConstraint.create(this.engine, {
      mouse,
      constraint: {
        stiffness: this.mouseConstraintStiffness,
        render: { visible: false }
      }
    });
    if (this.render) {
      (this.render as any).mouse = mouse;
    }

    World.add(this.engine.world, [floor, leftWall, rightWall, ceiling, mouseConstraint, ...this.wordBodies.map(wb => wb.body)]);

    this.runner = RunnerModule.create();
    RunnerModule.run(this.runner, this.engine);
    RenderModule.run(this.render);

    const updateLoop = () => {
      this.wordBodies.forEach(({ body, elem }) => {
        const { x, y } = body.position;
        elem.style.left = `${x}px`;
        elem.style.top = `${y}px`;
        elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
      });
      Matter.Engine.update(this.engine!);
      this.updateLoopId = requestAnimationFrame(updateLoop);
    };
    updateLoop();
  }

  private cleanup(): void {
    if (this.updateLoopId !== undefined) {
      cancelAnimationFrame(this.updateLoopId);
    }

    if (this.observer) {
      this.observer.disconnect();
    }

    if (this.render) {
      Matter.Render.stop(this.render);
      if (this.render.canvas && this.canvasContainerRef?.nativeElement) {
        this.canvasContainerRef.nativeElement.removeChild(this.render.canvas);
      }
    }

    if (this.runner) {
      Matter.Runner.stop(this.runner);
    }

    if (this.engine) {
      Matter.World.clear(this.engine.world, false);
      Matter.Engine.clear(this.engine);
    }
  }
}

