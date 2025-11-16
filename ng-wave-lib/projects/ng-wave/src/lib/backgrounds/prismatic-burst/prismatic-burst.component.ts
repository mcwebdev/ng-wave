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
import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl';

interface Offset {
  x: number;
  y: number;
}

function hexToRgb01(hex: string): [number, number, number] {
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) {
    const r = h[0],
      g = h[1],
      b = h[2];
    h = r + r + g + g + b + b;
  }
  const intVal = parseInt(h, 16);
  if (isNaN(intVal) || (h.length !== 6 && h.length !== 8)) return [1, 1, 1];
  const r = ((intVal >> 16) & 255) / 255;
  const g = ((intVal >> 8) & 255) / 255;
  const b = (intVal & 255) / 255;
  return [r, g, b];
}

function toPx(v: number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const num = parseFloat(s.replace('px', ''));
  return isNaN(num) ? 0 : num;
}

const vertexShader = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;

uniform float uIntensity;
uniform float uSpeed;
uniform int   uAnimType;
uniform vec2  uMouse;
uniform int   uColorCount;
uniform float uDistort;
uniform vec2  uOffset;
uniform sampler2D uGradient;
uniform float uNoiseAmount;
uniform int   uRayCount;

float hash21(vec2 p){
    p = floor(p);
    float f = 52.9829189 * fract(dot(p, vec2(0.065, 0.005)));
    return fract(f);
}

mat2 rot30(){ return mat2(0.8, -0.5, 0.5, 0.8); }

float layeredNoise(vec2 fragPx){
    vec2 p = mod(fragPx + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
    vec2 q = rot30() * p;
    float n = 0.0;
    n += 0.40 * hash21(q);
    n += 0.25 * hash21(q * 2.0 + 17.0);
    n += 0.20 * hash21(q * 4.0 + 47.0);
    n += 0.10 * hash21(q * 8.0 + 113.0);
    n += 0.05 * hash21(q * 16.0 + 191.0);
    return n;
}

vec3 rayDir(vec2 frag, vec2 res, vec2 offset, float dist){
    float focal = res.y * max(dist, 1e-3);
    return normalize(vec3(2.0 * (frag - offset) - res, focal));
}

float edgeFade(vec2 frag, vec2 res, vec2 offset){
    vec2 toC = frag - 0.5 * res - offset;
    float r = length(toC) / (0.5 * min(res.x, res.y));
    float x = clamp(r, 0.0, 1.0);
    float q = x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    float s = q * 0.5;
    s = pow(s, 1.5);
    float tail = 1.0 - pow(1.0 - s, 2.0);
    s = mix(s, tail, 0.2);
    float dn = (layeredNoise(frag * 0.15) - 0.5) * 0.0015 * s;
    return clamp(s + dn, 0.0, 1.0);
}

mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c,-s,0.0, s,c,0.0, 0.0,0.0,1.0); }

vec3 sampleGradient(float t){
    t = clamp(t, 0.0, 1.0);
    return texture(uGradient, vec2(t, 0.5)).rgb;
}

vec2 rot2(vec2 v, float a){
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c) * v;
}

float bendAngle(vec3 q, float t){
    float a = 0.8 * sin(q.x * 0.55 + t * 0.6)
            + 0.7 * sin(q.y * 0.50 - t * 0.5)
            + 0.6 * sin(q.z * 0.60 + t * 0.7);
    return a;
}

