import { Component, input, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, inject, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Renderer, Program, Mesh, Triangle, Transform, Vec3, Camera } from 'ogl';

function parseHexColor(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function fract(x: number): number {
  return x - Math.floor(x);
}

function hash31(p: number): [number, number, number] {
  let r: [number, number, number] = [p * 0.1031, p * 0.103, p * 0.0973].map(fract) as [number, number, number];
  const r_yzx: [number, number, number] = [r[1], r[2], r[0]];
  const dotVal = r[0] * (r_yzx[0] + 33.33) + r[1] * (r_yzx[1] + 33.33) + r[2] * (r_yzx[2] + 33.33);
  for (let i = 0; i < 3; i++) {
    r[i] = fract(r[i] + dotVal);
  }
  return r;
}

function hash33(v: [number, number, number]): [number, number, number] {
  let p: [number, number, number] = [v[0] * 0.1031, v[1] * 0.103, v[2] * 0.0973].map(fract) as [number, number, number];
  const p_yxz: [number, number, number] = [p[1], p[0], p[2]];
  const dotVal = p[0] * (p_yxz[0] + 33.33) + p[1] * (p_yxz[1] + 33.33) + p[2] * (p_yxz[2] + 33.33);
  for (let i = 0; i < 3; i++) {
    p[i] = fract(p[i] + dotVal);
  }
  const p_xxy: [number, number, number] = [p[0], p[0], p[1]];
  const p_yxx: [number, number, number] = [p[1], p[0], p[0]];
  const p_zyx: [number, number, number] = [p[2], p[1], p[0]];
  const result: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    result[i] = fract((p_xxy[i] + p_yxx[i]) * p_zyx[i]);
  }
  return result;
}

const vertex = `#version 300 es
precision highp float;
layout(location = 0) in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec3 iMouse;
uniform vec3 iColor;
uniform vec3 iCursorColor;
uniform float iAnimationSize;
uniform int iBallCount;
uniform float iCursorBallSize;
uniform vec3 iMetaBalls[50];
uniform float iClumpFactor;
uniform bool enableTransparency;
out vec4 outColor;
const float PI = 3.14159265359;

float getMetaBallValue(vec2 c, float r, vec2 p) {
  vec2 d = p - c;
  float dist2 = dot(d, d);
  return (r * r) / dist2;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  float scale = iAnimationSize / iResolution.y;
  vec2 coord = (fc - iResolution.xy * 0.5) * scale;
  vec2 mouseW = (iMouse.xy - iResolution.xy * 0.5) * scale;
  float m1 = 0.0;
  for (int i = 0; i < 50; i++) {
    if (i >= iBallCount) break;
    m1 += getMetaBallValue(iMetaBalls[i].xy, iMetaBalls[i].z, coord);
  }
  float m2 = getMetaBallValue(mouseW, iCursorBallSize, coord);
  float total = m1 + m2;
  float f = smoothstep(-1.0, 1.0, (total - 1.3) / min(1.0, fwidth(total)));
  vec3 cFinal = vec3(0.0);
  if (total > 0.0) {
    float alpha1 = m1 / total;
    float alpha2 = m2 / total;
    cFinal = iColor * alpha1 + iCursorColor * alpha2;
  }
  outColor = vec4(cFinal * f, enableTransparency ? f : 1.0);
}
`;

