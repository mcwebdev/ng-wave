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
import { Renderer, Triangle, Program, Mesh } from 'ogl';

interface Offset {
  x: number;
  y: number;
}

@Component({
  selector: 'ngw-prism',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prism.component.html',
  styleUrl: './prism.component.css'
})
export class PrismComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() height = 3.5;
  @Input() baseWidth = 5.5;
  @Input() animationType: 'rotate' | 'hover' | '3drotate' = 'rotate';
  @Input() glow = 1;
  @Input() offset: Offset = { x: 0, y: 0 };
  @Input() noise = 0.5;
  @Input() transparent = true;
  @Input() scale = 3.6;
  @Input() hueShift = 0;
  @Input() colorFrequency = 1;
  @Input() hoverStrength = 2;
  @Input() inertia = 0.05;
  @Input() bloom = 1;
  @Input() suspendWhenOffscreen = false;
  @Input() timeScale = 0.5;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private geometry: Triangle | null = null;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private mouseLeaveHandler: (() => void) | null = null;
  private blurHandler: (() => void) | null = null;
  private initialized = false;

  private pointer = { x: 0, y: 0, inside: true };
  private yaw = 0;
  private pitch = 0;
  private roll = 0;
  private targetYaw = 0;
  private targetPitch = 0;

  private readonly vertex = /* glsl */ `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  private readonly fragment = /* glsl */ `
    precision highp float;

    uniform vec2  iResolution;
    uniform float iTime;

    uniform float uHeight;
    uniform float uBaseHalf;
    uniform mat3  uRot;
    uniform int   uUseBaseWobble;
    uniform float uGlow;
    uniform vec2  uOffsetPx;
    uniform float uNoise;
    uniform float uSaturation;
    uniform float uScale;
    uniform float uHueShift;
    uniform float uColorFreq;
    uniform float uBloom;
    uniform float uCenterShift;
    uniform float uInvBaseHalf;
    uniform float uInvHeight;
    uniform float uMinAxis;
    uniform float uPxScale;
    uniform float uTimeScale;

    vec4 tanh4(vec4 x){
      vec4 e2x = exp(2.0*x);
      return (e2x - 1.0) / (e2x + 1.0);
    }

    float rand(vec2 co){
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float sdOctaAnisoInv(vec3 p){
      vec3 q = vec3(abs(p.x) * uInvBaseHalf, abs(p.y) * uInvHeight, abs(p.z) * uInvBaseHalf);
      float m = q.x + q.y + q.z - 1.0;
      return m * uMinAxis * 0.5773502691896258;
    }

    float sdPyramidUpInv(vec3 p){
      float oct = sdOctaAnisoInv(p);
      float halfSpace = -p.y;
      return max(oct, halfSpace);
    }

    mat3 hueRotation(float a){
      float c = cos(a), s = sin(a);
      mat3 W = mat3(
        0.299, 0.587, 0.114,
        0.299, 0.587, 0.114,
        0.299, 0.587, 0.114
      );
      mat3 U = mat3(
         0.701, -0.587, -0.114,
        -0.299,  0.413, -0.114,
        -0.300, -0.588,  0.886
      );
      mat3 V = mat3(
         0.168, -0.331,  0.500,
         0.328,  0.035, -0.500,
        -0.497,  0.296,  0.201
      );
      return W + U * c + V * s;
    }

    void main(){
      vec2 f = (gl_FragCoord.xy - 0.5 * iResolution.xy - uOffsetPx) * uPxScale;

      float z = 5.0;
      float d = 0.0;

      vec3 p;
      vec4 o = vec4(0.0);

      float centerShift = uCenterShift;
      float cf = uColorFreq;

      mat2 wob = mat2(1.0);
      if (uUseBaseWobble == 1) {
        float t = iTime * uTimeScale;
        float c0 = cos(t + 0.0);
        float c1 = cos(t + 33.0);
        float c2 = cos(t + 11.0);
        wob = mat2(c0, c1, c2, c0);
      }

      const int STEPS = 100;
      for (int i = 0; i < STEPS; i++) {
        p = vec3(f, z);
        p.xz = p.xz * wob;
        p = uRot * p;
        vec3 q = p;
        q.y += centerShift;
        d = 0.1 + 0.2 * abs(sdPyramidUpInv(q));
        z -= d;
        o += (sin((p.y + z) * cf + vec4(0.0, 1.0, 2.0, 3.0)) + 1.0) / d;
      }

      o = tanh4(o * o * (uGlow * uBloom) / 1e5);

      vec3 col = o.rgb;
      float n = rand(gl_FragCoord.xy + vec2(iTime));
      col += (n - 0.5) * uNoise;
      col = clamp(col, 0.0, 1.0);

      float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = clamp(mix(vec3(L), col, uSaturation), 0.0, 1.0);

      if(abs(uHueShift) > 0.0001){
        col = clamp(hueRotation(uHueShift) * col, 0.0, 1.0);
      }

      gl_FragColor = vec4(col, o.a);
    }
  `;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initPrism();
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

    // Most changes require reinitialization due to shader complexity
    if (
      changes['height'] ||
      changes['baseWidth'] ||
      changes['animationType'] ||
      changes['glow'] ||
      changes['offset'] ||
      changes['noise'] ||
      changes['transparent'] ||
      changes['scale'] ||
      changes['hueShift'] ||
      changes['colorFrequency'] ||
      changes['hoverStrength'] ||
      changes['inertia'] ||
      changes['bloom'] ||
      changes['timeScale']
    ) {
      this.cleanup();
      this.initPrism();
    }
  }

  private initPrism(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const H = Math.max(0.001, this.height);
    const BW = Math.max(0.001, this.baseWidth);
    const BASE_HALF = BW * 0.5;
    const GLOW = Math.max(0.0, this.glow);
    const NOISE = Math.max(0.0, this.noise);
    const offX = this.offset?.x ?? 0;
    const offY = this.offset?.y ?? 0;
    const SAT = this.transparent ? 1.5 : 1;
    const SCALE = Math.max(0.001, this.scale);
    const HUE = this.hueShift || 0;
    const CFREQ = Math.max(0.0, this.colorFrequency || 1);
    const BLOOM = Math.max(0.0, this.bloom || 1);
    const TS = Math.max(0, this.timeScale || 1);
    const HOVSTR = Math.max(0, this.hoverStrength || 1);
    const INERT = Math.max(0, Math.min(1, this.inertia || 0.12));

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const renderer = new Renderer({
      dpr,
      alpha: this.transparent,
      antialias: false
    });
    this.renderer = renderer;
    const gl = renderer.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);

    Object.assign(gl.canvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      display: 'block'
    });
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    this.geometry = geometry;
    const iResBuf = new Float32Array(2);
    const offsetPxBuf = new Float32Array(2);

    const program = new Program(gl, {
      vertex: this.vertex,
      fragment: this.fragment,
      uniforms: {
        iResolution: { value: iResBuf },
        iTime: { value: 0 },
        uHeight: { value: H },
        uBaseHalf: { value: BASE_HALF },
        uUseBaseWobble: { value: 1 },
        uRot: { value: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]) },
        uGlow: { value: GLOW },
        uOffsetPx: { value: offsetPxBuf },
        uNoise: { value: NOISE },
        uSaturation: { value: SAT },
        uScale: { value: SCALE },
        uHueShift: { value: HUE },
        uColorFreq: { value: CFREQ },
        uBloom: { value: BLOOM },
        uCenterShift: { value: H * 0.25 },
        uInvBaseHalf: { value: 1 / BASE_HALF },
        uInvHeight: { value: 1 / H },
        uMinAxis: { value: Math.min(BASE_HALF, H) },
        uPxScale: {
          value: 1 / ((gl.drawingBufferHeight || 1) * 0.1 * SCALE)
        },
        uTimeScale: { value: TS }
      }
    });
    this.program = program;
    const mesh = new Mesh(gl, { geometry, program });
    this.mesh = mesh;

    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h);
      iResBuf[0] = gl.drawingBufferWidth;
      iResBuf[1] = gl.drawingBufferHeight;
      offsetPxBuf[0] = offX * dpr;
      offsetPxBuf[1] = offY * dpr;
      program.uniforms['uPxScale'].value = 1 / ((gl.drawingBufferHeight || 1) * 0.1 * SCALE);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    this.resizeObserver = ro;
    resize();

    const rotBuf = new Float32Array(9);
    const setMat3FromEuler = (yawY: number, pitchX: number, rollZ: number, out: Float32Array): Float32Array => {
      const cy = Math.cos(yawY),
        sy = Math.sin(yawY);
      const cx = Math.cos(pitchX),
        sx = Math.sin(pitchX);
      const cz = Math.cos(rollZ),
        sz = Math.sin(rollZ);
      const r00 = cy * cz + sy * sx * sz;
      const r01 = -cy * sz + sy * sx * cz;
      const r02 = sy * cx;

      const r10 = cx * sz;
      const r11 = cx * cz;
      const r12 = -sx;

      const r20 = -sy * cz + cy * sx * sz;
      const r21 = sy * sz + cy * sx * cz;
      const r22 = cy * cx;

      out[0] = r00;
      out[1] = r10;
      out[2] = r20;
      out[3] = r01;
      out[4] = r11;
      out[5] = r21;
      out[6] = r02;
      out[7] = r12;
      out[8] = r22;
      return out;
    };

    const NOISE_IS_ZERO = NOISE < 1e-6;
    const t0 = performance.now();
    let raf = 0;

    const startRAF = () => {
      if (raf) return;
      raf = requestAnimationFrame(render);
      this.rafId = raf;
    };
    const stopRAF = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
      this.rafId = null;
    };

    const rnd = () => Math.random();
    const RSX = 1;
    const RSY = 1;
    const RSZ = 1;
    const wX = (0.3 + rnd() * 0.6) * RSX;
    const wY = (0.2 + rnd() * 0.7) * RSY;
    const wZ = (0.1 + rnd() * 0.5) * RSZ;
    const phX = rnd() * Math.PI * 2;
    const phZ = rnd() * Math.PI * 2;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const onMove = (e: PointerEvent) => {
      const ww = Math.max(1, window.innerWidth);
      const wh = Math.max(1, window.innerHeight);
      const cx = ww * 0.5;
      const cy = wh * 0.5;
      const nx = (e.clientX - cx) / (ww * 0.5);
      const ny = (e.clientY - cy) / (wh * 0.5);
      this.pointer.x = Math.max(-1, Math.min(1, nx));
      this.pointer.y = Math.max(-1, Math.min(1, ny));
      this.pointer.inside = true;
    };
    const onLeave = () => {
      this.pointer.inside = false;
    };
    const onBlur = () => {
      this.pointer.inside = false;
    };

    if (this.animationType === 'hover') {
      this.pointerMoveHandler = (e: PointerEvent) => {
        onMove(e);
        startRAF();
      };
      this.mouseLeaveHandler = onLeave;
      this.blurHandler = onBlur;
      window.addEventListener('pointermove', this.pointerMoveHandler, { passive: true });
      window.addEventListener('mouseleave', onLeave);
      window.addEventListener('blur', onBlur);
      program.uniforms['uUseBaseWobble'].value = 0;
    } else if (this.animationType === '3drotate') {
      program.uniforms['uUseBaseWobble'].value = 0;
    } else {
      program.uniforms['uUseBaseWobble'].value = 1;
    }

    const render = (t: number) => {
      const time = (t - t0) * 0.001;
      program.uniforms['iTime'].value = time;

      let continueRAF = true;

      if (this.animationType === 'hover') {
        const maxPitch = 0.6 * HOVSTR;
        const maxYaw = 0.6 * HOVSTR;
        this.targetYaw = (this.pointer.inside ? -this.pointer.x : 0) * maxYaw;
        this.targetPitch = (this.pointer.inside ? this.pointer.y : 0) * maxPitch;
        const prevYaw = this.yaw;
        const prevPitch = this.pitch;
        const prevRoll = this.roll;
        this.yaw = lerp(prevYaw, this.targetYaw, INERT);
        this.pitch = lerp(prevPitch, this.targetPitch, INERT);
        this.roll = lerp(prevRoll, 0, 0.1);
        program.uniforms['uRot'].value = setMat3FromEuler(this.yaw, this.pitch, this.roll, rotBuf);

        if (NOISE_IS_ZERO) {
          const settled =
            Math.abs(this.yaw - this.targetYaw) < 1e-4 &&
            Math.abs(this.pitch - this.targetPitch) < 1e-4 &&
            Math.abs(this.roll) < 1e-4;
          if (settled) continueRAF = false;
        }
      } else if (this.animationType === '3drotate') {
        const tScaled = time * TS;
        this.yaw = tScaled * wY;
        this.pitch = Math.sin(tScaled * wX + phX) * 0.6;
        this.roll = Math.sin(tScaled * wZ + phZ) * 0.5;
        program.uniforms['uRot'].value = setMat3FromEuler(this.yaw, this.pitch, this.roll, rotBuf);
        if (TS < 1e-6) continueRAF = false;
      } else {
        rotBuf[0] = 1;
        rotBuf[1] = 0;
        rotBuf[2] = 0;
        rotBuf[3] = 0;
        rotBuf[4] = 1;
        rotBuf[5] = 0;
        rotBuf[6] = 0;
        rotBuf[7] = 0;
        rotBuf[8] = 1;
        program.uniforms['uRot'].value = rotBuf;
        if (TS < 1e-6) continueRAF = false;
      }

      renderer.render({ scene: mesh });
      if (continueRAF) {
        raf = requestAnimationFrame(render);
        this.rafId = raf;
      } else {
        raf = 0;
        this.rafId = null;
      }
    };

    if (this.suspendWhenOffscreen) {
      const io = new IntersectionObserver(entries => {
        const vis = entries.some(e => e.isIntersecting);
        if (vis) startRAF();
        else stopRAF();
      });
      io.observe(container);
      this.intersectionObserver = io;
      startRAF();
    } else {
      startRAF();
    }

    this.initialized = true;
  }

  private cleanup(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    if (this.animationType === 'hover') {
      if (this.pointerMoveHandler) {
        window.removeEventListener('pointermove', this.pointerMoveHandler);
      }
      if (this.mouseLeaveHandler) {
        window.removeEventListener('mouseleave', this.mouseLeaveHandler);
      }
      if (this.blurHandler) {
        window.removeEventListener('blur', this.blurHandler);
      }
    }

    const container = this.containerRef?.nativeElement;
    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas) {
      const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
      if (container && canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    }

    this.program = null;
    this.geometry = null;
    this.mesh = null;
    this.renderer = null;
  }
}

