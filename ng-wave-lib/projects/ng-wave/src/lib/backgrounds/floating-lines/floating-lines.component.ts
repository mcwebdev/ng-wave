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
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  Mesh,
  ShaderMaterial,
  Vector3,
  Vector2,
  Clock
} from 'three';
import { WaveType, WavePosition } from '../../interfaces/floating-lines.interface';

const MAX_GRADIENT_STOPS = 8;

const vertexShader = `
precision highp float;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3  iResolution;
uniform float animationSpeed;

uniform bool enableTop;
uniform bool enableMiddle;
uniform bool enableBottom;

uniform int topLineCount;
uniform int middleLineCount;
uniform int bottomLineCount;

uniform float topLineDistance;
uniform float middleLineDistance;
uniform float bottomLineDistance;

uniform vec3 topWavePosition;
uniform vec3 middleWavePosition;
uniform vec3 bottomWavePosition;

uniform vec2 iMouse;
uniform bool interactive;
uniform float bendRadius;
uniform float bendStrength;
uniform float bendInfluence;

uniform bool parallax;
uniform float parallaxStrength;
uniform vec2 parallaxOffset;

uniform vec3 lineGradient[8];
uniform int lineGradientCount;

const vec3 BLACK = vec3(0.0);
const vec3 PINK  = vec3(233.0, 71.0, 245.0) / 255.0;
const vec3 BLUE  = vec3(47.0,  75.0, 162.0) / 255.0;

mat2 rotate(float r) {
  return mat2(cos(r), sin(r), -sin(r), cos(r));
}

vec3 background_color(vec2 uv) {
  vec3 col = vec3(0.0);

  float y = sin(uv.x - 0.2) * 0.3 - 0.1;
  float m = uv.y - y;

  col += mix(BLUE, BLACK, smoothstep(0.0, 1.0, abs(m)));
  col += mix(PINK, BLACK, smoothstep(0.0, 1.0, abs(m - 0.8)));
  return col * 0.5;
}

vec3 getLineColor(float t, vec3 baseColor) {
  if (lineGradientCount <= 0) {
    return baseColor;
  }

  vec3 gradientColor;
  
  if (lineGradientCount == 1) {
    gradientColor = lineGradient[0];
  } else {
    float clampedT = clamp(t, 0.0, 0.9999);
    float scaled = clampedT * float(lineGradientCount - 1);
    int idx = int(floor(scaled));
    float f = fract(scaled);
    int idx2 = min(idx + 1, lineGradientCount - 1);

    vec3 c1 = lineGradient[idx];
    vec3 c2 = lineGradient[idx2];
    
    gradientColor = mix(c1, c2, f);
  }
  
  return gradientColor * 0.5;
}

float wave(vec2 uv, float offset, vec2 screenUv, vec2 mouseUv, bool shouldBend) {
  float time = iTime * animationSpeed;

  float x_offset   = offset;
  float x_movement = time * 0.1;
  float amp        = sin(offset + time * 0.2) * 0.3;
  float y          = sin(uv.x + x_offset + x_movement) * amp;

  if (shouldBend) {
    vec2 d = screenUv - mouseUv;
    float influence = exp(-dot(d, d) * bendRadius);
    float bendOffset = (mouseUv.y - screenUv.y) * influence * bendStrength * bendInfluence;
    y += bendOffset;
  }

  float m = uv.y - y;
  return 0.0175 / max(abs(m) + 0.01, 1e-3) + 0.01;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 baseUv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  baseUv.y *= -1.0;
  
  if (parallax) {
    baseUv += parallaxOffset;
  }

  vec3 col = vec3(0.0);

  vec3 b = lineGradientCount > 0 ? vec3(0.0) : background_color(baseUv);

  vec2 mouseUv = vec2(0.0);
  if (interactive) {
    mouseUv = (2.0 * iMouse - iResolution.xy) / iResolution.y;
    mouseUv.y *= -1.0;
  }
  
  if (enableBottom) {
    for (int i = 0; i < bottomLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(bottomLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = bottomWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(bottomLineDistance * fi + bottomWavePosition.x, bottomWavePosition.y),
        1.5 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.2;
    }
  }

  if (enableMiddle) {
    for (int i = 0; i < middleLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(middleLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = middleWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      col += lineCol * wave(
        ruv + vec2(middleLineDistance * fi + middleWavePosition.x, middleWavePosition.y),
        2.0 + 0.15 * fi,
        baseUv,
        mouseUv,
        interactive
      );
    }
  }

  if (enableTop) {
    for (int i = 0; i < topLineCount; ++i) {
      float fi = float(i);
      float t = fi / max(float(topLineCount - 1), 1.0);
      vec3 lineCol = getLineColor(t, b);
      
      float angle = topWavePosition.z * log(length(baseUv) + 1.0);
      vec2 ruv = baseUv * rotate(angle);
      ruv.x *= -1.0;
      col += lineCol * wave(
        ruv + vec2(topLineDistance * fi + topWavePosition.x, topWavePosition.y),
        1.0 + 0.2 * fi,
        baseUv,
        mouseUv,
        interactive
      ) * 0.1;
    }
  }

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 color = vec4(0.0);
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}
`;