@Component({
  selector: 'ngw-meta-balls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meta-balls.component.html',
  styleUrl: './meta-balls.component.css'
})
export class MetaBallsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;

  readonly className = input<string>('');
  readonly color = input<string>('#ffffff');
  readonly speed = input<number>(0.3);
  readonly enableMouseInteraction = input<boolean>(true);
  readonly hoverSmoothness = input<number>(0.05);
  readonly animationSize = input<number>(30);
  readonly ballCount = input<number>(15);
  readonly clumpFactor = input<number>(1);
  readonly cursorBallSize = input<number>(3);
  readonly cursorBallColor = input<string>('#ffffff');
  readonly enableTransparency = input<boolean>(true);

  private readonly platformId = inject(PLATFORM_ID);
  private renderer: Renderer | null = null;
  private gl: WebGLRenderingContext | null = null;
  private camera: Camera | null = null;
  private scene: Transform | null = null;
  private mesh: Mesh | null = null;
  private program: Program | null = null;
  private metaBallsUniform: Vec3[] = [];
  private ballParams: Array<{ st: number; dtFactor: number; baseScale: number; toggle: number; radius: number }> = [];
  private mouseBallPos = { x: 0, y: 0 };
  private pointerInside = false;
  private pointerX = 0;
  private pointerY = 0;
  private animationFrameId: number | null = null;
  private startTime = 0;
  private resizeHandler: (() => void) | null = null;
  private pointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private pointerEnterHandler: (() => void) | null = null;
  private pointerLeaveHandler: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.program) {
        this.updateUniforms();
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) return;
    this.init();
  }

  private init(): void {
    if (!isPlatformBrowser(this.platformId) || !this.containerRef?.nativeElement) return;

    const container = this.containerRef.nativeElement;

    const dpr = 1;
    const renderer = new Renderer({ dpr, alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    this.renderer = renderer;
    this.gl = gl;
    gl.clearColor(0, 0, 0, this.enableTransparency() ? 0 : 1);
    container.appendChild(gl.canvas);

    const camera = new Camera(gl, {
      left: -1,
      right: 1,
      top: 1,
      bottom: -1,
      near: 0.1,
      far: 10
    });
    camera.position.z = 1;
    this.camera = camera;

    const geometry = new Triangle(gl);
    const [r1, g1, b1] = parseHexColor(this.color());
    const [r2, g2, b2] = parseHexColor(this.cursorBallColor());

    const metaBallsUniform: Vec3[] = [];
    for (let i = 0; i < 50; i++) {
      metaBallsUniform.push(new Vec3(0, 0, 0));
    }
    this.metaBallsUniform = metaBallsUniform;

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vec3(0, 0, 0) },
        iMouse: { value: new Vec3(0, 0, 0) },
        iColor: { value: new Vec3(r1, g1, b1) },
        iCursorColor: { value: new Vec3(r2, g2, b2) },
        iAnimationSize: { value: this.animationSize() },
        iBallCount: { value: this.ballCount() },
        iCursorBallSize: { value: this.cursorBallSize() },
        iMetaBalls: { value: metaBallsUniform },
        iClumpFactor: { value: this.clumpFactor() },
        enableTransparency: { value: this.enableTransparency() }
      }
    });
    this.program = program;

    const mesh = new Mesh(gl, { geometry, program });
    const scene = new Transform();
    mesh.setParent(scene);
    this.mesh = mesh;
    this.scene = scene;

    const maxBalls = 50;
    const effectiveBallCount = Math.min(this.ballCount(), maxBalls);
    const ballParams: Array<{ st: number; dtFactor: number; baseScale: number; toggle: number; radius: number }> = [];
    for (let i = 0; i < effectiveBallCount; i++) {
      const idx = i + 1;
      const h1 = hash31(idx);
      const st = h1[0] * (2 * Math.PI);
      const dtFactor = 0.1 * Math.PI + h1[1] * (0.4 * Math.PI - 0.1 * Math.PI);
      const baseScale = 5.0 + h1[1] * (10.0 - 5.0);
      const h2 = hash33(h1);
      const toggle = Math.floor(h2[0] * 2.0);
      const radiusVal = 0.5 + h2[2] * (2.0 - 0.5);
      ballParams.push({ st, dtFactor, baseScale, toggle, radius: radiusVal });
    }
    this.ballParams = ballParams;

    const resize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width * dpr, height * dpr);
      gl.canvas.style.width = width + 'px';
      gl.canvas.style.height = height + 'px';
      program.uniforms['iResolution'].value.set(gl.canvas.width, gl.canvas.height, 0);
    };
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);
    resize();

    const onPointerMove = (e: PointerEvent) => {
      if (!this.enableMouseInteraction()) return;
      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      this.pointerX = (px / rect.width) * gl.canvas.width;
      this.pointerY = (1 - py / rect.height) * gl.canvas.height;
    };
    this.pointerMoveHandler = onPointerMove;

    const onPointerEnter = () => {
      if (!this.enableMouseInteraction()) return;
      this.pointerInside = true;
    };
    this.pointerEnterHandler = onPointerEnter;

    const onPointerLeave = () => {
      if (!this.enableMouseInteraction()) return;
      this.pointerInside = false;
    };
    this.pointerLeaveHandler = onPointerLeave;

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerenter', onPointerEnter);
    container.addEventListener('pointerleave', onPointerLeave);

    this.startTime = performance.now();
    const update = (t: number) => {
      this.animationFrameId = requestAnimationFrame(update);
      const elapsed = (t - this.startTime) * 0.001;
      program.uniforms['iTime'].value = elapsed;

      for (let i = 0; i < effectiveBallCount; i++) {
        const p = this.ballParams[i];
        const dt = elapsed * this.speed() * p.dtFactor;
        const th = p.st + dt;
        const x = Math.cos(th);
        const y = Math.sin(th + dt * p.toggle);
        const posX = x * p.baseScale * this.clumpFactor();
        const posY = y * p.baseScale * this.clumpFactor();
        this.metaBallsUniform[i].set(posX, posY, p.radius);
      }

      let targetX: number, targetY: number;
      if (this.pointerInside) {
        targetX = this.pointerX;
        targetY = this.pointerY;
      } else {
        const cx = gl.canvas.width * 0.5;
        const cy = gl.canvas.height * 0.5;
        const rx = gl.canvas.width * 0.15;
        const ry = gl.canvas.height * 0.15;
        targetX = cx + Math.cos(elapsed * this.speed()) * rx;
        targetY = cy + Math.sin(elapsed * this.speed()) * ry;
      }
      this.mouseBallPos.x += (targetX - this.mouseBallPos.x) * this.hoverSmoothness();
      this.mouseBallPos.y += (targetY - this.mouseBallPos.y) * this.hoverSmoothness();
      program.uniforms['iMouse'].value.set(this.mouseBallPos.x, this.mouseBallPos.y, 0);

      renderer.render({ scene, camera });
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private updateUniforms(): void {
    if (!this.program) return;
    const [r1, g1, b1] = parseHexColor(this.color());
    const [r2, g2, b2] = parseHexColor(this.cursorBallColor());
    this.program.uniforms['iColor'].value.set(r1, g1, b1);
    this.program.uniforms['iCursorColor'].value.set(r2, g2, b2);
    this.program.uniforms['iAnimationSize'].value = this.animationSize();
    this.program.uniforms['iBallCount'].value = this.ballCount();
    this.program.uniforms['iCursorBallSize'].value = this.cursorBallSize();
    this.program.uniforms['iClumpFactor'].value = this.clumpFactor();
    this.program.uniforms['enableTransparency'].value = this.enableTransparency();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.containerRef?.nativeElement && this.pointerMoveHandler) {
      this.containerRef.nativeElement.removeEventListener('pointermove', this.pointerMoveHandler);
      this.containerRef.nativeElement.removeEventListener('pointerenter', this.pointerEnterHandler!);
      this.containerRef.nativeElement.removeEventListener('pointerleave', this.pointerLeaveHandler!);
    }
    if (this.gl?.canvas && this.gl.canvas instanceof HTMLCanvasElement && this.gl.canvas.parentNode) {
      this.gl.canvas.parentNode.removeChild(this.gl.canvas);
    }
    if (this.gl) {
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
}
