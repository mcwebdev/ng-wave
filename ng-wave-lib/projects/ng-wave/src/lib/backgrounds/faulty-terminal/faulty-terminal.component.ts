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
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;

uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;

float time;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2; 
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;
  
  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545;
  
  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;
  
  mat2 modify2 = rotate(time * 0.08);
  f += amp * noise(p);
  
  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time);
  mat2 rot1 = rotate(0.1);
  
  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;
    
    if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;
        
        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }
    
    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
        
        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
    }
    
    p = fract(p);
    p *= uDigitSize;
    
    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);
    
    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;
    
    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);
    
    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){
    
    float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0;
    bar *= uScanlineIntensity;
    
    float displacement = displace(p);
    p.x += displacement;

    if (uGlitchAmount != 1.0) {
      float extra = displacement * (uGlitchAmount - 1.0);
      p.x += extra;
    }

    float middle = digit(p);
    
    const float off = 0.002;
    float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));
    
    vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    vec2 uv = vUv;

    if(uCurvature != 0.0){
      uv = barrel(uv);
    }
    
    vec2 p = uv * uScale;
    vec3 col = getColor(p);

    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }

    col *= uTint;
    col *= uBrightness;

    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  }
  const num = parseInt(h, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

@Component({
  selector: 'ngw-faulty-terminal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faulty-terminal.component.html',
  styleUrl: './faulty-terminal.component.css'
})
export class FaultyTerminalComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() scale = 1;
  @Input() gridMul: [number, number] = [2, 1];
  @Input() digitSize = 1.5;
  @Input() timeScale = 0.3;
  @Input() pause = false;
  @Input() scanlineIntensity = 0.3;
  @Input() glitchAmount = 1;
  @Input() flickerAmount = 1;
  @Input() noiseAmp = 0;
  @Input() chromaticAberration = 0;
  @Input() dither: number | boolean = 0;
  @Input() curvature = 0.2;
  @Input() tint = '#ffffff';
  @Input() mouseReact = true;
  @Input() mouseStrength = 0.2;
  @Input() dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
  @Input() pageLoadAnimation = true;
  @Input() brightness = 1;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mouseRef = { x: 0.5, y: 0.5 };
  private smoothMouseRef = { x: 0.5, y: 0.5 };
  private frozenTime = 0;
  private loadAnimationStart = 0;
  private timeOffset = Math.random() * 100;
  private tintVec: [number, number, number] = [1, 1, 1];
  private ditherValue = 0;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.tintVec = hexToRgb(this.tint);
    this.ditherValue = typeof this.dither === 'boolean' ? (this.dither ? 1 : 0) : this.dither;
    this.initFaultyTerminal();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.program) {
      return;
    }

    if (changes['scale']) {
      this.program.uniforms['uScale'].value = this.scale;
    }

    if (changes['gridMul']) {
      this.program.uniforms['uGridMul'].value = new Float32Array(this.gridMul);
    }

    if (changes['digitSize']) {
      this.program.uniforms['uDigitSize'].value = this.digitSize;
    }

    if (changes['scanlineIntensity']) {
      this.program.uniforms['uScanlineIntensity'].value = this.scanlineIntensity;
    }

    if (changes['glitchAmount']) {
      this.program.uniforms['uGlitchAmount'].value = this.glitchAmount;
    }

    if (changes['flickerAmount']) {
      this.program.uniforms['uFlickerAmount'].value = this.flickerAmount;
    }

    if (changes['noiseAmp']) {
      this.program.uniforms['uNoiseAmp'].value = this.noiseAmp;
    }

    if (changes['chromaticAberration']) {
      this.program.uniforms['uChromaticAberration'].value = this.chromaticAberration;
    }

    if (changes['dither']) {
      this.ditherValue = typeof this.dither === 'boolean' ? (this.dither ? 1 : 0) : this.dither;
      this.program.uniforms['uDither'].value = this.ditherValue;
    }

    if (changes['curvature']) {
      this.program.uniforms['uCurvature'].value = this.curvature;
    }

    if (changes['tint']) {
      this.tintVec = hexToRgb(this.tint);
      this.program.uniforms['uTint'].value = new Color(this.tintVec[0], this.tintVec[1], this.tintVec[2]);
    }

    if (changes['mouseStrength']) {
      this.program.uniforms['uMouseStrength'].value = this.mouseStrength;
    }

    if (changes['mouseReact']) {
      this.program.uniforms['uUseMouse'].value = this.mouseReact ? 1 : 0;
    }

    if (changes['pageLoadAnimation']) {
      this.program.uniforms['uUsePageLoadAnimation'].value = this.pageLoadAnimation ? 1 : 0;
      if (!this.pageLoadAnimation) {
        this.program.uniforms['uPageLoadProgress'].value = 1;
      } else {
        this.loadAnimationStart = 0;
      }
    }

    if (changes['brightness']) {
      this.program.uniforms['uBrightness'].value = this.brightness;
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

    const container = this.containerRef?.nativeElement;
    if (container && this.mouseReact) {
      container.removeEventListener('mousemove', this.handleMouseMove);
    }

    if (this.renderer) {
      try {
        const gl = this.renderer.gl;
        const loseContextExt = gl.getExtension('WEBGL_lose_context');
        if (loseContextExt) {
          loseContextExt.loseContext();
        }

        if (gl.canvas && gl.canvas.parentElement === container) {
          container.removeChild(gl.canvas);
        }
      } catch {
        // Already cleaned up
      }
    }

    this.loadAnimationStart = 0;
    this.timeOffset = Math.random() * 100;
  }

  @HostListener('mousemove', ['$event'])
  handleMouseMove(event: MouseEvent): void {
    if (!this.mouseReact || !this.containerRef?.nativeElement) {
      return;
    }

    const container = this.containerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    this.mouseRef = { x, y };
  }

  private setSize(): void {
    if (!this.containerRef?.nativeElement || !this.renderer || !this.program) {
      return;
    }

    const container = this.containerRef.nativeElement;
    this.renderer.setSize(container.offsetWidth, container.offsetHeight);
    const gl = this.renderer.gl;
    this.program.uniforms['iResolution'].value = new Color(
      gl.canvas.width,
      gl.canvas.height,
      gl.canvas.width / gl.canvas.height
    );
  }

  private initFaultyTerminal(): void {
    const container = this.containerRef.nativeElement;
    if (!container) {
      return;
    }

    this.renderer = new Renderer({ dpr: this.dpr });
    const gl = this.renderer.gl;
    gl.clearColor(0, 0, 0, 1);

    const geometry = new Triangle(gl);

    this.program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
        },
        uScale: { value: this.scale },
        uGridMul: { value: new Float32Array(this.gridMul) },
        uDigitSize: { value: this.digitSize },
        uScanlineIntensity: { value: this.scanlineIntensity },
        uGlitchAmount: { value: this.glitchAmount },
        uFlickerAmount: { value: this.flickerAmount },
        uNoiseAmp: { value: this.noiseAmp },
        uChromaticAberration: { value: this.chromaticAberration },
        uDither: { value: this.ditherValue },
        uCurvature: { value: this.curvature },
        uTint: { value: new Color(this.tintVec[0], this.tintVec[1], this.tintVec[2]) },
        uMouse: {
          value: new Float32Array([this.smoothMouseRef.x, this.smoothMouseRef.y])
        },
        uMouseStrength: { value: this.mouseStrength },
        uUseMouse: { value: this.mouseReact ? 1 : 0 },
        uPageLoadProgress: { value: this.pageLoadAnimation ? 0 : 1 },
        uUsePageLoadAnimation: { value: this.pageLoadAnimation ? 1 : 0 },
        uBrightness: { value: this.brightness }
      }
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });

    this.resizeObserver = new ResizeObserver(() => this.setSize());
    this.resizeObserver.observe(container);
    this.setSize();

    if (this.mouseReact) {
      container.addEventListener('mousemove', this.handleMouseMove);
    }

    container.appendChild(gl.canvas);
    this.animate();
  }

  private animate = (t?: number): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.program || !this.renderer || !this.mesh) {
      return;
    }

    if (this.pageLoadAnimation && this.loadAnimationStart === 0 && t !== undefined) {
      this.loadAnimationStart = t;
    }

    if (!this.pause) {
      const elapsed = ((t !== undefined ? t * 0.001 : performance.now() * 0.001) + this.timeOffset) * this.timeScale;
      this.program.uniforms['iTime'].value = elapsed;
      this.frozenTime = elapsed;
    } else {
      this.program.uniforms['iTime'].value = this.frozenTime;
    }

    if (this.pageLoadAnimation && this.loadAnimationStart > 0 && t !== undefined) {
      const animationDuration = 2000;
      const animationElapsed = t - this.loadAnimationStart;
      const progress = Math.min(animationElapsed / animationDuration, 1);
      this.program.uniforms['uPageLoadProgress'].value = progress;
    }

    if (this.mouseReact) {
      const dampingFactor = 0.08;
      this.smoothMouseRef.x += (this.mouseRef.x - this.smoothMouseRef.x) * dampingFactor;
      this.smoothMouseRef.y += (this.mouseRef.y - this.smoothMouseRef.y) * dampingFactor;

      const mouseUniform = this.program.uniforms['uMouse'].value as Float32Array;
      mouseUniform[0] = this.smoothMouseRef.x;
      mouseUniform[1] = this.smoothMouseRef.y;
    }

    this.renderer.render({ scene: this.mesh });
  };
}

