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
import { Renderer, Program, Triangle, Mesh } from 'ogl';

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [1, 1, 1];
};

const vertex = `
attribute vec2 position;
varying vec2 vUv;
void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform bool enableRainbow;
uniform vec3 gridColor;
uniform float rippleIntensity;
uniform float gridSize;
uniform float gridThickness;
uniform float fadeDistance;
uniform float vignetteStrength;
uniform float glowIntensity;
uniform float opacity;
uniform float gridRotation;
uniform bool mouseInteraction;
uniform vec2 mousePosition;
uniform float mouseInfluence;
uniform float mouseInteractionRadius;
varying vec2 vUv;

float pi = 3.141592;

mat2 rotate(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    if (gridRotation != 0.0) {
        uv = rotate(gridRotation * pi / 180.0) * uv;
    }

    float dist = length(uv);
    float func = sin(pi * (iTime - dist));
    vec2 rippleUv = uv + uv * func * rippleIntensity;

    if (mouseInteraction && mouseInfluence > 0.0) {
        vec2 mouseUv = (mousePosition * 2.0 - 1.0);
        mouseUv.x *= iResolution.x / iResolution.y;
        float mouseDist = length(uv - mouseUv);
        
        float influence = mouseInfluence * exp(-mouseDist * mouseDist / (mouseInteractionRadius * mouseInteractionRadius));
        
        float mouseWave = sin(pi * (iTime * 2.0 - mouseDist * 3.0)) * influence;
        rippleUv += normalize(uv - mouseUv) * mouseWave * rippleIntensity * 0.3;
    }

    vec2 a = sin(gridSize * 0.5 * pi * rippleUv - pi / 2.0);
    vec2 b = abs(a);

    float aaWidth = 0.5;
    vec2 smoothB = vec2(
        smoothstep(0.0, aaWidth, b.x),
        smoothstep(0.0, aaWidth, b.y)
    );

    vec3 color = vec3(0.0);
    color += exp(-gridThickness * smoothB.x * (0.8 + 0.5 * sin(pi * iTime)));
    color += exp(-gridThickness * smoothB.y);
    color += 0.5 * exp(-(gridThickness / 4.0) * sin(smoothB.x));
    color += 0.5 * exp(-(gridThickness / 3.0) * smoothB.y);

    if (glowIntensity > 0.0) {
        color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.x);
        color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.y);
    }

    float ddd = exp(-2.0 * clamp(pow(dist, fadeDistance), 0.0, 1.0));
    
    vec2 vignetteCoords = vUv - 0.5;
    float vignetteDistance = length(vignetteCoords);
    float vignette = 1.0 - pow(vignetteDistance * 2.0, vignetteStrength);
    vignette = clamp(vignette, 0.0, 1.0);
    
    vec3 t;
    if (enableRainbow) {
        t = vec3(
            uv.x * 0.5 + 0.5 * sin(iTime),
            uv.y * 0.5 + 0.5 * cos(iTime),
            pow(cos(iTime), 4.0)
        ) + 0.5;
    } else {
        t = gridColor;
    }

    float finalFade = ddd * vignette;
    float alpha = length(color) * finalFade * opacity;
    gl_FragColor = vec4(color * t * finalFade * opacity, alpha);
}`;

