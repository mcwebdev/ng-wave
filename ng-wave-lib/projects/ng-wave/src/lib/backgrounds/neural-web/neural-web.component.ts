import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Input,
  inject,
  PLATFORM_ID,
  effect,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseVx: number;
  baseVy: number;
  baseVz: number;
  radius: number;
  color: string;
}

interface Connection {
  from: number;
  to: number;
  strength: number;
  pulse: number;
}

@Component({
  selector: 'ngw-neural-web',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './neural-web.component.html',
  styleUrl: './neural-web.component.css'
})
export class NeuralWebComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() set particleCount(value: number) {
    console.log('[Neural Web] Setting particleCount to:', value);
    this.particleCountSignal.set(value);
  }
  @Input() set connectionDistance(value: number) {
    console.log('[Neural Web] Setting connectionDistance to:', value);
    this.connectionDistanceSignal.set(value);
  }
  @Input() set particleSpeed(value: number) {
    console.log('[Neural Web] Setting particleSpeed to:', value);
    this.particleSpeedSignal.set(value);
  }
  @Input() set mouseRadius(value: number) {
    console.log('[Neural Web] Setting mouseRadius to:', value);
    this.mouseRadiusSignal.set(value);
  }
  @Input() set mouseForce(value: number) {
    console.log('[Neural Web] Setting mouseForce to:', value);
    this.mouseForceSignal.set(value);
  }
  @Input() set pulseSpeed(value: number) { this.pulseSpeedSignal.set(value); }
  @Input() set colors(value: string[]) { this.colorsSignal.set(value); }
  @Input() set backgroundColor(value: string) { this.backgroundColorSignal.set(value); }
  @Input() set lineOpacity(value: number) { this.lineOpacitySignal.set(value); }
  @Input() set particleSize(value: number) { this.particleSizeSignal.set(value); }
  @Input() set enableMouse(value: boolean) { this.enableMouseSignal.set(value); }
  @Input() set enablePulse(value: boolean) { this.enablePulseSignal.set(value); }
  @Input() set depthEffect(value: boolean) { this.depthEffectSignal.set(value); }

  readonly particleCountSignal = signal(250);
  readonly connectionDistanceSignal = signal(250);
  readonly particleSpeedSignal = signal(4);
  readonly mouseRadiusSignal = signal(200);
  readonly mouseForceSignal = signal(0.5);
  readonly pulseSpeedSignal = signal(2);
  readonly colorsSignal = signal(['#00f5ff', '#ff00ff', '#00ff88', '#ffaa00']);
  readonly backgroundColorSignal = signal('#000000');
  readonly lineOpacitySignal = signal(0.8);
  readonly particleSizeSignal = signal(2);
  readonly enableMouseSignal = signal(true);
  readonly enablePulseSignal = signal(true);
  readonly depthEffectSignal = signal(true);

  private readonly platformId = inject(PLATFORM_ID);
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private connections: Connection[] = [];
  private animationId: number | null = null;
  private mouseX = 0;
  private mouseY = 0;
  private width = 0;
  private height = 0;
  private time = 0;
  private initialized = false;

  constructor() {
    // Watch for particle count changes
    effect(() => {
      const count = this.particleCountSignal();
      if (this.initialized) {
        this.initParticles();
      }
    });

    // Watch for particle speed changes
    effect(() => {
      const speed = this.particleSpeedSignal();
      if (this.initialized && this.particles.length > 0) {
        this.updateParticleSpeeds();
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    setTimeout(() => {
      this.initCanvas();
    }, 0);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.canvas) {
      window.removeEventListener('resize', this.resize);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
      this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    }
  }

  private initCanvas(): void {
    this.canvas = this.canvasRef?.nativeElement;
    if (!this.canvas) {
      setTimeout(() => this.initCanvas(), 100);
      return;
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    this.resize();

    // Check if canvas has dimensions
    if (this.width === 0 || this.height === 0) {
      setTimeout(() => this.initCanvas(), 100);
      return;
    }

    this.initParticles();
    this.setupEventListeners();
    this.initialized = true;
    this.animate();
  }

  private resize = (): void => {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    this.width = parent.offsetWidth || window.innerWidth;
    this.height = parent.offsetHeight || window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Reinitialize particles with new dimensions
    if (this.initialized && this.particles.length > 0) {
      this.initParticles();
    }
  };

  private setupEventListeners(): void {
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: true });
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  };

  private handleMouseLeave = (): void => {
    this.mouseX = -1;
    this.mouseY = -1;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.touches[0].clientX - rect.left;
      this.mouseY = e.touches[0].clientY - rect.top;
    }
  };

  private initParticles(): void {
    this.particles = [];
    const speed = this.particleSpeedSignal();
    const size = this.particleSizeSignal();
    const colors = this.colorsSignal();

    for (let i = 0; i < this.particleCountSignal(); i++) {
      const vx = (Math.random() - 0.5) * speed;
      const vy = (Math.random() - 0.5) * speed;
      const vz = (Math.random() - 0.5) * speed * 0.5;

      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        z: Math.random() * 200 - 100,
        vx,
        vy,
        vz,
        baseVx: vx,
        baseVy: vy,
        baseVz: vz,
        radius: size + Math.random() * size,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  private updateParticleSpeeds(): void {
    const newSpeed = this.particleSpeedSignal();
    for (const particle of this.particles) {
      const currentSpeed = Math.sqrt(
        particle.baseVx * particle.baseVx +
        particle.baseVy * particle.baseVy
      );

      if (currentSpeed > 0) {
        const speedRatio = newSpeed / currentSpeed;
        particle.baseVx *= speedRatio;
        particle.baseVy *= speedRatio;
        particle.baseVz *= speedRatio;
        particle.vx = particle.baseVx;
        particle.vy = particle.baseVy;
        particle.vz = particle.baseVz;
      }
    }
  }

  private updateParticles(): void {
    const mouseRadius = this.mouseRadiusSignal();
    const mouseForce = this.mouseForceSignal();
    const enableMouse = this.enableMouseSignal();

    for (const particle of this.particles) {
      // Apply mouse interaction (repulsion force)
      if (enableMouse && this.mouseX > 0 && this.mouseY > 0) {
        const dx = particle.x - this.mouseX;
        const dy = particle.y - this.mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouseRadius && distance > 1) {
          const force = (1 - distance / mouseRadius) * mouseForce * 5;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }
      }

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.z += particle.vz;

      // Bounce off edges
      if (particle.x < 0 || particle.x > this.width) {
        particle.vx *= -1;
        particle.x = Math.max(0, Math.min(this.width, particle.x));
      }
      if (particle.y < 0 || particle.y > this.height) {
        particle.vy *= -1;
        particle.y = Math.max(0, Math.min(this.height, particle.y));
      }
      if (particle.z < -100 || particle.z > 100) {
        particle.vz *= -1;
        particle.z = Math.max(-100, Math.min(100, particle.z));
      }

      // Add dampening to return to base velocity
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      particle.vz *= 0.98;
    }
  }

  private updateConnections(): void {
    this.connections = [];
    const connDist = this.connectionDistanceSignal();
    const pulseSpeed = this.pulseSpeedSignal();
    const enablePulse = this.enablePulseSignal();

    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dz = this.particles[i].z - this.particles[j].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < connDist) {
          const strength = 1 - distance / connDist;
          this.connections.push({
            from: i,
            to: j,
            strength,
            pulse: enablePulse
              ? Math.sin(this.time * pulseSpeed + i * 0.1) * 0.5 + 0.5
              : 1
          });
        }
      }
    }
  }

  private draw(): void {
    const bgColor = this.backgroundColorSignal();
    const lineOpacity = this.lineOpacitySignal();
    const particleSize = this.particleSizeSignal();
    const depthEffect = this.depthEffectSignal();

    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw connections
    for (const conn of this.connections) {
      const from = this.particles[conn.from];
      const to = this.particles[conn.to];

      const baseOpacity = conn.strength * lineOpacity;
      const pulseOpacity = baseOpacity * conn.pulse;

      // Create gradient for the connection
      const gradient = this.ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, this.hexToRgba(from.color, pulseOpacity));
      gradient.addColorStop(1, this.hexToRgba(to.color, pulseOpacity));

      // Line width based on depth
      const avgZ = (from.z + to.z) / 2;
      const scale = depthEffect ? 1 + avgZ / 200 : 1;
      this.ctx.lineWidth = Math.max(0.5, scale * conn.strength * 2);

      this.ctx.strokeStyle = gradient;
      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.stroke();
    }

    // Draw particles
    for (const particle of this.particles) {
      const scale = depthEffect ? 1 + particle.z / 200 : 1;
      const radius = particleSize * scale;

      // Glow effect
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, radius * 3
      );
      gradient.addColorStop(0, this.hexToRgba(particle.color, 0.8));
      gradient.addColorStop(0.4, this.hexToRgba(particle.color, 0.4));
      gradient.addColorStop(1, this.hexToRgba(particle.color, 0));

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, radius * 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Core particle
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private animate = (): void => {
    if (!this.initialized) return;

    this.time += 0.016;
    this.updateParticles();
    this.updateConnections();
    this.draw();
    this.animationId = requestAnimationFrame(this.animate);
  };
}