void main(){
    vec2 frag = gl_FragCoord.xy;
    float t = uTime * uSpeed;
    float jitterAmp = 0.1 * clamp(uNoiseAmount, 0.0, 1.0);
    vec3 dir = rayDir(frag, uResolution, uOffset, 1.0);
    float marchT = 0.0;
    vec3 col = vec3(0.0);
    float n = layeredNoise(frag);
    vec4 c = cos(t * 0.2 + vec4(0.0, 33.0, 11.0, 0.0));
    mat2 M2 = mat2(c.x, c.y, c.z, c.w);
    float amp = clamp(uDistort, 0.0, 50.0) * 0.15;

    mat3 rot3dMat = mat3(1.0);
    if(uAnimType == 1){
      vec3 ang = vec3(t * 0.31, t * 0.21, t * 0.17);
      rot3dMat = rotZ(ang.z) * rotY(ang.y) * rotX(ang.x);
    }
    mat3 hoverMat = mat3(1.0);
    if(uAnimType == 2){
      vec2 m = uMouse * 2.0 - 1.0;
      vec3 ang = vec3(m.y * 0.6, m.x * 0.6, 0.0);
      hoverMat = rotY(ang.y) * rotX(ang.x);
    }

    for (int i = 0; i < 44; ++i) {
        vec3 P = marchT * dir;
        P.z -= 2.0;
        float rad = length(P);
        vec3 Pl = P * (10.0 / max(rad, 1e-6));

        if(uAnimType == 0){
            Pl.xz *= M2;
        } else if(uAnimType == 1){
      Pl = rot3dMat * Pl;
        } else {
      Pl = hoverMat * Pl;
        }

        float stepLen = min(rad - 0.3, n * jitterAmp) + 0.1;

        float grow = smoothstep(0.35, 3.0, marchT);
        float a1 = amp * grow * bendAngle(Pl * 0.6, t);
        float a2 = 0.5 * amp * grow * bendAngle(Pl.zyx * 0.5 + 3.1, t * 0.9);
        vec3 Pb = Pl;
        Pb.xz = rot2(Pb.xz, a1);
        Pb.xy = rot2(Pb.xy, a2);

        float rayPattern = smoothstep(
            0.5, 0.7,
            sin(Pb.x + cos(Pb.y) * cos(Pb.z)) *
            sin(Pb.z + sin(Pb.y) * cos(Pb.x + t))
        );

        if (uRayCount > 0) {
            float ang = atan(Pb.y, Pb.x);
            float comb = 0.5 + 0.5 * cos(float(uRayCount) * ang);
            comb = pow(comb, 3.0);
            rayPattern *= smoothstep(0.15, 0.95, comb);
        }

        vec3 spectralDefault = 1.0 + vec3(
            cos(marchT * 3.0 + 0.0),
            cos(marchT * 3.0 + 1.0),
            cos(marchT * 3.0 + 2.0)
        );

        float saw = fract(marchT * 0.25);
        float tRay = saw * saw * (3.0 - 2.0 * saw);
        vec3 userGradient = 2.0 * sampleGradient(tRay);
        vec3 spectral = (uColorCount > 0) ? userGradient : spectralDefault;
        vec3 base = (0.05 / (0.4 + stepLen))
                  * smoothstep(5.0, 0.0, rad)
                  * spectral;

        col += base * rayPattern;
        marchT += stepLen;
    }

    col *= edgeFade(frag, uResolution, uOffset);
    col *= uIntensity;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

@Component({
  selector: 'ngw-prismatic-burst',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prismatic-burst.component.html',
  styleUrl: './prismatic-burst.component.css'
})
export class PrismaticBurstComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() intensity = 2;
  @Input() speed = 0.5;
  @Input() animationType: 'rotate' | 'rotate3d' | 'hover' = 'rotate3d';
  @Input() colors: string[] = [];
  @Input() distort = 0;
  @Input() paused = false;
  @Input() offset: Offset = { x: 0, y: 0 };
  @Input() hoverDampness = 0;
  @Input() rayCount = 0;
  @Input() mixBlendMode = 'lighten';
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private geometry: Triangle | null = null;
  private gradientTex: Texture | null = null;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeHandler: (() => void) | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private visibilityChangeHandler: (() => void) | null = null;
  private mouseTarget: [number, number] = [0.5, 0.5];
  private mouseSmooth: [number, number] = [0.5, 0.5];
  private accumTime = 0;
  private lastTime = 0;
  private isVisible = true;
  private initialized = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initPrismaticBurst();
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

    if (changes['intensity']) {
      this.program.uniforms['uIntensity'].value = this.intensity ?? 1;
    }
    if (changes['speed']) {
      this.program.uniforms['uSpeed'].value = this.speed ?? 1;
    }
    if (changes['animationType']) {
      const animTypeMap: Record<string, number> = {
        rotate: 0,
        rotate3d: 1,
        hover: 2
      };
      this.program.uniforms['uAnimType'].value = animTypeMap[this.animationType ?? 'rotate'];
    }
    if (changes['distort']) {
      this.program.uniforms['uDistort'].value = typeof this.distort === 'number' ? this.distort : 0;
    }
    if (changes['offset']) {
      const ox = toPx(this.offset?.x);
      const oy = toPx(this.offset?.y);
      this.program.uniforms['uOffset'].value = [ox, oy];
    }
    if (changes['rayCount']) {
      this.program.uniforms['uRayCount'].value = Math.max(0, Math.floor(this.rayCount ?? 0));
    }
    if (changes['colors']) {
      this.updateGradientTexture();
    }
    if (changes['mixBlendMode']) {
      const canvas = this.renderer?.gl?.canvas as HTMLCanvasElement | undefined;
      if (canvas) {
        canvas.style.mixBlendMode = this.mixBlendMode && this.mixBlendMode !== 'none' ? this.mixBlendMode : '';
      }
    }
  }

  private updateGradientTexture(): void {
    if (!this.program || !this.gradientTex || !this.renderer) return;

    const gl = this.renderer.gl;
    let count = 0;
    if (Array.isArray(this.colors) && this.colors.length > 0) {
      const capped = this.colors.slice(0, 64);
      count = capped.length;
      const data = new Uint8Array(count * 4);
      for (let i = 0; i < count; i++) {
        const [r, g, b] = hexToRgb01(capped[i]);
        data[i * 4 + 0] = Math.round(r * 255);
        data[i * 4 + 1] = Math.round(g * 255);
        data[i * 4 + 2] = Math.round(b * 255);
        data[i * 4 + 3] = 255;
      }
      this.gradientTex.image = data;
      this.gradientTex.width = count;
      this.gradientTex.height = 1;
      this.gradientTex.minFilter = gl.LINEAR;
      this.gradientTex.magFilter = gl.LINEAR;
      this.gradientTex.wrapS = gl.CLAMP_TO_EDGE;
      this.gradientTex.wrapT = gl.CLAMP_TO_EDGE;
      this.gradientTex.flipY = false;
      this.gradientTex.generateMipmaps = false;
      this.gradientTex.format = gl.RGBA;
      this.gradientTex.type = gl.UNSIGNED_BYTE;
      this.gradientTex.needsUpdate = true;
    } else {
      count = 0;
    }
    this.program.uniforms['uColorCount'].value = count;
  }

  private initPrismaticBurst(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new Renderer({
      dpr,
      alpha: false,
      antialias: false
    });
    this.renderer = renderer;

    const gl = renderer.gl;
    gl.canvas.style.position = 'absolute';
    gl.canvas.style.inset = '0';
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.mixBlendMode = this.mixBlendMode && this.mixBlendMode !== 'none' ? this.mixBlendMode : '';
    container.appendChild(gl.canvas);

    const white = new Uint8Array([255, 255, 255, 255]);
    const gradientTex = new Texture(gl, {
      image: white,
      width: 1,
      height: 1,
      generateMipmaps: false,
      flipY: false
    });

    gradientTex.minFilter = gl.LINEAR;
    gradientTex.magFilter = gl.LINEAR;
    gradientTex.wrapS = gl.CLAMP_TO_EDGE;
    gradientTex.wrapT = gl.CLAMP_TO_EDGE;
    this.gradientTex = gradientTex;

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uResolution: { value: [1, 1] },
        uTime: { value: 0 },

        uIntensity: { value: 1 },
        uSpeed: { value: 1 },
        uAnimType: { value: 0 },
        uMouse: { value: [0.5, 0.5] },
        uColorCount: { value: 0 },
        uDistort: { value: 0 },
        uOffset: { value: [0, 0] },
        uGradient: { value: gradientTex },
        uNoiseAmount: { value: 0.8 },
        uRayCount: { value: 0 }
      }
    });

    this.program = program;

    const triangle = new Triangle(gl);
    this.geometry = triangle;
    const mesh = new Mesh(gl, { geometry: triangle, program });
    this.mesh = mesh;

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      program.uniforms['uResolution'].value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(resize);
      ro.observe(container);
      this.resizeObserver = ro;
    } else {
      this.resizeHandler = resize;
      window.addEventListener('resize', resize);
    }
    resize();

    const onPointer = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1);
      this.mouseTarget = [Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1)];
    };
    this.pointerMoveHandler = onPointer;
    container.addEventListener('pointermove', onPointer, { passive: true });

    let io: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        entries => {
          if (entries[0]) {
            this.isVisible = entries[0].isIntersecting;
          }
        },
        { root: null, threshold: 0.01 }
      );
      io.observe(container);
      this.intersectionObserver = io;
    }

    const onVis = () => {};
    this.visibilityChangeHandler = onVis;
    document.addEventListener('visibilitychange', onVis);

    // Apply initial props
    const animTypeMap: Record<string, number> = {
      rotate: 0,
      rotate3d: 1,
      hover: 2
    };
    program.uniforms['uIntensity'].value = this.intensity ?? 1;
    program.uniforms['uSpeed'].value = this.speed ?? 1;
    program.uniforms['uAnimType'].value = animTypeMap[this.animationType ?? 'rotate'];
    program.uniforms['uDistort'].value = typeof this.distort === 'number' ? this.distort : 0;
    const ox = toPx(this.offset?.x);
    const oy = toPx(this.offset?.y);
    program.uniforms['uOffset'].value = [ox, oy];
    program.uniforms['uRayCount'].value = Math.max(0, Math.floor(this.rayCount ?? 0));
    this.updateGradientTexture();

    let raf = 0;
    this.lastTime = performance.now();

    const update = (now: number) => {
      const dt = Math.max(0, now - this.lastTime) * 0.001;
      this.lastTime = now;
      const visible = this.isVisible && !document.hidden;
      if (!this.paused) this.accumTime += dt;

      if (!visible) {
        raf = requestAnimationFrame(update);
        this.rafId = raf;
        return;
      }

      const tau = 0.02 + Math.max(0, Math.min(1, this.hoverDampness)) * 0.5;
      const alpha = 1 - Math.exp(-dt / tau);
      const tgt = this.mouseTarget;
      const sm = this.mouseSmooth;
      sm[0] += (tgt[0] - sm[0]) * alpha;
      sm[1] += (tgt[1] - sm[1]) * alpha;

      program.uniforms['uMouse'].value = sm;
      program.uniforms['uTime'].value = this.accumTime;

      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(update);
      this.rafId = raf;
    };
    raf = requestAnimationFrame(update);
    this.rafId = raf;
    this.initialized = true;
  }

  private cleanup(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    const container = this.containerRef?.nativeElement;
    if (container) {
      if (this.pointerMoveHandler) {
        container.removeEventListener('pointermove', this.pointerMoveHandler);
      }
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    } else if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas) {
      const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
      try {
        if (container && canvas.parentElement === container) {
          container.removeChild(canvas);
        }
      } catch {
        // Canvas already removed
      }
    }

    if (this.gradientTex && this.renderer) {
      try {
        const glCtx = this.renderer.gl;
        if (glCtx && this.gradientTex.texture) {
          glCtx.deleteTexture(this.gradientTex.texture);
        }
      } catch {
        // Ignore texture delete errors
      }
    }

    this.program = null;
    this.geometry = null;
    this.mesh = null;
    this.gradientTex = null;
    this.renderer = null;
  }
}

