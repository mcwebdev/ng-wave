import { Component, input, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, inject, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Renderer, Transform, Vec3, Color, Polyline } from 'ogl';

const vertex = `
  precision highp float;
  
  attribute vec3 position;
  attribute vec3 next;
  attribute vec3 prev;
  attribute vec2 uv;
  attribute float side;
  
  uniform vec2 uResolution;
  uniform float uDPR;
  uniform float uThickness;
  uniform float uTime;
  uniform float uEnableShaderEffect;
  uniform float uEffectAmplitude;
  
  varying vec2 vUV;
  
  vec4 getPosition() {
      vec4 current = vec4(position, 1.0);
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 nextScreen = next.xy * aspect;
      vec2 prevScreen = prev.xy * aspect;
      vec2 tangent = normalize(nextScreen - prevScreen);
      vec2 normal = vec2(-tangent.y, tangent.x);
      normal /= aspect;
      normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));
      float dist = length(nextScreen - prevScreen);
      normal *= smoothstep(0.0, 0.02, dist);
      float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
      float pixelWidth = current.w * pixelWidthRatio;
      normal *= pixelWidth * uThickness;
      current.xy -= normal * side;
      if(uEnableShaderEffect > 0.5) {
        current.xy += normal * sin(uTime + current.x * 10.0) * uEffectAmplitude;
      }
      return current;
  }
  
  void main() {
      vUV = uv;
      gl_Position = getPosition();
  }
`;

const fragment = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uEnableFade;
  varying vec2 vUV;
  void main() {
      float fadeFactor = 1.0;
      if(uEnableFade > 0.5) {
          fadeFactor = 1.0 - smoothstep(0.0, 1.0, vUV.y);
      }
      gl_FragColor = vec4(uColor, uOpacity * fadeFactor);
  }
