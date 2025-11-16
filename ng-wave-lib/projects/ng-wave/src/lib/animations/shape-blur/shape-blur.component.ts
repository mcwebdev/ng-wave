import { Component, input, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, inject, effect, EffectRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 v_texcoord;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_texcoord = uv;
}
`;

const fragmentShader = /* glsl */ `
varying vec2 v_texcoord;

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;

uniform float u_shapeSize;
uniform float u_roundness;
uniform float u_borderSize;
uniform float u_circleSize;
uniform float u_circleEdge;

#ifndef PI
#define PI 3.1415926535897932384626433832795
#endif
#ifndef TWO_PI
#define TWO_PI 6.2831853071795864769252867665590
#endif

#ifndef VAR
#define VAR 0
#endif

#ifndef FNC_COORD
#define FNC_COORD
vec2 coord(in vec2 p) {
    p = p / u_resolution.xy;
    if (u_resolution.x > u_resolution.y) {
        p.x *= u_resolution.x / u_resolution.y;
        p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0;
    } else {
        p.y *= u_resolution.y / u_resolution.x;
        p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0;
    }
    p -= 0.5;
    p *= vec2(-1.0, 1.0);
    return p;
}
#endif

#define st0 coord(gl_FragCoord.xy)
#define mx coord(u_mouse * u_pixelRatio)

float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}
float sdCircle(in vec2 st, in vec2 center) {
    return length(st - center) * 2.0;
}
float sdPoly(in vec2 p, in float w, in int sides) {
    float a = atan(p.x, p.y) + PI;
    float r = TWO_PI / float(sides);
    float d = cos(floor(0.5 + a / r) * r - a) * length(max(abs(p) * 1.0, 0.0));
    return d * 2.0 - w;
}

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold - afwidth, threshold + afwidth, value);
}
float fill(in float x) { return 1.0 - aastep(0.0, x); }
float fill(float x, float size, float edge) {
    return 1.0 - smoothstep(size - edge, size + edge, x);
}
float stroke(in float d, in float t) { return (1.0 - aastep(t, abs(d))); }
float stroke(float x, float size, float w, float edge) {
    float d = smoothstep(size - edge, size + edge, x + w * 0.5) - smoothstep(size - edge, size + edge, x - w * 0.5);
    return clamp(d, 0.0, 1.0);
}

float strokeAA(float x, float size, float w, float edge) {
    float afwidth = length(vec2(dFdx(x), dFdy(x))) * 0.70710678;
    float d = smoothstep(size - edge - afwidth, size + edge + afwidth, x + w * 0.5)
            - smoothstep(size - edge - afwidth, size + edge + afwidth, x - w * 0.5);
    return clamp(d, 0.0, 1.0);
}

