import {
  Component,
  input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  effect,
  Injector
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \\
  int index = 0;                                            \\
  for (int i = 0; i < 2; i++) {                               \\
     ColorStop currentColor = colors[i];                    \\
     bool isInBetween = currentColor.position <= factor;    \\
     index = int(mix(float(index), float(i), float(isInBetween))); \\
  }                                                         \\
  ColorStop currentColor = colors[index];                   \\
  ColorStop nextColor = colors[index + 1];                  \\
  float range = nextColor.position - currentColor.position; \\
  float lerpFactor = (factor - currentColor.position) / range; \\
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \\
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
}
`;

@Component({
  selector: 'ngw-aurora',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aurora.component.html',
  styleUrl: './aurora.component.css'
})
export class AuroraComponent implements AfterViewInit, OnDestroy {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  colorStops = input<string[]>(['#5227FF', '#7cff67', '#5227FF']);
  amplitude = input(1.0);
  blend = input(0.5);
  time = input<number | undefined>(undefined);
  speed = input(1.0);
  className = input('');
  style = input<Record<string, string>>({});

  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private renderer?: Renderer;
  private program?: Program;
  private mesh?: Mesh;
  private animationFrame?: number;
  private resizeListener?: () => void;
  private startTime = 0;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.startTime = performance.now();
    }

    // Watch for input changes and update uniforms
    effect(() => {
      if (!isPlatformBrowser(this.platformId) || !this.program) return;

      const amplitude = this.amplitude();
      const blend = this.blend();
      const colorStops = this.colorStops();

      if (this.program) {
        this.program.uniforms['uAmplitude'].value = amplitude;
        this.program.uniforms['uBlend'].value = blend;
        const colorStopsArray = colorStops.map(hex => {
          const c = new Color(hex);
          return [c.r, c.g, c.b];
        });
        this.program.uniforms['uColorStops'].value = colorStopsArray;
      }
    }, { injector: this.injector });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.init();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  private init(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    this.renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true
    });
    const gl = this.renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.backgroundColor = 'transparent';

    this.resizeListener = () => this.resize();
    window.addEventListener('resize', this.resizeListener);

    const geometry = new Triangle(gl);
    if (geometry.attributes['uv']) {
      delete geometry.attributes['uv'];
    }

    const colorStops = this.colorStops();
    const colorStopsArray = colorStops.map(hex => {
      const c = new Color(hex);
      return [c.r, c.g, c.b];
    });

    this.program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: this.amplitude() },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [container.offsetWidth, container.offsetHeight] },
        uBlend: { value: this.blend() }
      }
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });
    container.appendChild(gl.canvas);

    this.resize();
    this.animate();
  }

  private resize(): void {
    const container = this.containerRef?.nativeElement;
    if (!container || !this.renderer || !this.program) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    this.renderer.setSize(width, height);
    this.program.uniforms['uResolution'].value = [width, height];
  }

  private animate = (): void => {
    if (!this.renderer || !this.mesh || !this.program) return;

    this.animationFrame = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const elapsed = (currentTime - this.startTime) * 0.01;
    const timeValue = this.time() ?? elapsed;
    const speed = this.speed();

    this.program.uniforms['uTime'].value = timeValue * speed * 0.1;
    this.renderer.render({ scene: this.mesh });
  };

  private cleanup(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }

    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = undefined;
    }

    const container = this.containerRef?.nativeElement;
    if (container && this.renderer?.gl.canvas && this.renderer.gl.canvas.parentNode === container) {
      container.removeChild(this.renderer.gl.canvas);
    }

    if (this.renderer?.gl) {
      this.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
}