function hexToVec3(hex: string): Vector3 {
  let value = hex.trim();

  if (value.startsWith('#')) {
    value = value.slice(1);
  }

  let r = 255;
  let g = 255;
  let b = 255;

  if (value.length === 3) {
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  }

  return new Vector3(r / 255, g / 255, b / 255);
}

@Component({
  selector: 'ngw-floating-lines',
  standalone: true,
  imports: [],
  templateUrl: './floating-lines.component.html',
  styleUrl: './floating-lines.component.css'
})
export class FloatingLinesComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() linesGradient?: string[];
  @Input() enabledWaves: WaveType[] = ['top', 'middle', 'bottom'];
  @Input() lineCount: number | number[] = [6];
  @Input() lineDistance: number | number[] = [5];
  @Input() topWavePosition?: WavePosition;
  @Input() middleWavePosition?: WavePosition;
  @Input() bottomWavePosition: WavePosition = { x: 2.0, y: -0.7, rotate: -1 };
  @Input() animationSpeed = 1;
  @Input() interactive = true;
  @Input() bendRadius = 5.0;
  @Input() bendStrength = -0.5;
  @Input() mouseDamping = 0.05;
  @Input() parallax = true;
  @Input() parallaxStrength = 0.2;
  @Input() mixBlendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity' = 'screen';

  private readonly platformId = inject(PLATFORM_ID);
  private scene?: Scene;
  private camera?: OrthographicCamera;
  private renderer?: WebGLRenderer;
  private material?: ShaderMaterial;
  private uniforms?: any;
  private geometry?: PlaneGeometry;
  private mesh?: Mesh;
  private clock?: Clock;
  private resizeObserver?: ResizeObserver;
  private rafId?: number;
  private targetMouse = new Vector2(-1000, -1000);
  private currentMouse = new Vector2(-1000, -1000);
  private targetInfluence = 0;
  private currentInfluence = 0;
  private targetParallax = new Vector2(0, 0);
  private currentParallax = new Vector2(0, 0);
  private handlePointerMove?: (event: PointerEvent) => void;
  private handlePointerLeave?: () => void;
  private initialized = false;

  private getLineCount(waveType: WaveType): number {
    if (typeof this.lineCount === 'number') return this.lineCount;
    if (!this.enabledWaves.includes(waveType)) return 0;
    const index = this.enabledWaves.indexOf(waveType);
    return (this.lineCount as number[])[index] ?? 6;
  }

  private getLineDistance(waveType: WaveType): number {
    if (typeof this.lineDistance === 'number') return this.lineDistance;
    if (!this.enabledWaves.includes(waveType)) return 0.1;
    const index = this.enabledWaves.indexOf(waveType);
    return (this.lineDistance as number[])[index] ?? 0.1;
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initThree();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized || !this.uniforms) {
      return;
    }

    // Update uniforms when inputs change
    if (changes['animationSpeed']) {
      this.uniforms.animationSpeed.value = this.animationSpeed;
    }

    if (changes['interactive']) {
      this.uniforms.interactive.value = this.interactive;
    }

    if (changes['parallax']) {
      this.uniforms.parallax.value = this.parallax;
    }

    if (changes['parallaxStrength']) {
      this.uniforms.parallaxStrength.value = this.parallaxStrength;
    }

    if (changes['bendRadius']) {
      this.uniforms.bendRadius.value = this.bendRadius;
    }

    if (changes['bendStrength']) {
      this.uniforms.bendStrength.value = this.bendStrength;
    }

    if (changes['enabledWaves'] || changes['lineCount'] || changes['lineDistance']) {
      const topLineCount = this.enabledWaves.includes('top') ? this.getLineCount('top') : 0;
      const middleLineCount = this.enabledWaves.includes('middle') ? this.getLineCount('middle') : 0;
      const bottomLineCount = this.enabledWaves.includes('bottom') ? this.getLineCount('bottom') : 0;

      const topLineDistance = this.enabledWaves.includes('top') ? this.getLineDistance('top') * 0.01 : 0.01;
      const middleLineDistance = this.enabledWaves.includes('middle') ? this.getLineDistance('middle') * 0.01 : 0.01;
      const bottomLineDistance = this.enabledWaves.includes('bottom') ? this.getLineDistance('bottom') * 0.01 : 0.01;

      this.uniforms.enableTop.value = this.enabledWaves.includes('top');
      this.uniforms.enableMiddle.value = this.enabledWaves.includes('middle');
      this.uniforms.enableBottom.value = this.enabledWaves.includes('bottom');

      this.uniforms.topLineCount.value = topLineCount;
      this.uniforms.middleLineCount.value = middleLineCount;
      this.uniforms.bottomLineCount.value = bottomLineCount;

      this.uniforms.topLineDistance.value = topLineDistance;
      this.uniforms.middleLineDistance.value = middleLineDistance;
      this.uniforms.bottomLineDistance.value = bottomLineDistance;
    }

    if (changes['topWavePosition'] && this.topWavePosition) {
      this.uniforms.topWavePosition.value.set(
        this.topWavePosition.x ?? 10.0,
        this.topWavePosition.y ?? 0.5,
        this.topWavePosition.rotate ?? -0.4
      );
    }

    if (changes['middleWavePosition'] && this.middleWavePosition) {
      this.uniforms.middleWavePosition.value.set(
        this.middleWavePosition.x ?? 5.0,
        this.middleWavePosition.y ?? 0.0,
        this.middleWavePosition.rotate ?? 0.2
      );
    }

    if (changes['bottomWavePosition'] && this.bottomWavePosition) {
      this.uniforms.bottomWavePosition.value.set(
        this.bottomWavePosition.x ?? 2.0,
        this.bottomWavePosition.y ?? -0.7,
        this.bottomWavePosition.rotate ?? 0.4
      );
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private initThree(): void {
    if (!this.containerRef?.nativeElement || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const container = this.containerRef.nativeElement;

    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.camera.position.z = 1;

    this.renderer = new WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    const topLineCount = this.enabledWaves.includes('top') ? this.getLineCount('top') : 0;
    const middleLineCount = this.enabledWaves.includes('middle') ? this.getLineCount('middle') : 0;
    const bottomLineCount = this.enabledWaves.includes('bottom') ? this.getLineCount('bottom') : 0;

    const topLineDistance = this.enabledWaves.includes('top') ? this.getLineDistance('top') * 0.01 : 0.01;
    const middleLineDistance = this.enabledWaves.includes('middle') ? this.getLineDistance('middle') * 0.01 : 0.01;
    const bottomLineDistance = this.enabledWaves.includes('bottom') ? this.getLineDistance('bottom') * 0.01 : 0.01;

    this.uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new Vector3(1, 1, 1) },
      animationSpeed: { value: this.animationSpeed },

      enableTop: { value: this.enabledWaves.includes('top') },
      enableMiddle: { value: this.enabledWaves.includes('middle') },
      enableBottom: { value: this.enabledWaves.includes('bottom') },

      topLineCount: { value: topLineCount },
      middleLineCount: { value: middleLineCount },
      bottomLineCount: { value: bottomLineCount },

      topLineDistance: { value: topLineDistance },
      middleLineDistance: { value: middleLineDistance },
      bottomLineDistance: { value: bottomLineDistance },

      topWavePosition: {
        value: new Vector3(
          this.topWavePosition?.x ?? 10.0,
          this.topWavePosition?.y ?? 0.5,
          this.topWavePosition?.rotate ?? -0.4
        )
      },
      middleWavePosition: {
        value: new Vector3(
          this.middleWavePosition?.x ?? 5.0,
          this.middleWavePosition?.y ?? 0.0,
          this.middleWavePosition?.rotate ?? 0.2
        )
      },
      bottomWavePosition: {
        value: new Vector3(
          this.bottomWavePosition.x,
          this.bottomWavePosition.y,
          this.bottomWavePosition.rotate
        )
      },

      iMouse: { value: new Vector2(-1000, -1000) },
      interactive: { value: this.interactive },
      bendRadius: { value: this.bendRadius },
      bendStrength: { value: this.bendStrength },
      bendInfluence: { value: 0 },

      parallax: { value: this.parallax },
      parallaxStrength: { value: this.parallaxStrength },
      parallaxOffset: { value: new Vector2(0, 0) },

      lineGradient: {
        value: Array.from({ length: MAX_GRADIENT_STOPS }, () => new Vector3(1, 1, 1))
      },
      lineGradientCount: { value: 0 }
    };

    if (this.linesGradient && this.linesGradient.length > 0) {
      const stops = this.linesGradient.slice(0, MAX_GRADIENT_STOPS);
      this.uniforms.lineGradientCount.value = stops.length;

      stops.forEach((hex, i) => {
        const color = hexToVec3(hex);
        this.uniforms.lineGradient.value[i].set(color.x, color.y, color.z);
      });
    }

    this.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader
    });

    this.geometry = new PlaneGeometry(2, 2);
    this.mesh = new Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.clock = new Clock();

    const setSize = () => {
      if (!this.renderer || !container) return;
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;

      this.renderer.setSize(width, height, false);

      const canvasWidth = this.renderer.domElement.width;
      const canvasHeight = this.renderer.domElement.height;
      this.uniforms.iResolution.value.set(canvasWidth, canvasHeight, 1);
    };

    setSize();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(setSize);
      this.resizeObserver.observe(container);
    }

    this.handlePointerMove = (event: PointerEvent) => {
      if (!this.renderer) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dpr = this.renderer.getPixelRatio();

      this.targetMouse.set(x * dpr, (rect.height - y) * dpr);
      this.targetInfluence = 1.0;

      if (this.parallax) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const offsetX = (x - centerX) / rect.width;
        const offsetY = -(y - centerY) / rect.height;
        this.targetParallax.set(offsetX * this.parallaxStrength, offsetY * this.parallaxStrength);
      }
    };

    this.handlePointerLeave = () => {
      this.targetInfluence = 0.0;
    };

    if (this.interactive && this.renderer && this.handlePointerMove && this.handlePointerLeave) {
      this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
      this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    }

    const renderLoop = () => {
      if (!this.renderer || !this.scene || !this.camera || !this.clock || !this.uniforms) {
        return;
      }

      this.uniforms.iTime.value = this.clock.getElapsedTime();

      if (this.interactive && this.uniforms) {
        // Use current input value (reactive)
        const currentMouseDamping = this.mouseDamping;
        this.currentMouse.lerp(this.targetMouse, currentMouseDamping);
        this.uniforms.iMouse.value.copy(this.currentMouse);

        this.currentInfluence += (this.targetInfluence - this.currentInfluence) * currentMouseDamping;
        this.uniforms.bendInfluence.value = this.currentInfluence;
      }

      if (this.parallax && this.uniforms) {
        // Use current input value (reactive)
        const currentMouseDamping = this.mouseDamping;
        this.currentParallax.lerp(this.targetParallax, currentMouseDamping);
        this.uniforms.parallaxOffset.value.copy(this.currentParallax);
      }

      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    this.initialized = true;
  }

  private cleanup(): void {
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
    }

    if (this.resizeObserver && this.containerRef?.nativeElement) {
      this.resizeObserver.disconnect();
    }

    if (this.renderer) {
      const domElement = this.renderer.domElement;
      if (this.interactive && this.handlePointerMove && this.handlePointerLeave) {
        domElement.removeEventListener('pointermove', this.handlePointerMove);
        domElement.removeEventListener('pointerleave', this.handlePointerLeave);
      }

      if (domElement.parentElement) {
        domElement.parentElement.removeChild(domElement);
      }
    }

    if (this.geometry) {
      this.geometry.dispose();
    }

    if (this.material) {
      this.material.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

