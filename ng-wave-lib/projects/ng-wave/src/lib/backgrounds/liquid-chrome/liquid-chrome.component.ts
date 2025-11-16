import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

@Component({
  selector: 'ngw-liquid-chrome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './liquid-chrome.component.html',
  styleUrl: './liquid-chrome.component.css'
})
export class LiquidChromeComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() baseColor: [number, number, number] = [0.1, 0.1, 0.1];
  @Input() speed = 0.2;
  @Input() amplitude = 0.3;
  @Input() frequencyX = 3;
  @Input() frequencyY = 3;
  @Input() interactive = true;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private geometry: Triangle | null = null;
  private animationId: number | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private initialized = false;

  private readonly vertexShader = `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  private readonly fragmentShader = `
    precision highp float;
    uniform float uTime;
    uniform vec3 uResolution;
    uniform vec3 uBaseColor;
    uniform float uAmplitude;
    uniform float uFrequencyX;
    uniform float uFrequencyY;
    uniform vec2 uMouse;
    varying vec2 vUv;

    vec4 renderImage(vec2 uvCoord) {
        vec2 fragCoord = uvCoord * uResolution.xy;
        vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);

        for (float i = 1.0; i < 10.0; i++){
            uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
            uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
        }

        vec2 diff = (uvCoord - uMouse);
        float dist = length(diff);
        float falloff = exp(-dist * 20.0);
        float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
        uv += (diff / (dist + 0.0001)) * ripple * falloff;

        vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));
        return vec4(color, 1.0);
    }

    void main() {
        vec4 col = vec4(0.0);
        int samples = 0;
        for (int i = -1; i <= 1; i++){
            for (int j = -1; j <= 1; j++){
                vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));
                col += renderImage(vUv + offset);
                samples++;
            }
        }
        gl_FragColor = col / float(samples);
    }
  `;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initLiquidChrome();
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

    if (changes['baseColor']) {
      (this.program.uniforms['uBaseColor'].value as Float32Array).set(this.baseColor);
    }
    if (changes['speed']) {
      // Speed is applied in the update loop
    }
    if (changes['amplitude']) {
      this.program.uniforms['uAmplitude'].value = this.amplitude;
    }
    if (changes['frequencyX']) {
      this.program.uniforms['uFrequencyX'].value = this.frequencyX;
    }
    if (changes['frequencyY']) {
      this.program.uniforms['uFrequencyY'].value = this.frequencyY;
    }
  }

  private initLiquidChrome(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const renderer = new Renderer({ antialias: true });
    this.renderer = renderer;
    const gl = renderer.gl;
    gl.clearColor(1, 1, 1, 1);

    const geometry = new Triangle(gl);
    this.geometry = geometry;
    const program = new Program(gl, {
      vertex: this.vertexShader,
      fragment: this.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Float32Array([gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height])
        },
        uBaseColor: { value: new Float32Array(this.baseColor) },
        uAmplitude: { value: this.amplitude },
        uFrequencyX: { value: this.frequencyX },
        uFrequencyY: { value: this.frequencyY },
        uMouse: { value: new Float32Array([0, 0]) }
      }
    });
    this.program = program;
    const mesh = new Mesh(gl, { geometry, program });
    this.mesh = mesh;

    const resize = () => {
      const scale = 1;
      renderer.setSize(container.offsetWidth * scale, container.offsetHeight * scale);
      const resUniform = program.uniforms['uResolution'].value as Float32Array;
      resUniform[0] = gl.canvas.width;
      resUniform[1] = gl.canvas.height;
      resUniform[2] = gl.canvas.width / gl.canvas.height;
    };
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      const mouseUniform = program.uniforms['uMouse'].value as Float32Array;
      mouseUniform[0] = x;
      mouseUniform[1] = y;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        const rect = container.getBoundingClientRect();
        const x = (touch.clientX - rect.left) / rect.width;
        const y = 1 - (touch.clientY - rect.top) / rect.height;
        const mouseUniform = program.uniforms['uMouse'].value as Float32Array;
        mouseUniform[0] = x;
        mouseUniform[1] = y;
      }
    };

    if (this.interactive) {
      this.mouseMoveHandler = handleMouseMove;
      this.touchMoveHandler = handleTouchMove;
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('touchmove', handleTouchMove);
    }

    const update = (t: number) => {
      this.animationId = requestAnimationFrame(update);
      if (this.program) {
        this.program.uniforms['uTime'].value = t * 0.001 * this.speed;
        renderer.render({ scene: mesh });
      }
    };
    this.animationId = requestAnimationFrame(update);

    container.appendChild(gl.canvas);
    this.initialized = true;
  }

  private cleanup(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    const container = this.containerRef?.nativeElement;
    if (container) {
      if (this.mouseMoveHandler) {
        container.removeEventListener('mousemove', this.mouseMoveHandler);
      }
      if (this.touchMoveHandler) {
        container.removeEventListener('touchmove', this.touchMoveHandler);
      }
    }

    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas) {
      const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
      if (container && canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      this.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }

    this.program = null;
    this.geometry = null;
    this.mesh = null;
    this.renderer = null;
  }
}

