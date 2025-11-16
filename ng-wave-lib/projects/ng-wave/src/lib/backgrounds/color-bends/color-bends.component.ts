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
import * as THREE from 'three';

const MAX_COLORS = 8;

const frag = `
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer; // in NDC [-1,1]
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

    vec3 col = vec3(0.0);
    float a = 1.0;

    if (uColorCount > 0) {
      vec2 s = q;
      vec3 sumCol = vec3(0.0);
      float cover = 0.0;
      for (int i = 0; i < MAX_COLORS; ++i) {
            if (i >= uColorCount) break;
            s -= 0.01;
            vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
            float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
            float kBelow = clamp(uWarpStrength, 0.0, 1.0);
            float kMix = pow(kBelow, 0.3); // strong response across 0..1
            float gain = 1.0 + max(uWarpStrength - 1.0, 0.0); // allow >1 to amplify displacement
            vec2 disp = (r - s) * kBelow;
            vec2 warped = s + disp * gain;
            float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
            float m = mix(m0, m1, kMix);
            float w = 1.0 - exp(-6.0 / exp(6.0 * m));
            sumCol += uColors[i] * w;
            cover = max(cover, w);
      }
      col = clamp(sumCol, 0.0, 1.0);
      a = uTransparent > 0 ? cover : 1.0;
    } else {
        vec2 s = q;
        for (int k = 0; k < 3; ++k) {
            s -= 0.01;
            vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
            float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
            float kBelow = clamp(uWarpStrength, 0.0, 1.0);
            float kMix = pow(kBelow, 0.3);
            float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
            vec2 disp = (r - s) * kBelow;
            vec2 warped = s + disp * gain;
            float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
            float m = mix(m0, m1, kMix);
            col[k] = 1.0 - exp(-6.0 / exp(6.0 * m));
        }
        a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
    }

    if (uNoise > 0.0001) {
      float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
      col += (n - 0.5) * uNoise;
      col = clamp(col, 0.0, 1.0);
    }

    vec3 rgb = (uTransparent > 0) ? col * a : col;
    gl_FragColor = vec4(rgb, a);
}
`;

const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

function hexToVec3(hex: string): THREE.Vector3 {
  const h = hex.replace('#', '').trim();
  const v =
    h.length === 3
      ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  return new THREE.Vector3(v[0] / 255, v[1] / 255, v[2] / 255);
}

