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
  PLATFORM_ID,
  HostListener
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 0.5, 0.2];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ];
};

const vertex = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
out vec4 fragColor;

void mainImage(out vec4 o, vec2 C) {
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;
  
  vec2 mouseOffset = (uMouse - center) * 0.0002;
  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);
  
  float i, d, z, T = iTime * uSpeed * uDirection;
  vec3 O, p, S;

  for (vec2 r = iResolution.xy, Q; ++i < 60.; O += o.w/d*o.xyz) {
    p = z*normalize(vec3(C-.5*r,r.y)); 
    p.z -= 4.; 
    S = p;
    d = p.y-T;
    
    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05); 
    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T)); 
    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4; 
    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
  }
  
  o.xyz = tanh(O/1e4);
}

bool finite1(float x){ return !(isnan(x) || isinf(x)); }
vec3 sanitize(vec3 c){
  return vec3(
    finite1(c.r) ? c.r : 0.0,
    finite1(c.g) ? c.g : 0.0,
    finite1(c.b) ? c.b : 0.0
  );
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = sanitize(o.rgb);
  
  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 customColor = intensity * uCustomColor;
  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));
  
  float alpha = length(rgb) * uOpacity;
  fragColor = vec4(finalColor, alpha);
}`;

@Component({
  selector: 'ngw-plasma',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plasma.component.html',
  styleUrl: './plasma.component.css'
})
export class PlasmaComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() color = '#ffffff';
  @Input() speed = 1;
  @Input() direction: 'forward' | 'reverse' | 'pingpong' = 'forward';
  @Input() scale = 1;
  @Input() opacity = 1;
  @Input() mouseInteractive = true;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer!: Renderer;
  private program!: Program;
  private mesh!: Mesh;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mousePos = { x: 0, y: 0 };
  private startTime = 0;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initPlasma();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.program) {
      return;
    }

    if (changes['color']) {
      this.updateColor();
    }

    if (changes['speed']) {
      this.program.uniforms['uSpeed'].value = this.speed * 0.4;
    }

    if (changes['direction']) {
      this.updateDirection();
    }

    if (changes['scale']) {
      this.program.uniforms['uScale'].value = this.scale;
    }

    if (changes['opacity']) {
      this.program.uniforms['uOpacity'].value = this.opacity;
    }

    if (changes['mouseInteractive']) {
      this.program.uniforms['uMouseInteractive'].value = this.mouseInteractive ? 1.0 : 0.0;
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.containerRef?.nativeElement && this.renderer?.gl?.canvas) {
      try {
        this.containerRef.nativeElement.removeChild(this.renderer.gl.canvas);
      } catch {
        // Canvas already removed
      }
    }
  }

  private initPlasma(): void {
    const container = this.containerRef.nativeElement;
    const useCustomColor = this.color ? 1.0 : 0.0;
    const customColorRgb = this.color ? hexToRgb(this.color) : [1, 1, 1];
    const directionMultiplier = this.direction === 'reverse' ? -1.0 : 1.0;

    this.renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });

    const gl = this.renderer.gl;
    const canvas = gl.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const geometry = new Triangle(gl);

    this.program = new Program(gl, {
      vertex: vertex,
      fragment: fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uCustomColor: { value: new Float32Array(customColorRgb) },
        uUseCustomColor: { value: useCustomColor },
        uSpeed: { value: this.speed * 0.4 },
        uDirection: { value: directionMultiplier },
        uScale: { value: this.scale },
        uOpacity: { value: this.opacity },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseInteractive: { value: this.mouseInteractive ? 1.0 : 0.0 }
      }
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });

    this.setSize();
    this.resizeObserver = new ResizeObserver(() => this.setSize());
    this.resizeObserver.observe(container);

    this.startTime = performance.now();
    this.animate();
  }

  private setSize(): void {
    if (!this.containerRef?.nativeElement || !this.renderer || !this.program) {
      return;
    }

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(width, height);
    const gl = this.renderer.gl;
    const res = this.program.uniforms['iResolution'].value as Float32Array;
    res[0] = gl.drawingBufferWidth;
    res[1] = gl.drawingBufferHeight;
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.program || !this.renderer) {
      return;
    }

    const t = performance.now();
    let timeValue = (t - this.startTime) * 0.001;

    if (this.direction === 'pingpong') {
      const pingpongDuration = 10;
      const segmentTime = timeValue % pingpongDuration;
      const isForward = Math.floor(timeValue / pingpongDuration) % 2 === 0;
      const u = segmentTime / pingpongDuration;
      const smooth = u * u * (3 - 2 * u);
      const pingpongTime = isForward
        ? smooth * pingpongDuration
        : (1 - smooth) * pingpongDuration;
      this.program.uniforms['uDirection'].value = 1.0;
      this.program.uniforms['iTime'].value = pingpongTime;
    } else {
      this.program.uniforms['iTime'].value = timeValue;
    }

    this.renderer.render({ scene: this.mesh });
  };

  private updateColor(): void {
    if (!this.program) {
      return;
    }

    const useCustomColor = this.color ? 1.0 : 0.0;
    const customColorRgb = this.color ? hexToRgb(this.color) : [1, 1, 1];
    const colorUniform = this.program.uniforms['uCustomColor'].value as Float32Array;
    colorUniform[0] = customColorRgb[0];
    colorUniform[1] = customColorRgb[1];
    colorUniform[2] = customColorRgb[2];
    this.program.uniforms['uUseCustomColor'].value = useCustomColor;
  }

  private updateDirection(): void {
    if (!this.program) {
      return;
    }

    const directionMultiplier = this.direction === 'reverse' ? -1.0 : 1.0;
    this.program.uniforms['uDirection'].value = directionMultiplier;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.mouseInteractive || !this.containerRef?.nativeElement || !this.program) {
      return;
    }

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    this.mousePos.x = event.clientX - rect.left;
    this.mousePos.y = event.clientY - rect.top;
    const mouseUniform = this.program.uniforms['uMouse'].value as Float32Array;
    mouseUniform[0] = this.mousePos.x;
    mouseUniform[1] = this.mousePos.y;
  }
}

