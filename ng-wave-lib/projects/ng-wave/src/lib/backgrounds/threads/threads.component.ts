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
import { Renderer, Program, Mesh, Triangle, Color } from 'ogl';

@Component({
  selector: 'ngw-threads',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './threads.component.html',
  styleUrl: './threads.component.css'
})
export class ThreadsComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() color: [number, number, number] = [1, 1, 1];
  @Input() amplitude = 1;
  @Input() distance = 0;
  @Input() enableMouseInteraction = false;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private geometry: Triangle | null = null;
  private animationId: number | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private mouseLeaveHandler: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private currentMouse: [number, number] = [0.5, 0.5];
  private targetMouse: [number, number] = [0.5, 0.5];
  private initialized = false;

  private readonly vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

  private readonly fragmentShader = `
precision highp float;

uniform float iTime;
uniform vec3 iResolution;
uniform vec3 uColor;
uniform float uAmplitude;
uniform float uDistance;
uniform vec2 uMouse;

#define PI 3.1415926538

const int u_line_count = 40;
const float u_line_width = 7.0;
const float u_line_blur = 10.0;

float Perlin2D(vec2 P) {
    vec2 Pi = floor(P);
    vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
    vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
    Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
    Pt += vec2(26.0, 161.0).xyxy;
    Pt *= Pt;
    Pt = Pt.xzxz * Pt.yyww;
    vec4 hash_x = fract(Pt * (1.0 / 951.135664));
    vec4 hash_y = fract(Pt * (1.0 / 642.949883));
    vec4 grad_x = hash_x - 0.49999;
    vec4 grad_y = hash_y - 0.49999;
    vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y)
        * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
    grad_results *= 1.4142135623730950;
    vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy
               * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
    vec4 blend2 = vec4(blend, vec2(1.0 - blend));
    return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

float pixel(float count, vec2 resolution) {
    return (1.0 / max(resolution.x, resolution.y)) * count;
}

float lineFn(vec2 st, float width, float perc, float offset, vec2 mouse, float time, float amplitude, float distance) {
    float split_offset = (perc * 0.4);
    float split_point = 0.1 + split_offset;

    float amplitude_normal = smoothstep(split_point, 0.7, st.x);
    float amplitude_strength = 0.5;
    float finalAmplitude = amplitude_normal * amplitude_strength
                           * amplitude * (1.0 + (mouse.y - 0.5) * 0.2);

    float time_scaled = time / 10.0 + (mouse.x - 0.5) * 1.0;
    float blur = smoothstep(split_point, split_point + 0.05, st.x) * perc;

    float xnoise = mix(
        Perlin2D(vec2(time_scaled, st.x + perc) * 2.5),
        Perlin2D(vec2(time_scaled, st.x + time_scaled) * 3.5) / 1.5,
        st.x * 0.3
    );

    float y = 0.5 + (perc - 0.5) * distance + xnoise / 2.0 * finalAmplitude;

    float line_start = smoothstep(
        y + (width / 2.0) + (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        y,
        st.y
    );

    float line_end = smoothstep(
        y,
        y - (width / 2.0) - (u_line_blur * pixel(1.0, iResolution.xy) * blur),
        st.y
    );

    return clamp(
        (line_start - line_end) * (1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3))),
        0.0,
        1.0
    );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    float line_strength = 1.0;
    for (int i = 0; i < u_line_count; i++) {
        float p = float(i) / float(u_line_count);
        line_strength *= (1.0 - lineFn(
            uv,
            u_line_width * pixel(1.0, iResolution.xy) * (1.0 - p),
            p,
            (PI * 1.0) * p,
            uMouse,
            iTime,
            uAmplitude,
            uDistance
        ));
    }

    float colorVal = 1.0 - line_strength;
    fragColor = vec4(uColor * colorVal, colorVal);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initThreads();
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

    if (changes['color']) {
      this.program.uniforms['uColor'].value = new Color(...this.color);
    }
    if (changes['amplitude']) {
      this.program.uniforms['uAmplitude'].value = this.amplitude;
    }
    if (changes['distance']) {
      this.program.uniforms['uDistance'].value = this.distance;
    }
  }

  private initThreads(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const renderer = new Renderer({ alpha: true });
    this.renderer = renderer;
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    container.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    this.geometry = geometry;
    const program = new Program(gl, {
      vertex: this.vertexShader,
      fragment: this.fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
        },
        uColor: { value: new Color(...this.color) },
        uAmplitude: { value: this.amplitude },
        uDistance: { value: this.distance },
        uMouse: { value: new Float32Array([0.5, 0.5]) }
      }
    });
    this.program = program;

    const mesh = new Mesh(gl, { geometry, program });
    this.mesh = mesh;

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      const resValue = program.uniforms['iResolution'].value as Color;
      resValue.r = clientWidth;
      resValue.g = clientHeight;
      resValue.b = clientWidth / clientHeight;
    };
    this.resizeHandler = resize;
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      this.targetMouse = [x, y];
    };

    const handleMouseLeave = () => {
      this.targetMouse = [0.5, 0.5];
    };

    if (this.enableMouseInteraction) {
      this.mouseMoveHandler = handleMouseMove;
      this.mouseLeaveHandler = handleMouseLeave;
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    const update = (t: number) => {
      this.animationId = requestAnimationFrame(update);
      if (this.program) {
        if (this.enableMouseInteraction) {
          const smoothing = 0.05;
          this.currentMouse[0] += smoothing * (this.targetMouse[0] - this.currentMouse[0]);
          this.currentMouse[1] += smoothing * (this.targetMouse[1] - this.currentMouse[1]);
          (this.program.uniforms['uMouse'].value as Float32Array)[0] = this.currentMouse[0];
          (this.program.uniforms['uMouse'].value as Float32Array)[1] = this.currentMouse[1];
        } else {
          (this.program.uniforms['uMouse'].value as Float32Array)[0] = 0.5;
          (this.program.uniforms['uMouse'].value as Float32Array)[1] = 0.5;
        }
        this.program.uniforms['iTime'].value = t * 0.001;

        renderer.render({ scene: mesh });
      }
    };
    this.animationId = requestAnimationFrame(update);
    this.initialized = true;
  }

  private cleanup(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    const container = this.containerRef?.nativeElement;
    if (container) {
      if (this.mouseMoveHandler) {
        container.removeEventListener('mousemove', this.mouseMoveHandler);
      }
      if (this.mouseLeaveHandler) {
        container.removeEventListener('mouseleave', this.mouseLeaveHandler);
      }
    }

    if (this.renderer && this.renderer.gl && this.renderer.gl.canvas) {
      const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
      if (container && canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      this.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }

    this.program = null;
    this.geometry = null;
    this.mesh = null;
    this.renderer = null;
  }
}