@Component({
  selector: 'ngw-color-bends',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-bends.component.html',
  styleUrl: './color-bends.component.css'
})
export class ColorBendsComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() rotation = 45;
  @Input() autoRotate = 0;
  @Input() speed = 0.2;
  @Input() colors: string[] = [];
  @Input() transparent = true;
  @Input() scale = 1;
  @Input() frequency = 1;
  @Input() warpStrength = 1;
  @Input() mouseInfluence = 1;
  @Input() parallax = 0.5;
  @Input() noise = 0.1;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private mesh: THREE.Mesh | null = null;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private clock = new THREE.Clock();
  private rotationRef = 45;
  private autoRotateRef = 0;
  private pointerTarget = new THREE.Vector2(0, 0);
  private pointerCurrent = new THREE.Vector2(0, 0);
  private pointerSmooth = 8;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initColorBends();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.material || !this.renderer) {
      return;
    }

    if (changes['rotation']) {
      this.rotationRef = this.rotation;
    }

    if (changes['autoRotate']) {
      this.autoRotateRef = this.autoRotate;
    }

    if (changes['speed']) {
      this.material.uniforms['uSpeed'].value = this.speed;
    }

    if (changes['scale']) {
      this.material.uniforms['uScale'].value = this.scale;
    }

    if (changes['frequency']) {
      this.material.uniforms['uFrequency'].value = this.frequency;
    }

    if (changes['warpStrength']) {
      this.material.uniforms['uWarpStrength'].value = this.warpStrength;
    }

    if (changes['mouseInfluence']) {
      this.material.uniforms['uMouseInfluence'].value = this.mouseInfluence;
    }

    if (changes['parallax']) {
      this.material.uniforms['uParallax'].value = this.parallax;
    }

    if (changes['noise']) {
      this.material.uniforms['uNoise'].value = this.noise;
    }

    if (changes['colors'] || changes['transparent']) {
      const arr = (this.colors || []).filter(Boolean).slice(0, MAX_COLORS).map(hexToVec3);
      const uColorsArray = this.material.uniforms['uColors'].value as THREE.Vector3[];
      for (let i = 0; i < MAX_COLORS; i++) {
        const vec = uColorsArray[i];
        if (i < arr.length) vec.copy(arr[i]);
        else vec.set(0, 0, 0);
      }
      this.material.uniforms['uColorCount'].value = arr.length;
      this.material.uniforms['uTransparent'].value = this.transparent ? 1 : 0;
      this.renderer.setClearColor(0x000000, this.transparent ? 0 : 1);
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (isPlatformBrowser(this.platformId)) {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', this.handleResize);
      }
    }

    if (this.mesh?.geometry) {
      this.mesh.geometry.dispose();
    }

    if (this.material) {
      this.material.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.containerRef?.nativeElement) {
        try {
          this.containerRef.nativeElement.removeChild(this.renderer.domElement);
        } catch {
          // Already removed
        }
      }
    }
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.containerRef?.nativeElement) {
      return;
    }

    const container = this.containerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
    const y = -(((event.clientY - rect.top) / (rect.height || 1)) * 2 - 1);
    this.pointerTarget.set(x, y);
  }

  private handleResize = (): void => {
    this.setSize();
  };

  private setSize(): void {
    if (!this.containerRef?.nativeElement || !this.renderer || !this.material) {
      return;
    }

    const container = this.containerRef.nativeElement;
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.material.uniforms['uCanvas'].value.set(w, h);
  }

  private initColorBends(): void {
    const container = this.containerRef.nativeElement;
    if (!container) {
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const uColorsArray = Array.from({ length: MAX_COLORS }, () => new THREE.Vector3(0, 0, 0));
    const arr = (this.colors || []).filter(Boolean).slice(0, MAX_COLORS).map(hexToVec3);
    for (let i = 0; i < MAX_COLORS; i++) {
      if (i < arr.length) uColorsArray[i].copy(arr[i]);
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSpeed: { value: this.speed },
        uRot: { value: new THREE.Vector2(1, 0) },
        uColorCount: { value: arr.length },
        uColors: { value: uColorsArray },
        uTransparent: { value: this.transparent ? 1 : 0 },
        uScale: { value: this.scale },
        uFrequency: { value: this.frequency },
        uWarpStrength: { value: this.warpStrength },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uMouseInfluence: { value: this.mouseInfluence },
        uParallax: { value: this.parallax },
        uNoise: { value: this.noise }
      },
      premultipliedAlpha: true,
      transparent: true
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      alpha: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    this.renderer.setClearColor(0x000000, this.transparent ? 0 : 1);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    container.appendChild(this.renderer.domElement);

    this.rotationRef = this.rotation;
    this.autoRotateRef = this.autoRotate;

    this.setSize();

    if (isPlatformBrowser(this.platformId)) {
      if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(this.handleResize);
        this.resizeObserver.observe(container);
      } else if (typeof window !== 'undefined') {
        (window as Window).addEventListener('resize', this.handleResize);
      }
    }

    this.animate();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.material || !this.renderer || !this.scene || !this.camera) {
      return;
    }

    const dt = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;
    this.material.uniforms['uTime'].value = elapsed;

    const deg = (this.rotationRef % 360) + this.autoRotateRef * elapsed;
    const rad = (deg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    this.material.uniforms['uRot'].value.set(c, s);

    const cur = this.pointerCurrent;
    const tgt = this.pointerTarget;
    const amt = Math.min(1, dt * this.pointerSmooth);
    cur.lerp(tgt, amt);
    this.material.uniforms['uPointer'].value.copy(cur);

    this.renderer.render(this.scene, this.camera);
  };
}