`;

interface Line {
  spring: number;
  friction: number;
  mouseVelocity: Vec3;
  mouseOffset: Vec3;
  points: Vec3[];
  polyline: Polyline;
}

@Component({
  selector: 'ngw-ribbons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ribbons.component.html',
  styleUrl: './ribbons.component.css'
})
export class RibbonsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLElement>;

  readonly colors = input<string[]>(['#FC8EAC']);
  readonly baseSpring = input<number>(0.03);
  readonly baseFriction = input<number>(0.9);
  readonly baseThickness = input<number>(30);
  readonly offsetFactor = input<number>(0.05);
  readonly maxAge = input<number>(500);
  readonly pointCount = input<number>(50);
  readonly speedMultiplier = input<number>(0.6);
  readonly enableFade = input<boolean>(false);
  readonly enableShaderEffect = input<boolean>(false);
  readonly effectAmplitude = input<number>(2);
  readonly backgroundColor = input<[number, number, number, number]>([0, 0, 0, 0]);
  readonly className = input<string>('');

  private readonly platformId = inject(PLATFORM_ID);
  private renderer: Renderer | null = null;
  private gl: WebGLRenderingContext | null = null;
  private scene: Transform | null = null;
  private lines: Line[] = [];
  private mouse = new Vec3();
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private resizeHandler: (() => void) | null = null;
  private mouseMoveHandler: ((e: MouseEvent | TouchEvent) => void) | null = null;
  private touchStartHandler: ((e: TouchEvent) => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;

  constructor() {
    effect(() => {
      if (this.renderer && this.lines.length > 0) {
        this.updateLines();
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

    const renderer = new Renderer({ dpr: window.devicePixelRatio || 2, alpha: true });
    const gl = renderer.gl;
    this.renderer = renderer;
    this.gl = gl;
    const bg = this.backgroundColor();
    if (Array.isArray(bg) && bg.length === 4) {
      gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
    } else {
      gl.clearColor(0, 0, 0, 0);
    }

    gl.canvas.style.position = 'absolute';
    gl.canvas.style.top = '0';
    gl.canvas.style.left = '0';
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    container.appendChild(gl.canvas);

    const scene = new Transform();
    this.scene = scene;
    const lines: Line[] = [];
    this.lines = lines;

    const resize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      lines.forEach(line => line.polyline.resize());
    };
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);

    const center = (this.colors().length - 1) / 2;
    this.colors().forEach((color, index) => {
      const spring = this.baseSpring() + (Math.random() - 0.5) * 0.05;
      const friction = this.baseFriction() + (Math.random() - 0.5) * 0.05;
      const thickness = this.baseThickness() + (Math.random() - 0.5) * 3;
      const mouseOffset = new Vec3(
        (index - center) * this.offsetFactor() + (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.1,
        0
      );

      const line: Line = {
        spring,
        friction,
        mouseVelocity: new Vec3(),
        mouseOffset,
        points: [],
        polyline: {} as Polyline
      };

      const count = this.pointCount();
      const points: Vec3[] = [];
      for (let i = 0; i < count; i++) {
        points.push(new Vec3());
      }
      line.points = points;

      line.polyline = new Polyline(gl, {
        points,
        vertex,
        fragment,
        uniforms: {
          uColor: { value: new Color(color) },
          uThickness: { value: thickness },
          uOpacity: { value: 1.0 },
          uTime: { value: 0.0 },
          uEnableShaderEffect: { value: this.enableShaderEffect() ? 1.0 : 0.0 },
          uEffectAmplitude: { value: this.effectAmplitude() },
          uEnableFade: { value: this.enableFade() ? 1.0 : 0.0 }
        }
      });
      line.polyline.mesh.setParent(scene);
      lines.push(line);
    });

    resize();

    const updateMouse = (e: MouseEvent | TouchEvent) => {
      let x: number, y: number;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if ('changedTouches' in e && e.changedTouches.length) {
        x = e.changedTouches[0].clientX - rect.left;
        y = e.changedTouches[0].clientY - rect.top;
      } else if (e instanceof MouseEvent) {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      } else {
        return;
      }
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.mouse.set((x / width) * 2 - 1, (y / height) * -2 + 1, 0);
    };
    this.mouseMoveHandler = updateMouse;
    this.touchStartHandler = updateMouse;
    this.touchMoveHandler = updateMouse;

    container.addEventListener('mousemove', updateMouse);
    container.addEventListener('touchstart', updateMouse);
    container.addEventListener('touchmove', updateMouse);

    const tmp = new Vec3();
    this.lastTime = performance.now();
    const update = () => {
      this.animationFrameId = requestAnimationFrame(update);
      const currentTime = performance.now();
      const dt = currentTime - this.lastTime;
      this.lastTime = currentTime;

      lines.forEach(line => {
        tmp.copy(this.mouse).add(line.mouseOffset).sub(line.points[0]).multiply(line.spring);
        line.mouseVelocity.add(tmp).multiply(line.friction);
        line.points[0].add(line.mouseVelocity);

        for (let i = 1; i < line.points.length; i++) {
          const maxAge = this.maxAge();
          if (isFinite(maxAge) && maxAge > 0) {
            const segmentDelay = maxAge / (line.points.length - 1);
            const alpha = Math.min(1, (dt * this.speedMultiplier()) / segmentDelay);
            line.points[i].lerp(line.points[i - 1], alpha);
          } else {
            line.points[i].lerp(line.points[i - 1], 0.9);
          }
        }
        const uTime = line.polyline.mesh.program.uniforms['uTime'];
        if (uTime) {
          uTime.value = currentTime * 0.001;
        }
        line.polyline.updateGeometry();
      });

      renderer.render({ scene });
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private updateLines(): void {
    this.lines.forEach((line, index) => {
      if (index < this.colors().length) {
        const color = new Color(this.colors()[index]);
        const uColor = line.polyline.mesh.program.uniforms['uColor'];
        if (uColor) uColor.value = color;
      }
      const uThickness = line.polyline.mesh.program.uniforms['uThickness'];
      if (uThickness) uThickness.value = this.baseThickness() + (Math.random() - 0.5) * 3;
      const uEnableShaderEffect = line.polyline.mesh.program.uniforms['uEnableShaderEffect'];
      if (uEnableShaderEffect) uEnableShaderEffect.value = this.enableShaderEffect() ? 1.0 : 0.0;
      const uEffectAmplitude = line.polyline.mesh.program.uniforms['uEffectAmplitude'];
      if (uEffectAmplitude) uEffectAmplitude.value = this.effectAmplitude();
      const uEnableFade = line.polyline.mesh.program.uniforms['uEnableFade'];
      if (uEnableFade) uEnableFade.value = this.enableFade() ? 1.0 : 0.0;
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.containerRef?.nativeElement) {
      if (this.mouseMoveHandler) {
        this.containerRef.nativeElement.removeEventListener('mousemove', this.mouseMoveHandler);
      }
      if (this.touchStartHandler) {
        this.containerRef.nativeElement.removeEventListener('touchstart', this.touchStartHandler);
      }
      if (this.touchMoveHandler) {
        this.containerRef.nativeElement.removeEventListener('touchmove', this.touchMoveHandler);
      }
    }
    if (this.gl?.canvas && this.gl.canvas instanceof HTMLCanvasElement && this.gl.canvas.parentNode) {
      this.gl.canvas.parentNode.removeChild(this.gl.canvas);
    }
  }
}