@Component({
  selector: 'ngw-ripple-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ripple-grid.component.html',
  styleUrl: './ripple-grid.component.css'
})
export class RippleGridComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() enableRainbow = false;
  @Input() gridColor = '#ffffff';
  @Input() rippleIntensity = 0.05;
  @Input() gridSize = 10.0;
  @Input() gridThickness = 15.0;
  @Input() fadeDistance = 1.5;
  @Input() vignetteStrength = 2.0;
  @Input() glowIntensity = 0.1;
  @Input() opacity = 1.0;
  @Input() gridRotation = 0;
  @Input() mouseInteraction = true;
  @Input() mouseInteractionRadius = 1;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer!: Renderer;
  private program!: Program;
  private mesh!: Mesh;
  private animationFrameId: number | null = null;
  private mousePosition = { x: 0.5, y: 0.5 };
  private targetMouse = { x: 0.5, y: 0.5 };
  private mouseInfluence = 0;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initRippleGrid();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.program) {
      return;
    }

    if (changes['enableRainbow']) {
      this.program.uniforms['enableRainbow'].value = this.enableRainbow;
    }

    if (changes['gridColor']) {
      const rgb = hexToRgb(this.gridColor);
      const colorUniform = this.program.uniforms['gridColor'].value as Float32Array;
      colorUniform[0] = rgb[0];
      colorUniform[1] = rgb[1];
      colorUniform[2] = rgb[2];
    }

    if (changes['rippleIntensity']) {
      this.program.uniforms['rippleIntensity'].value = this.rippleIntensity;
    }

    if (changes['gridSize']) {
      this.program.uniforms['gridSize'].value = this.gridSize;
    }

    if (changes['gridThickness']) {
      this.program.uniforms['gridThickness'].value = this.gridThickness;
    }

    if (changes['fadeDistance']) {
      this.program.uniforms['fadeDistance'].value = this.fadeDistance;
    }

    if (changes['vignetteStrength']) {
      this.program.uniforms['vignetteStrength'].value = this.vignetteStrength;
    }

    if (changes['glowIntensity']) {
      this.program.uniforms['glowIntensity'].value = this.glowIntensity;
    }

    if (changes['opacity']) {
      this.program.uniforms['opacity'].value = this.opacity;
    }

    if (changes['gridRotation']) {
      this.program.uniforms['gridRotation'].value = this.gridRotation;
    }

    if (changes['mouseInteraction']) {
      this.program.uniforms['mouseInteraction'].value = this.mouseInteraction;
    }

    if (changes['mouseInteractionRadius']) {
      this.program.uniforms['mouseInteractionRadius'].value = this.mouseInteractionRadius;
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize);

    if (this.containerRef?.nativeElement && this.renderer?.gl?.canvas) {
      try {
        this.containerRef.nativeElement.removeChild(this.renderer.gl.canvas);
      } catch {
        // Canvas already removed
      }
    }

    const gl = this.renderer?.gl;
    if (gl) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }

  private initRippleGrid(): void {
    const container = this.containerRef.nativeElement;

    this.renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio, 2),
      alpha: true
    });
    const gl = this.renderer.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    container.appendChild(gl.canvas);

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: [1, 1] },
      enableRainbow: { value: this.enableRainbow },
      gridColor: { value: hexToRgb(this.gridColor) },
      rippleIntensity: { value: this.rippleIntensity },
      gridSize: { value: this.gridSize },
      gridThickness: { value: this.gridThickness },
      fadeDistance: { value: this.fadeDistance },
      vignetteStrength: { value: this.vignetteStrength },
      glowIntensity: { value: this.glowIntensity },
      opacity: { value: this.opacity },
      gridRotation: { value: this.gridRotation },
      mouseInteraction: { value: this.mouseInteraction },
      mousePosition: { value: [0.5, 0.5] },
      mouseInfluence: { value: 0 },
      mouseInteractionRadius: { value: this.mouseInteractionRadius }
    };

    const geometry = new Triangle(gl);
    this.program = new Program(gl, { vertex, fragment, uniforms });
    this.mesh = new Mesh(gl, { geometry, program: this.program });

    this.setSize();
    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  private handleResize = (): void => {
    this.setSize();
  };

  private setSize(): void {
    if (!this.containerRef?.nativeElement || !this.renderer || !this.program) {
      return;
    }

    const container = this.containerRef.nativeElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.renderer.setSize(w, h);
    const res = this.program.uniforms['iResolution'].value as Float32Array;
    res[0] = w;
    res[1] = h;
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.program || !this.renderer) {
      return;
    }

    const t = performance.now();
    this.program.uniforms['iTime'].value = t * 0.001;

    const lerpFactor = 0.1;
    this.mousePosition.x += (this.targetMouse.x - this.mousePosition.x) * lerpFactor;
    this.mousePosition.y += (this.targetMouse.y - this.mousePosition.y) * lerpFactor;

    const currentInfluence = this.program.uniforms['mouseInfluence'].value as number;
    const targetInfluence = this.mouseInfluence;
    this.program.uniforms['mouseInfluence'].value = currentInfluence + (targetInfluence - currentInfluence) * 0.05;

    const mousePosUniform = this.program.uniforms['mousePosition'].value as Float32Array;
    mousePosUniform[0] = this.mousePosition.x;
    mousePosUniform[1] = this.mousePosition.y;

    this.renderer.render({ scene: this.mesh });
  };

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.mouseInteraction || !this.containerRef?.nativeElement) {
      return;
    }

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1.0 - (event.clientY - rect.top) / rect.height;
    this.targetMouse = { x, y };
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    if (!this.mouseInteraction) {
      return;
    }
    this.mouseInfluence = 1.0;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    if (!this.mouseInteraction) {
      return;
    }
    this.mouseInfluence = 0.0;
  }
}

