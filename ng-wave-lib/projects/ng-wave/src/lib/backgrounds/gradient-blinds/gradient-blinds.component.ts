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
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const MAX_COLORS = 8;

function hexToRGB(hex: string): [number, number, number] {
  const c = hex.replace('#', '').padEnd(6, '0');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function prepStops(stops: string[] | null | undefined): { arr: [number, number, number][]; count: number } {
  const base = (stops && stops.length ? stops : ['#FF9FFC', '#5227FF']).slice(0, MAX_COLORS);
  if (base.length === 1) base.push(base[0]);
  while (base.length < MAX_COLORS) base.push(base[base.length - 1]);
  const arr: [number, number, number][] = [];
  for (let i = 0; i < MAX_COLORS; i++) arr.push(hexToRGB(base[i]));
  const count = Math.max(2, Math.min(MAX_COLORS, stops?.length ?? 2));
  return { arr, count };
}

@Component({
  selector: 'ngw-gradient-blinds',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gradient-blinds.component.html',
  styleUrl: './gradient-blinds.component.css'
})
export class GradientBlindsComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() className = '';
  @Input() dpr?: number;
  @Input() paused = false;
  @Input() gradientColors: string[] = ['#FF9FFC', '#5227FF'];
  @Input() angle = 0;
  @Input() noise = 0.3;
  @Input() blindCount = 16;
  @Input() blindMinWidth = 60;
  @Input() mouseDampening = 0.15;
  @Input() mirrorGradient = false;
  @Input() spotlightRadius = 0.5;
  @Input() spotlightSoftness = 1;
  @Input() spotlightOpacity = 1;
  @Input() distortAmount = 0;
  @Input() shineDirection: 'left' | 'right' = 'left';
  @Input() mixBlendMode = 'lighten';

  private readonly platformId = inject(PLATFORM_ID);
  private rafId: number | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private geometry: Triangle | null = null;
  private renderer: Renderer | null = null;
  private mouseTarget: [number, number] = [0, 0];
  private lastTime = 0;
  private firstResize = true;
  private resizeObserver: ResizeObserver | null = null;
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private initialized = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initGradientBlinds();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.initialized) {
      return;
    }

    if (this.program && this.program.uniforms) {
      const uniforms = this.program.uniforms;

      if (changes['angle']) {
        uniforms['uAngle'].value = (this.angle * Math.PI) / 180;
      }
      if (changes['noise']) {
        uniforms['uNoise'].value = this.noise;
      }
      if (changes['blindCount']) {
        uniforms['uBlindCount'].value = Math.max(1, this.blindCount);
      }
      if (changes['spotlightRadius']) {
        uniforms['uSpotlightRadius'].value = this.spotlightRadius;
      }
      if (changes['spotlightSoftness']) {
        uniforms['uSpotlightSoftness'].value = this.spotlightSoftness;
      }
      if (changes['spotlightOpacity']) {
        uniforms['uSpotlightOpacity'].value = this.spotlightOpacity;
      }
      if (changes['mirrorGradient']) {
        uniforms['uMirror'].value = this.mirrorGradient ? 1 : 0;
      }
      if (changes['distortAmount']) {
        uniforms['uDistort'].value = this.distortAmount;
      }
      if (changes['shineDirection']) {
        uniforms['uShineFlip'].value = this.shineDirection === 'right' ? 1 : 0;
      }
      if (changes['gradientColors']) {
        const { arr: colorArr, count: colorCount } = prepStops(this.gradientColors);
        for (let i = 0; i < MAX_COLORS; i++) {
          uniforms[`uColor${i}` as keyof typeof uniforms].value = colorArr[i];
        }
        uniforms['uColorCount'].value = colorCount;
      }
    }
  }

  private initGradientBlinds(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const renderer = new Renderer({
      dpr: this.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
      alpha: true,
      antialias: true
    });
    this.renderer = renderer;
    const gl = renderer.gl;
    const canvas = gl.canvas;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

    const fragment = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform float uAngle;
uniform float uNoise;
uniform float uBlindCount;
uniform float uSpotlightRadius;
uniform float uSpotlightSoftness;
uniform float uSpotlightOpacity;
uniform float uMirror;
uniform float uDistort;
uniform float uShineFlip;
uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;
uniform vec3  uColor6;
uniform vec3  uColor7;
uniform int   uColorCount;

varying vec2 vUv;

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

vec2 rotate2D(vec2 p, float a){
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

vec3 getGradientColor(float t){
  float tt = clamp(t, 0.0, 1.0);
  int count = uColorCount;
  if (count < 2) count = 2;
  float scaled = tt * float(count - 1);
  float seg = floor(scaled);
  float f = fract(scaled);

  if (seg < 1.0) return mix(uColor0, uColor1, f);
  if (seg < 2.0 && count > 2) return mix(uColor1, uColor2, f);
  if (seg < 3.0 && count > 3) return mix(uColor2, uColor3, f);
  if (seg < 4.0 && count > 4) return mix(uColor3, uColor4, f);
  if (seg < 5.0 && count > 5) return mix(uColor4, uColor5, f);
  if (seg < 6.0 && count > 6) return mix(uColor5, uColor6, f);
  if (seg < 7.0 && count > 7) return mix(uColor6, uColor7, f);
  if (count > 7) return uColor7;
  if (count > 6) return uColor6;
  if (count > 5) return uColor5;
  if (count > 4) return uColor4;
  if (count > 3) return uColor3;
  if (count > 2) return uColor2;
  return uColor1;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv0 = fragCoord.xy / iResolution.xy;

    float aspect = iResolution.x / iResolution.y;
    vec2 p = uv0 * 2.0 - 1.0;
    p.x *= aspect;
    vec2 pr = rotate2D(p, uAngle);
    pr.x /= aspect;
    vec2 uv = pr * 0.5 + 0.5;

    vec2 uvMod = uv;
    if (uDistort > 0.0) {
      float a = uvMod.y * 6.0;
      float b = uvMod.x * 6.0;
      float w = 0.01 * uDistort;
      uvMod.x += sin(a) * w;
      uvMod.y += cos(b) * w;
    }
    float t = uvMod.x;
    if (uMirror > 0.5) {
      t = 1.0 - abs(1.0 - 2.0 * fract(t));
    }
    vec3 base = getGradientColor(t);

    vec2 offset = vec2(iMouse.x/iResolution.x, iMouse.y/iResolution.y);
  float d = length(uv0 - offset);
  float r = max(uSpotlightRadius, 1e-4);
  float dn = d / r;
  float spot = (1.0 - 2.0 * pow(dn, uSpotlightSoftness)) * uSpotlightOpacity;
  vec3 cir = vec3(spot);
  float stripe = fract(uvMod.x * max(uBlindCount, 1.0));
  if (uShineFlip > 0.5) stripe = 1.0 - stripe;
    vec3 ran = vec3(stripe);

    vec3 col = cir + base - ran;
    col += (rand(gl_FragCoord.xy + iTime) - 0.5) * uNoise;

    fragColor = vec4(col, 1.0);
}

void main() {
    vec4 color;
    mainImage(color, vUv * iResolution.xy);
    gl_FragColor = color;
}
`;

    const { arr: colorArr, count: colorCount } = prepStops(this.gradientColors);
    const uniforms = {
      iResolution: {
        value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1]
      },
      iMouse: { value: [0, 0] },
      iTime: { value: 0 },
      uAngle: { value: (this.angle * Math.PI) / 180 },
      uNoise: { value: this.noise },
      uBlindCount: { value: Math.max(1, this.blindCount) },
      uSpotlightRadius: { value: this.spotlightRadius },
      uSpotlightSoftness: { value: this.spotlightSoftness },
      uSpotlightOpacity: { value: this.spotlightOpacity },
      uMirror: { value: this.mirrorGradient ? 1 : 0 },
      uDistort: { value: this.distortAmount },
      uShineFlip: { value: this.shineDirection === 'right' ? 1 : 0 },
      uColor0: { value: colorArr[0] },
      uColor1: { value: colorArr[1] },
      uColor2: { value: colorArr[2] },
      uColor3: { value: colorArr[3] },
      uColor4: { value: colorArr[4] },
      uColor5: { value: colorArr[5] },
      uColor6: { value: colorArr[6] },
      uColor7: { value: colorArr[7] },
      uColorCount: { value: colorCount }
    };

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms
    });
    this.program = program;

    const geometry = new Triangle(gl);
    this.geometry = geometry;
    const mesh = new Mesh(gl, { geometry, program });
    this.mesh = mesh;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      uniforms.iResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight, 1];

      if (this.blindMinWidth && this.blindMinWidth > 0) {
        const maxByMinWidth = Math.max(1, Math.floor(rect.width / this.blindMinWidth));

        const effective = this.blindCount ? Math.min(this.blindCount, maxByMinWidth) : maxByMinWidth;
        uniforms.uBlindCount.value = Math.max(1, effective);
      } else {
        uniforms.uBlindCount.value = Math.max(1, this.blindCount);
      }

      if (this.firstResize) {
        this.firstResize = false;
        const cx = gl.drawingBufferWidth / 2;
        const cy = gl.drawingBufferHeight / 2;
        uniforms.iMouse.value = [cx, cy];
        this.mouseTarget = [cx, cy];
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    this.resizeObserver = ro;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scale = renderer.dpr || 1;
      const x = (e.clientX - rect.left) * scale;
      const y = (rect.height - (e.clientY - rect.top)) * scale;
      this.mouseTarget = [x, y];
      if (this.mouseDampening <= 0) {
        uniforms.iMouse.value = [x, y];
      }
    };
    this.pointerMoveHandler = onPointerMove;
    canvas.addEventListener('pointermove', onPointerMove);

    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      uniforms.iTime.value = t * 0.001;
      if (this.mouseDampening > 0) {
        if (!this.lastTime) this.lastTime = t;
        const dt = (t - this.lastTime) / 1000;
        this.lastTime = t;
        const tau = Math.max(1e-4, this.mouseDampening);
        let factor = 1 - Math.exp(-dt / tau);
        if (factor > 1) factor = 1;
        const target = this.mouseTarget;
        const cur = uniforms.iMouse.value;
        cur[0] += (target[0] - cur[0]) * factor;
        cur[1] += (target[1] - cur[1]) * factor;
      } else {
        this.lastTime = t;
      }
      if (!this.paused && this.program && this.mesh) {
        try {
          renderer.render({ scene: this.mesh });
        } catch (e) {
          console.error(e);
        }
      }
    };
    this.rafId = requestAnimationFrame(loop);
    this.initialized = true;
  }

  private cleanup(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas) {
      const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
      if (this.pointerMoveHandler) {
        canvas.removeEventListener('pointermove', this.pointerMoveHandler);
      }
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas) {
      const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
      const container = this.containerRef?.nativeElement;
      if (container && canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    }

    const callIfFn = (obj: any, key: string) => {
      if (obj && typeof obj[key] === 'function') {
        obj[key].call(obj);
      }
    };
    callIfFn(this.program, 'remove');
    callIfFn(this.geometry, 'remove');
    callIfFn(this.mesh, 'remove');
    callIfFn(this.renderer, 'destroy');
    this.program = null;
    this.geometry = null;
    this.mesh = null;
    this.renderer = null;
  }
}

