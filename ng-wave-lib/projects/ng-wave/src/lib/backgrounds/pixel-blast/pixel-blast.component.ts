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

const SHAPE_MAP: Record<string, number> = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3
};

const VERTEX_SRC = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SRC = `
precision highp float;

uniform vec3  uColor;
uniform vec2  uResolution;
uniform float uTime;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uPixelJitter;
uniform int   uEnableRipples;
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;
uniform float uEdgeFade;

uniform int   uShapeType;
const int SHAPE_SQUARE   = 0;
const int SHAPE_CIRCLE   = 1;
const int SHAPE_TRIANGLE = 2;
const int SHAPE_DIAMOND  = 3;

const int   MAX_CLICKS = 10;

uniform vec2  uClickPos  [MAX_CLICKS];
uniform float uClickTimes[MAX_CLICKS];

out vec4 fragColor;

float Bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2. + a.y * a.y * .75);
}
#define Bayer4(a) (Bayer2(.5*(a))*0.25 + Bayer2(a))
#define Bayer8(a) (Bayer4(.5*(a))*0.25 + Bayer2(a))

#define FBM_OCTAVES     5
#define FBM_LACUNARITY  1.25
#define FBM_GAIN        1.0

float hash11(float n){ return fract(sin(n)*43758.5453); }

float vnoise(vec3 p){
  vec3 ip = floor(p);
  vec3 fp = fract(p);
  float n000 = hash11(dot(ip + vec3(0.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n100 = hash11(dot(ip + vec3(1.0,0.0,0.0), vec3(1.0,57.0,113.0)));
  float n010 = hash11(dot(ip + vec3(0.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n110 = hash11(dot(ip + vec3(1.0,1.0,0.0), vec3(1.0,57.0,113.0)));
  float n001 = hash11(dot(ip + vec3(0.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n101 = hash11(dot(ip + vec3(1.0,0.0,1.0), vec3(1.0,57.0,113.0)));
  float n011 = hash11(dot(ip + vec3(0.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  float n111 = hash11(dot(ip + vec3(1.0,1.0,1.0), vec3(1.0,57.0,113.0)));
  vec3 w = fp*fp*fp*(fp*(fp*6.0-15.0)+10.0);
  float x00 = mix(n000, n100, w.x);
  float x10 = mix(n010, n110, w.x);
  float x01 = mix(n001, n101, w.x);
  float x11 = mix(n011, n111, w.x);
  float y0  = mix(x00, x10, w.y);
  float y1  = mix(x01, x11, w.y);
  return mix(y0, y1, w.z) * 2.0 - 1.0;
}

float fbm2(vec2 uv, float t){
  vec3 p = vec3(uv * uScale, t);
  float amp = 1.0;
  float freq = 1.0;
  float sum = 1.0;
  for (int i = 0; i < FBM_OCTAVES; ++i){
    sum  += amp * vnoise(p * freq);
    freq *= FBM_LACUNARITY;
    amp  *= FBM_GAIN;
  }
  return sum * 0.5 + 0.5;
}

float maskCircle(vec2 p, float cov){
  float r = sqrt(cov) * .25;
  float d = length(p - 0.5) - r;
  float aa = 0.5 * fwidth(d);
  return cov * (1.0 - smoothstep(-aa, aa, d * 2.0));
}

float maskTriangle(vec2 p, vec2 id, float cov){
  bool flip = mod(id.x + id.y, 2.0) > 0.5;
  if (flip) p.x = 1.0 - p.x;
  float r = sqrt(cov);
  float d  = p.y - r*(1.0 - p.x);
  float aa = fwidth(d);
  return cov * clamp(0.5 - d/aa, 0.0, 1.0);
}

float maskDiamond(vec2 p, float cov){
  float r = sqrt(cov) * 0.564;
  return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
}

void main(){
  float pixelSize = uPixelSize;
  vec2 fragCoord = gl_FragCoord.xy - uResolution * .5;
  float aspectRatio = uResolution.x / uResolution.y;

  vec2 pixelId = floor(fragCoord / pixelSize);
  vec2 pixelUV = fract(fragCoord / pixelSize);

  float cellPixelSize = 8.0 * pixelSize;
  vec2 cellId = floor(fragCoord / cellPixelSize);
  vec2 cellCoord = cellId * cellPixelSize;
  vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

  float base = fbm2(uv, uTime * 0.05);
  base = base * 0.5 - 0.65;

  float feed = base + (uDensity - 0.5) * 0.3;

  float speed     = uRippleSpeed;
  float thickness = uRippleThickness;
  const float dampT     = 1.0;
  const float dampR     = 10.0;

  if (uEnableRipples == 1) {
    for (int i = 0; i < MAX_CLICKS; ++i){
      vec2 pos = uClickPos[i];
      if (pos.x < 0.0) continue;
      float cellPixelSize = 8.0 * pixelSize;
      vec2 cuv = (((pos - uResolution * .5 - cellPixelSize * .5) / (uResolution))) * vec2(aspectRatio, 1.0);
      float t = max(uTime - uClickTimes[i], 0.0);
      float r = distance(uv, cuv);
      float waveR = speed * t;
      float ring  = exp(-pow((r - waveR) / thickness, 2.0));
      float atten = exp(-dampT * t) * exp(-dampR * r);
      feed = max(feed, ring * atten * uRippleIntensity);
    }
  }

  float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
  float bw = step(0.5, feed + bayer);

  float h = fract(sin(dot(floor(fragCoord / uPixelSize), vec2(127.1, 311.7))) * 43758.5453);
  float jitterScale = 1.0 + (h - 0.5) * uPixelJitter;
  float coverage = bw * jitterScale;
  float M;
  if      (uShapeType == SHAPE_CIRCLE)   M = maskCircle (pixelUV, coverage);
  else if (uShapeType == SHAPE_TRIANGLE) M = maskTriangle(pixelUV, pixelId, coverage);
  else if (uShapeType == SHAPE_DIAMOND)  M = maskDiamond(pixelUV, coverage);
  else                                   M = coverage;

  if (uEdgeFade > 0.0) {
    vec2 norm = gl_FragCoord.xy / uResolution;
    float edge = min(min(norm.x, norm.y), min(1.0 - norm.x, 1.0 - norm.y));
    float fade = smoothstep(0.0, uEdgeFade, edge);
    M *= fade;
  }

  vec3 color = uColor;
  fragColor = vec4(color, M);
}
`;

