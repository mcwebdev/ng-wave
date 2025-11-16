import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  HostListener,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
uniform float uAmplitude;
uniform float uSpeed;

varying vec2 vUv;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

  uv += (uMouse - vec2(0.5)) * uAmplitude;

  float d = -uTime * 0.5 * uSpeed;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5 * uSpeed;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}
`;

@Component({
  selector: 'ngw-iridescence',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './iridescence.component.html',
  styleUrl: './iridescence.component.css'
})
export class IridescenceComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() color: [number, number, number] = [1, 1, 1];
  @Input() speed = 1.0;
  @Input() amplitude = 0.1;
  @Input() mouseReact = true;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private geometry: Triangle | null = null;
  private animateId: number | null = null;
  private mousePos = { x: 0.5, y: 0.5 };
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private initialized = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initIridescence();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.initialized || !this.program) {
      return;
    }

    if (changes['color']) {
      this.program.uniforms['uColor'].value = new Color(...this.color);
    }
    if (changes['speed']) {
      this.program.uniforms['uSpeed'].value = this.speed;
    }
    if (changes['amplitude']) {
      this.program.uniforms['uAmplitude'].value = this.amplitude;
    }
  }

  private initIridescence(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const renderer = new Renderer();
    this.renderer = renderer;
    const gl = renderer.gl;
    gl.clearColor(1, 1, 1, 1);

    const resize = () => {
      const scale = 1;
      renderer.setSize(container.offsetWidth * scale, container.offsetHeight * scale);
      if (this.program) {
        this.program.uniforms['uResolution'].value = new Color(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height
        );
      }
    };
    this.resizeHandler = resize;
    window.addEventListener('resize', resize, false);
    resize();

    const geometry = new Triangle(gl);
    this.geometry = geometry;
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new Color(...this.color) },
        uResolution: {
          value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
        },
        uMouse: { value: new Float32Array([this.mousePos.x, this.mousePos.y]) },
        uAmplitude: { value: this.amplitude },
        uSpeed: { value: this.speed }
      }
    });
    this.program = program;

    const mesh = new Mesh(gl, { geometry, program });
    this.mesh = mesh;

    const update = (t: number) => {
      this.animateId = requestAnimationFrame(update);
      if (this.program) {
        this.program.uniforms['uTime'].value = t * 0.001;
        renderer.render({ scene: mesh });
      }
    };
    this.animateId = requestAnimationFrame(update);
    container.appendChild(gl.canvas);

    if (this.mouseReact) {
      const handleMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height;
        this.mousePos = { x, y };
        if (this.program) {
          (this.program.uniforms['uMouse'].value as Float32Array)[0] = x;
          (this.program.uniforms['uMouse'].value as Float32Array)[1] = y;
        }
      };
      this.mouseMoveHandler = handleMouseMove;
      container.addEventListener('mousemove', handleMouseMove);
    }

    this.initialized = true;
  }

  private cleanup(): void {
    if (this.animateId) {
      cancelAnimationFrame(this.animateId);
      this.animateId = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    const container = this.containerRef?.nativeElement;
    if (container && this.mouseMoveHandler) {
      container.removeEventListener('mousemove', this.mouseMoveHandler);
    }

    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas) {
      const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
      if (container && canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      this.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }

    // OGL cleanup - just null out references
    this.program = null;
    this.geometry = null;
    this.mesh = null;

    this.renderer = null;
    this.program = null;
    this.mesh = null;
    this.geometry = null;
  }
}