void main() {
    vec2 st = st0 + 0.5;
    vec2 posMouse = mx * vec2(1., -1.) + 0.5;

    float size = u_shapeSize;
    float roundness = u_roundness;
    float borderSize = u_borderSize;
    float circleSize = u_circleSize;
    float circleEdge = u_circleEdge;

    float sdfCircle = fill(
        sdCircle(st, posMouse),
        circleSize,
        circleEdge
    );

    float sdf;
    if (VAR == 0) {
        sdf = sdRoundRect(st, vec2(size), roundness);
        sdf = strokeAA(sdf, 0.0, borderSize, sdfCircle) * 4.0;
    } else if (VAR == 1) {
        sdf = sdCircle(st, vec2(0.5));
        sdf = fill(sdf, 0.6, sdfCircle) * 1.2;
    } else if (VAR == 2) {
        sdf = sdCircle(st, vec2(0.5));
        sdf = strokeAA(sdf, 0.58, 0.02, sdfCircle) * 4.0;
    } else if (VAR == 3) {
        sdf = sdPoly(st - vec2(0.5, 0.45), 0.3, 3);
        sdf = fill(sdf, 0.05, sdfCircle) * 1.4;
    }

    vec3 color = vec3(1.0);
    float alpha = sdf;
    gl_FragColor = vec4(color.rgb, alpha);
}
`;

@Component({
  selector: 'ngw-shape-blur',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shape-blur.component.html',
  styleUrl: './shape-blur.component.css'
})
export class ShapeBlurComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mount', { static: false }) mountRef!: ElementRef<HTMLElement>;

  readonly className = input<string>('');
  readonly variation = input<number>(0);
  readonly pixelRatioProp = input<number>(2);
  readonly shapeSize = input<number>(1.2);
  readonly roundness = input<number>(0.4);
  readonly borderSize = input<number>(0.05);
  readonly circleSize = input<number>(0.3);
  readonly circleEdge = input<number>(0.5);

  private readonly platformId = inject(PLATFORM_ID);
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private quad: THREE.Mesh | null = null;
  private animationFrameId: number | null = null;
  private vMouse = new THREE.Vector2();
  private vMouseDamp = new THREE.Vector2();
  private vResolution = new THREE.Vector2();
  private time = 0;
  private lastTime = 0;
  private resizeObserver: ResizeObserver | null = null;
  private effectCleanup: EffectRef | null = null;
  private onPointerMoveHandler: ((e: MouseEvent) => void) | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const cleanup = effect(() => {
        this.variation();
        this.pixelRatioProp();
        this.shapeSize();
        this.roundness();
        this.borderSize();
        this.circleSize();
        this.circleEdge();
        if (this.material) {
          this.updateMaterial();
        }
      });
      this.effectCleanup = cleanup;
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.mountRef?.nativeElement) return;
    this.init();
  }

  private init(): void {
    if (!isPlatformBrowser(this.platformId) || !this.mountRef?.nativeElement) return;

    const mount = this.mountRef.nativeElement;
    let w = 1;
    let h = 1;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera();
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    mount.appendChild(this.renderer.domElement);

    const geo = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_mouse: { value: this.vMouseDamp },
        u_resolution: { value: this.vResolution },
        u_pixelRatio: { value: this.pixelRatioProp() },
        u_shapeSize: { value: this.shapeSize() },
        u_roundness: { value: this.roundness() },
        u_borderSize: { value: this.borderSize() },
        u_circleSize: { value: this.circleSize() },
        u_circleEdge: { value: this.circleEdge() }
      },
      defines: { VAR: this.variation() },
      transparent: true
    });

    this.quad = new THREE.Mesh(geo, this.material);
    this.scene.add(this.quad);

    this.onPointerMoveHandler = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      this.vMouse.set(e.clientX - rect.left, e.clientY - rect.top);
    };

    document.addEventListener('mousemove', this.onPointerMoveHandler);
    document.addEventListener('pointermove', this.onPointerMoveHandler);

    const resize = () => {
      const container = this.mountRef?.nativeElement;
      if (!container) return;
      w = container.clientWidth;
      h = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);

      if (this.renderer) {
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(dpr);
      }

      if (this.camera) {
        this.camera.left = -w / 2;
        this.camera.right = w / 2;
        this.camera.top = h / 2;
        this.camera.bottom = -h / 2;
        this.camera.updateProjectionMatrix();
      }

      if (this.quad) {
        this.quad.scale.set(w, h, 1);
      }
      this.vResolution.set(w, h).multiplyScalar(dpr);
      if (this.material) {
        this.material.uniforms['u_pixelRatio'].value = dpr;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    this.resizeObserver = new ResizeObserver(() => resize());
    if (this.mountRef?.nativeElement) {
      this.resizeObserver.observe(this.mountRef.nativeElement);
    }

    const update = () => {
      this.time = performance.now() * 0.001;
      const dt = this.time - this.lastTime;
      this.lastTime = this.time;

      ['x', 'y'].forEach(k => {
        (this.vMouseDamp as any)[k] = THREE.MathUtils.damp((this.vMouseDamp as any)[k], (this.vMouse as any)[k], 8, dt);
      });

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      this.animationFrameId = requestAnimationFrame(update);
    };
    update();
  }

  private updateMaterial(): void {
    if (!this.material) return;
    this.material.uniforms['u_pixelRatio'].value = this.pixelRatioProp();
    this.material.uniforms['u_shapeSize'].value = this.shapeSize();
    this.material.uniforms['u_roundness'].value = this.roundness();
    this.material.uniforms['u_borderSize'].value = this.borderSize();
    this.material.uniforms['u_circleSize'].value = this.circleSize();
    this.material.uniforms['u_circleEdge'].value = this.circleEdge();
    this.material.defines = { VAR: this.variation() };
    this.material.needsUpdate = true;
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.onPointerMoveHandler) {
      document.removeEventListener('mousemove', this.onPointerMoveHandler);
      document.removeEventListener('pointermove', this.onPointerMoveHandler);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.mountRef?.nativeElement && this.renderer?.domElement) {
      this.mountRef.nativeElement.removeChild(this.renderer.domElement);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.material) {
      this.material.dispose();
    }
    if (this.effectCleanup) {
      this.effectCleanup.destroy();
    }
  }
}