@Component({
  selector: 'ngw-pixel-blast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pixel-blast.component.html',
  styleUrl: './pixel-blast.component.css'
})
export class PixelBlastComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() variant: 'square' | 'circle' | 'triangle' | 'diamond' = 'square';
  @Input() pixelSize = 3;
  @Input() color = '#B19EEF';
  @Input() className = '';
  @Input() patternScale = 2;
  @Input() patternDensity = 1;
  @Input() pixelSizeJitter = 0;
  @Input() enableRipples = true;
  @Input() rippleIntensityScale = 1;
  @Input() rippleThickness = 0.1;
  @Input() rippleSpeed = 0.3;
  @Input() autoPauseOffscreen = true;
  @Input() speed = 0.5;
  @Input() transparent = true;
  @Input() edgeFade = 0.5;

  private readonly platformId = inject(PLATFORM_ID);
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private quad: THREE.Mesh | null = null;
  private clock: THREE.Clock | null = null;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private pointerDownHandler: ((e: PointerEvent) => void) | null = null;
  private clickIx = 0;
  private timeOffset = 0;
  private isVisible = true;
  private initialized = false;

  private readonly MAX_CLICKS = 10;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initPixelBlast();
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

    if (changes['variant']) {
      uniforms.uShapeType.value = SHAPE_MAP[this.variant] ?? 0;
    }
    if (changes['pixelSize'] && this.renderer) {
      uniforms.uPixelSize.value = this.pixelSize * this.renderer.getPixelRatio();
    }
    if (changes['color']) {
      uniforms.uColor.value = new THREE.Color(this.color);
    }
    if (changes['patternScale']) {
      uniforms.uScale.value = this.patternScale;
    }
    if (changes['patternDensity']) {
      uniforms.uDensity.value = this.patternDensity;
    }
    if (changes['pixelSizeJitter']) {
      uniforms.uPixelJitter.value = this.pixelSizeJitter;
    }
    if (changes['enableRipples']) {
      uniforms.uEnableRipples.value = this.enableRipples ? 1 : 0;
    }
    if (changes['rippleIntensityScale']) {
      uniforms.uRippleIntensity.value = this.rippleIntensityScale;
    }
    if (changes['rippleThickness']) {
      uniforms.uRippleThickness.value = this.rippleThickness;
    }
    if (changes['rippleSpeed']) {
      uniforms.uRippleSpeed.value = this.rippleSpeed;
    }
    if (changes['edgeFade']) {
      uniforms.uEdgeFade.value = this.edgeFade;
    }
    if (changes['transparent'] && this.renderer) {
      if (this.transparent) {
        this.renderer.setClearAlpha(0);
      } else {
        this.renderer.setClearColor(0x000000, 1);
      }
    }
  }

  private initPixelBlast(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer = renderer;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);
    if (this.transparent) {
      renderer.setClearAlpha(0);
    } else {
      renderer.setClearColor(0x000000, 1);
    }

    const uniforms = {
      uResolution: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(this.color) },
      uClickPos: {
        value: Array.from({ length: this.MAX_CLICKS }, () => new THREE.Vector2(-1, -1))
      },
      uClickTimes: { value: new Float32Array(this.MAX_CLICKS) },
      uShapeType: { value: SHAPE_MAP[this.variant] ?? 0 },
      uPixelSize: { value: this.pixelSize * renderer.getPixelRatio() },
      uScale: { value: this.patternScale },
      uDensity: { value: this.patternDensity },
      uPixelJitter: { value: this.pixelSizeJitter },
      uEnableRipples: { value: this.enableRipples ? 1 : 0 },
      uRippleSpeed: { value: this.rippleSpeed },
      uRippleThickness: { value: this.rippleThickness },
      uRippleIntensity: { value: this.rippleIntensityScale },
      uEdgeFade: { value: this.edgeFade }
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SRC,
      fragmentShader: FRAGMENT_SRC,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      glslVersion: THREE.GLSL3
    });

    const quadGeom = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(quadGeom, this.material);
    this.scene.add(this.quad);

    this.clock = new THREE.Clock();
    const setSize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(renderer.domElement.width, renderer.domElement.height);
      uniforms.uPixelSize.value = this.pixelSize * renderer.getPixelRatio();
    };
    setSize();

    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    this.resizeObserver = ro;

    const randomFloat = () => {
      if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
        const u32 = new Uint32Array(1);
        window.crypto.getRandomValues(u32);
        return u32[0] / 0xffffffff;
      }
      return Math.random();
    };
    this.timeOffset = randomFloat() * 1000;

    const mapToPixels = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const scaleX = renderer.domElement.width / rect.width;
      const scaleY = renderer.domElement.height / rect.height;
      const fx = (e.clientX - rect.left) * scaleX;
      const fy = (rect.height - (e.clientY - rect.top)) * scaleY;
      return { fx, fy, w: renderer.domElement.width, h: renderer.domElement.height };
    };

    const onPointerDown = (e: PointerEvent) => {
      const { fx, fy } = mapToPixels(e);
      const ix = this.clickIx;
      (uniforms.uClickPos.value as THREE.Vector2[])[ix].set(fx, fy);
      (uniforms.uClickTimes.value as Float32Array)[ix] = uniforms.uTime.value;
      this.clickIx = (ix + 1) % this.MAX_CLICKS;
    };
    this.pointerDownHandler = onPointerDown;
    renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true });

    if (this.autoPauseOffscreen) {
      const io = new IntersectionObserver(
        entries => {
          this.isVisible = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.01 }
      );
      io.observe(container);
      this.intersectionObserver = io;
    }

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (this.autoPauseOffscreen && !this.isVisible) {
        return;
      }
      if (this.clock && this.material) {
        const uniforms = this.material.uniforms as any;
        uniforms.uTime.value = this.timeOffset + this.clock.getElapsedTime() * this.speed;
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      }
    };
    this.animationId = requestAnimationFrame(animate);
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

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    const container = this.containerRef?.nativeElement;
    if (this.renderer && this.pointerDownHandler) {
      this.renderer.domElement.removeEventListener('pointerdown', this.pointerDownHandler);
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (container && this.renderer.domElement && container.contains(this.renderer.domElement)) {
        container.removeChild(this.renderer.domElement);
      }
    }

    if (this.quad) {
      if (this.quad.geometry) this.quad.geometry.dispose();
      if (this.quad.material instanceof THREE.Material) {
        this.quad.material.dispose();
      }
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.material = null;
    this.quad = null;
    this.clock = null;
  }
}

