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
import * as THREE from 'three';

function hexToNormalizedRGB(hex: string): [number, number, number] {
  hex = hex.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255
  ];
}

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                  cos(3.0 * tex.x + 5.0 * tex.y) +
                                  0.02 * tOffset) +
                          sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`;

@Component({
  selector: 'ngw-silk',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './silk.component.html',
  styleUrl: './silk.component.css'
})
export class SilkComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() speed = 5;
  @Input() scale = 1;
  @Input() color = '#7B7481';
  @Input() noiseIntensity = 1.5;
  @Input() rotation = 0;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private initialized = false;
  private time = 0;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initSilk();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.initialized || !this.material) {
      return;
    }

    const uniforms = this.material.uniforms as any;

    if (changes['speed']) {
      uniforms.uSpeed.value = this.speed;
    }
    if (changes['scale']) {
      uniforms.uScale.value = this.scale;
    }
    if (changes['color']) {
      uniforms.uColor.value = new THREE.Vector3(...hexToNormalizedRGB(this.color));
    }
    if (changes['noiseIntensity']) {
      uniforms.uNoiseIntensity.value = this.noiseIntensity;
    }
    if (changes['rotation']) {
      uniforms.uRotation.value = this.rotation;
    }
  }

  private initSilk(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    const uniforms = {
      uTime: { value: 0 },
      uSpeed: { value: this.speed },
      uScale: { value: this.scale },
      uNoiseIntensity: { value: this.noiseIntensity },
      uColor: { value: new THREE.Vector3(...hexToNormalizedRGB(this.color)) },
      uRotation: { value: this.rotation }
    };

    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader
    });

    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    const resize = () => {
      if (!container || !this.renderer || !this.mesh) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.renderer.setSize(width, height);
      this.mesh.scale.set(width, height, 1);
    };

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        resize();
      });
      resizeObserver.observe(container);
      this.resizeObserver = resizeObserver;
    } else {
      window.addEventListener('resize', resize);
    }

    resize();

    const animate = (delta: number) => {
      this.animationId = requestAnimationFrame(animate);
      if (this.material) {
        this.time += delta * 0.1;
        (this.material.uniforms as any).uTime.value = this.time;
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      }
    };

    let lastTime = performance.now();
    const loop = () => {
      this.animationId = requestAnimationFrame(loop);
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      animate(delta);
    };
    this.animationId = requestAnimationFrame(loop);
    this.initialized = true;
  }

  private cleanup(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    const container = this.containerRef?.nativeElement;
    if (this.renderer) {
      this.renderer.dispose();
      if (container && this.renderer.domElement && container.contains(this.renderer.domElement)) {
        container.removeChild(this.renderer.domElement);
      }
    }

    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      }
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mesh = null;
    this.material = null;
  }
}

