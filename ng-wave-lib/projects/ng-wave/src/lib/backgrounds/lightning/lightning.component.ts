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

const vertexShaderSource = `
  attribute vec2 aPosition;
  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform float uHue;
  uniform float uXOffset;
  uniform float uSpeed;
  uniform float uIntensity;
  uniform float uSize;
  
  #define OCTAVE_COUNT 10

  vec3 hsv2rgb(vec3 c) {
      vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
      return c.z * mix(vec3(1.0), rgb, c.y);
  }

  float hash11(float p) {
      p = fract(p * .1031);
      p *= p + 33.33;
      p *= p + p;
      return fract(p);
  }

  float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
  }

  mat2 rotate2d(float theta) {
      float c = cos(theta);
      float s = sin(theta);
      return mat2(c, -s, s, c);
  }

  float noise(vec2 p) {
      vec2 ip = floor(p);
      vec2 fp = fract(p);
      float a = hash12(ip);
      float b = hash12(ip + vec2(1.0, 0.0));
      float c = hash12(ip + vec2(0.0, 1.0));
      float d = hash12(ip + vec2(1.0, 1.0));
      
      vec2 t = smoothstep(0.0, 1.0, fp);
      return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
  }

  float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < OCTAVE_COUNT; ++i) {
          value += amplitude * noise(p);
          p *= rotate2d(0.45);
          p *= 2.0;
          amplitude *= 0.5;
      }
      return value;
  }

  void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
      vec2 uv = fragCoord / iResolution.xy;
      uv = 2.0 * uv - 1.0;
      uv.x *= iResolution.x / iResolution.y;
      uv.x += uXOffset;
      
      uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;
      
      float dist = abs(uv.x);
      vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
      vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
      col = pow(col, vec3(1.0));
      fragColor = vec4(col, 1.0);
  }

  void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
  }
`;

@Component({
  selector: 'ngw-lightning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lightning.component.html',
  styleUrl: './lightning.component.css'
})
export class LightningComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() hue = 230;
  @Input() xOffset = 0;
  @Input() speed = 1;
  @Input() intensity = 1;
  @Input() size = 1;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private animationFrameId: number | null = null;
  private startTime = 0;
  private iResolutionLocation: WebGLUniformLocation | null = null;
  private iTimeLocation: WebGLUniformLocation | null = null;
  private uHueLocation: WebGLUniformLocation | null = null;
  private uXOffsetLocation: WebGLUniformLocation | null = null;
  private uSpeedLocation: WebGLUniformLocation | null = null;
  private uIntensityLocation: WebGLUniformLocation | null = null;
  private uSizeLocation: WebGLUniformLocation | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initLightning();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Uniforms are updated in the render loop, so no need to handle changes here
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.resizeCanvas();
  };

  private resizeCanvas(): void {
    if (!this.canvasRef?.nativeElement) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }

  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) {
      return null;
    }

    const shader = this.gl.createShader(type);
    if (!shader) {
      return null;
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private initLightning(): void {
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) {
      return;
    }

    this.resizeCanvas();
    window.addEventListener('resize', this.handleResize);

    this.gl = canvas.getContext('webgl');
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      return;
    }

    this.program = this.gl.createProgram();
    if (!this.program) {
      return;
    }

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(this.program));
      return;
    }

    this.gl.useProgram(this.program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    const aPosition = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(aPosition);
    this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);

    this.iResolutionLocation = this.gl.getUniformLocation(this.program, 'iResolution');
    this.iTimeLocation = this.gl.getUniformLocation(this.program, 'iTime');
    this.uHueLocation = this.gl.getUniformLocation(this.program, 'uHue');
    this.uXOffsetLocation = this.gl.getUniformLocation(this.program, 'uXOffset');
    this.uSpeedLocation = this.gl.getUniformLocation(this.program, 'uSpeed');
    this.uIntensityLocation = this.gl.getUniformLocation(this.program, 'uIntensity');
    this.uSizeLocation = this.gl.getUniformLocation(this.program, 'uSize');

    this.startTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.gl || !this.program || !this.canvasRef?.nativeElement) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    this.resizeCanvas();
    this.gl.viewport(0, 0, canvas.width, canvas.height);

    if (this.iResolutionLocation) {
      this.gl.uniform2f(this.iResolutionLocation, canvas.width, canvas.height);
    }

    const currentTime = performance.now();
    if (this.iTimeLocation) {
      this.gl.uniform1f(this.iTimeLocation, (currentTime - this.startTime) / 1000.0);
    }

    if (this.uHueLocation) {
      this.gl.uniform1f(this.uHueLocation, this.hue);
    }

    if (this.uXOffsetLocation) {
      this.gl.uniform1f(this.uXOffsetLocation, this.xOffset);
    }

    if (this.uSpeedLocation) {
      this.gl.uniform1f(this.uSpeedLocation, this.speed);
    }

    if (this.uIntensityLocation) {
      this.gl.uniform1f(this.uIntensityLocation, this.intensity);
    }

    if (this.uSizeLocation) {
      this.gl.uniform1f(this.uSizeLocation, this.size);
    }

    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  };
}

