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

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec2 uSkew;
uniform float uTilt;
uniform float uYaw;
uniform float uLineThickness;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;
uniform float uGridScale;
uniform float uLineStyle;
uniform float uLineJitter;
uniform float uScanOpacity;
uniform float uScanDirection;
uniform float uNoise;
uniform float uBloomOpacity;
uniform float uScanGlow;
uniform float uScanSoftness;
uniform float uPhaseTaper;
uniform float uScanDuration;
uniform float uScanDelay;
varying vec2 vUv;

uniform float uScanStarts[8];
uniform float uScanCount;

const int MAX_SCANS = 8;

float smoother01(float a, float b, float x){
  float t = clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0);
    vec3 rd = normalize(vec3(p, 2.0));

    float cR = cos(uTilt), sR = sin(uTilt);
    rd.xy = mat2(cR, -sR, sR, cR) * rd.xy;

    float cY = cos(uYaw), sY = sin(uYaw);
    rd.xz = mat2(cY, -sY, sY, cY) * rd.xz;

    vec2 skew = clamp(uSkew, vec2(-0.7), vec2(0.7));
    rd.xy += skew * rd.z;

    vec3 color = vec3(0.0);
  float minT = 1e20;
  float gridScale = max(1e-5, uGridScale);
    float fadeStrength = 2.0;
    vec2 gridUV = vec2(0.0);

  float hitIsY = 1.0;
    for (int i = 0; i < 4; i++)
    {
        float isY = float(i < 2);
        float pos = mix(-0.2, 0.2, float(i)) * isY + mix(-0.5, 0.5, float(i - 2)) * (1.0 - isY);
        float num = pos - (isY * ro.y + (1.0 - isY) * ro.x);
        float den = isY * rd.y + (1.0 - isY) * rd.x;
        float t = num / den;
        vec3 h = ro + rd * t;

        float depthBoost = smoothstep(0.0, 3.0, h.z);
        h.xy += skew * 0.15 * depthBoost;

    bool use = t > 0.0 && t < minT;
    gridUV = use ? mix(h.zy, h.xz, isY) / gridScale : gridUV;
    minT = use ? t : minT;
    hitIsY = use ? isY : hitIsY;
    }

    vec3 hit = ro + rd * minT;
    float dist = length(hit - ro);

  float jitterAmt = clamp(uLineJitter, 0.0, 1.0);
  if (jitterAmt > 0.0) {
    vec2 j = vec2(
      sin(gridUV.y * 2.7 + iTime * 1.8),
      cos(gridUV.x * 2.3 - iTime * 1.6)
    ) * (0.15 * jitterAmt);
    gridUV += j;
  }
  float fx = fract(gridUV.x);
  float fy = fract(gridUV.y);
  float ax = min(fx, 1.0 - fx);
  float ay = min(fy, 1.0 - fy);
  float wx = fwidth(gridUV.x);
  float wy = fwidth(gridUV.y);
  float halfPx = max(0.0, uLineThickness) * 0.5;

  float tx = halfPx * wx;
  float ty = halfPx * wy;

  float aax = wx;
  float aay = wy;

  float lineX = 1.0 - smoothstep(tx, tx + aax, ax);
  float lineY = 1.0 - smoothstep(ty, ty + aay, ay);
  if (uLineStyle > 0.5) {
    float dashRepeat = 4.0;
    float dashDuty = 0.5;
    float vy = fract(gridUV.y * dashRepeat);
    float vx = fract(gridUV.x * dashRepeat);
    float dashMaskY = step(vy, dashDuty);
    float dashMaskX = step(vx, dashDuty);
    if (uLineStyle < 1.5) {
      lineX *= dashMaskY;
      lineY *= dashMaskX;
    } else {
      float dotRepeat = 6.0;
      float dotWidth = 0.18;
      float cy = abs(fract(gridUV.y * dotRepeat) - 0.5);
      float cx = abs(fract(gridUV.x * dotRepeat) - 0.5);
      float dotMaskY = 1.0 - smoothstep(dotWidth, dotWidth + fwidth(gridUV.y * dotRepeat), cy);
      float dotMaskX = 1.0 - smoothstep(dotWidth, dotWidth + fwidth(gridUV.x * dotRepeat), cx);
      lineX *= dotMaskY;
      lineY *= dotMaskX;
    }
  }
  float primaryMask = max(lineX, lineY);

  vec2 gridUV2 = (hitIsY > 0.5 ? hit.xz : hit.zy) / gridScale;
  if (jitterAmt > 0.0) {
    vec2 j2 = vec2(
      cos(gridUV2.y * 2.1 - iTime * 1.4),
      sin(gridUV2.x * 2.5 + iTime * 1.7)
    ) * (0.15 * jitterAmt);
    gridUV2 += j2;
  }
  float fx2 = fract(gridUV2.x);
  float fy2 = fract(gridUV2.y);
  float ax2 = min(fx2, 1.0 - fx2);
  float ay2 = min(fy2, 1.0 - fy2);
  float wx2 = fwidth(gridUV2.x);
  float wy2 = fwidth(gridUV2.y);
  float tx2 = halfPx * wx2;
  float ty2 = halfPx * wy2;
  float aax2 = wx2;
  float aay2 = wy2;
  float lineX2 = 1.0 - smoothstep(tx2, tx2 + aax2, ax2);
  float lineY2 = 1.0 - smoothstep(ty2, ty2 + aay2, ay2);
  if (uLineStyle > 0.5) {
    float dashRepeat2 = 4.0;
    float dashDuty2 = 0.5;
    float vy2m = fract(gridUV2.y * dashRepeat2);
    float vx2m = fract(gridUV2.x * dashRepeat2);
    float dashMaskY2 = step(vy2m, dashDuty2);
    float dashMaskX2 = step(vx2m, dashDuty2);
    if (uLineStyle < 1.5) {
      lineX2 *= dashMaskY2;
      lineY2 *= dashMaskX2;
    } else {
      float dotRepeat2 = 6.0;
      float dotWidth2 = 0.18;
      float cy2 = abs(fract(gridUV2.y * dotRepeat2) - 0.5);
      float cx2 = abs(fract(gridUV2.x * dotRepeat2) - 0.5);
      float dotMaskY2 = 1.0 - smoothstep(dotWidth2, dotWidth2 + fwidth(gridUV2.y * dotRepeat2), cy2);
      float dotMaskX2 = 1.0 - smoothstep(dotWidth2, dotWidth2 + fwidth(gridUV2.x * dotRepeat2), cx2);
      lineX2 *= dotMaskY2;
      lineY2 *= dotMaskX2;
    }
  }
    float altMask = max(lineX2, lineY2);

    float edgeDistX = min(abs(hit.x - (-0.5)), abs(hit.x - 0.5));
    float edgeDistY = min(abs(hit.y - (-0.2)), abs(hit.y - 0.2));
    float edgeDist = mix(edgeDistY, edgeDistX, hitIsY);
    float edgeGate = 1.0 - smoothstep(gridScale * 0.5, gridScale * 2.0, edgeDist);
    altMask *= edgeGate;

  float lineMask = max(primaryMask, altMask);

    float fade = exp(-dist * fadeStrength);

    float dur = max(0.05, uScanDuration);
    float del = max(0.0, uScanDelay);
    float scanZMax = 2.0;
    float widthScale = max(0.1, uScanGlow);
    float sigma = max(0.001, 0.18 * widthScale * uScanSoftness);
    float sigmaA = sigma * 2.0;

    float combinedPulse = 0.0;
    float combinedAura = 0.0;

    float cycle = dur + del;
    float tCycle = mod(iTime, cycle);
    float scanPhase = clamp((tCycle - del) / dur, 0.0, 1.0);
    float phase = scanPhase;
    if (uScanDirection > 0.5 && uScanDirection < 1.5) {
      phase = 1.0 - phase;
    } else if (uScanDirection > 1.5) {
      float t2 = mod(max(0.0, iTime - del), 2.0 * dur);
      phase = (t2 < dur) ? (t2 / dur) : (1.0 - (t2 - dur) / dur);
    }
    float scanZ = phase * scanZMax;
    float dz = abs(hit.z - scanZ);
    float lineBand = exp(-0.5 * (dz * dz) / (sigma * sigma));
    float taper = clamp(uPhaseTaper, 0.0, 0.49);
    float headW = taper;
    float tailW = taper;
    float headFade = smoother01(0.0, headW, phase);
    float tailFade = 1.0 - smoother01(1.0 - tailW, 1.0, phase);
    float phaseWindow = headFade * tailFade;
    float pulseBase = lineBand * phaseWindow;
    combinedPulse += pulseBase * clamp(uScanOpacity, 0.0, 1.0);
    float auraBand = exp(-0.5 * (dz * dz) / (sigmaA * sigmaA));
    combinedAura += (auraBand * 0.25) * phaseWindow * clamp(uScanOpacity, 0.0, 1.0);

    for (int i = 0; i < MAX_SCANS; i++) {
      if (float(i) >= uScanCount) break;
      float tActiveI = iTime - uScanStarts[i];
      float phaseI = clamp(tActiveI / dur, 0.0, 1.0);
      if (uScanDirection > 0.5 && uScanDirection < 1.5) {
        phaseI = 1.0 - phaseI;
      } else if (uScanDirection > 1.5) {
        phaseI = (phaseI < 0.5) ? (phaseI * 2.0) : (1.0 - (phaseI - 0.5) * 2.0);
      }
      float scanZI = phaseI * scanZMax;
      float dzI = abs(hit.z - scanZI);
      float lineBandI = exp(-0.5 * (dzI * dzI) / (sigma * sigma));
      float headFadeI = smoother01(0.0, headW, phaseI);
      float tailFadeI = 1.0 - smoother01(1.0 - tailW, 1.0, phaseI);
      float phaseWindowI = headFadeI * tailFadeI;
      combinedPulse += lineBandI * phaseWindowI * clamp(uScanOpacity, 0.0, 1.0);
      float auraBandI = exp(-0.5 * (dzI * dzI) / (sigmaA * sigmaA));
      combinedAura += (auraBandI * 0.25) * phaseWindowI * clamp(uScanOpacity, 0.0, 1.0);
    }

  float lineVis = lineMask;
  vec3 gridCol = uLinesColor * lineVis * fade;
  vec3 scanCol = uScanColor * combinedPulse;
  vec3 scanAura = uScanColor * combinedAura;

    color = gridCol + scanCol + scanAura;

  float n = fract(sin(dot(gl_FragCoord.xy + vec2(iTime * 123.4), vec2(12.9898,78.233))) * 43758.5453123);
  color += (n - 0.5) * uNoise;
  color = clamp(color, 0.0, 1.0);
  float alpha = clamp(max(lineVis, combinedPulse), 0.0, 1.0);
  float gx = 1.0 - smoothstep(tx * 2.0, tx * 2.0 + aax * 2.0, ax);
  float gy = 1.0 - smoothstep(ty * 2.0, ty * 2.0 + aay * 2.0, ay);
  float halo = max(gx, gy) * fade;
  alpha = max(alpha, halo * clamp(uBloomOpacity, 0.0, 1.0));
  fragColor = vec4(color, alpha);
}

void main(){
  vec4 c;
  mainImage(c, vUv * iResolution.xy);
  gl_FragColor = c;
}
`;

function srgbColor(hex: string): THREE.Vector3 {
  const c = new THREE.Color(hex);
  c.convertSRGBToLinear();
  return new THREE.Vector3(c.r, c.g, c.b);
}

function smoothDampVec2(
  current: THREE.Vector2,
  target: THREE.Vector2,
  currentVelocity: THREE.Vector2,
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number
): THREE.Vector2 {
  const out = current.clone();
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  let change = current.clone().sub(target);
  const originalTo = target.clone();

  const maxChange = maxSpeed * smoothTime;
  if (change.length() > maxChange) change.setLength(maxChange);

  const tempTarget = current.clone().sub(change);
  const temp = currentVelocity.clone().addScaledVector(change, omega).multiplyScalar(deltaTime);
  currentVelocity.sub(temp.clone().multiplyScalar(omega));
  currentVelocity.multiplyScalar(exp);

  out.copy(tempTarget.clone().add(change.add(temp).multiplyScalar(exp)));

  const origMinusCurrent = originalTo.clone().sub(current);
  const outMinusOrig = out.clone().sub(originalTo);
  if (origMinusCurrent.dot(outMinusOrig) > 0) {
    out.copy(originalTo);
    currentVelocity.set(0, 0);
  }
  return out;
}

function smoothDampFloat(
  current: number,
  target: number,
  velRef: { v: number },
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number
): { value: number; v: number } {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  let change = current - target;
  const originalTo = target;

  const maxChange = maxSpeed * smoothTime;
  change = Math.sign(change) * Math.min(Math.abs(change), maxChange);

  const tempTarget = current - change;
  const temp = (velRef.v + omega * change) * deltaTime;
  velRef.v = (velRef.v - omega * temp) * exp;

  let out = tempTarget + (change + temp) * exp;

  const origMinusCurrent = originalTo - current;
  const outMinusOrig = out - originalTo;
  if (origMinusCurrent * outMinusOrig > 0) {
    out = originalTo;
    velRef.v = 0;
  }
  return { value: out, v: velRef.v };
}

@Component({
  selector: 'ngw-grid-scan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid-scan.component.html',
  styleUrl: './grid-scan.component.css'
})
export class GridScanComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() sensitivity = 0.55;
  @Input() lineThickness = 1;
  @Input() linesColor = '#392e4e';
  @Input() scanColor = '#FF9FFC';
  @Input() scanOpacity = 0.4;
  @Input() gridScale = 0.1;
  @Input() lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid';
  @Input() lineJitter = 0.1;
  @Input() scanDirection: 'forward' | 'backward' | 'pingpong' = 'pingpong';
  @Input() noiseIntensity = 0.01;
  @Input() scanGlow = 0.5;
  @Input() scanSoftness = 2;
  @Input() scanPhaseTaper = 0.9;
  @Input() scanDuration = 2.0;
  @Input() scanDelay = 2.0;
  @Input() enableGyro = false;
  @Input() scanOnClick = false;
  @Input() snapBackDelay = 250;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer: THREE.WebGLRenderer | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private rafId: number | null = null;

  private lookTarget = new THREE.Vector2(0, 0);
  private tiltTarget = 0;
  private yawTarget = 0;

  private lookCurrent = new THREE.Vector2(0, 0);
  private lookVel = new THREE.Vector2(0, 0);
  private tiltCurrent = 0;
  private tiltVel = 0;
  private yawCurrent = 0;
  private yawVel = 0;

  private readonly MAX_SCANS = 8;
  private scanStarts: number[] = [];

  private s = 0.55;
  private skewScale = 0.13;
  private tiltScale = 0.21;
  private yawScale = 0.19;
  private smoothTime = 0.285;
  private maxSpeed = Infinity;
  private yBoost = 1.4;

  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private mouseEnterHandler: (() => void) | null = null;
  private mouseLeaveHandler: (() => void) | null = null;
  private clickHandler: (() => void) | null = null;
  private gyroHandler: ((e: DeviceOrientationEvent) => void) | null = null;
  private leaveTimer: number | null = null;
  private resizeHandler: (() => void) | null = null;
  private initialized = false;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initGridScan();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.cleanup();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.initialized) {
      return;
    }

    if (this.material && this.material.uniforms) {
      const u = this.material.uniforms as any;

      if (changes['lineThickness']) {
        u.uLineThickness.value = this.lineThickness;
      }
      if (changes['linesColor']) {
        u.uLinesColor.value.copy(srgbColor(this.linesColor));
      }
      if (changes['scanColor']) {
        u.uScanColor.value.copy(srgbColor(this.scanColor));
      }
      if (changes['gridScale']) {
        u.uGridScale.value = this.gridScale;
      }
      if (changes['lineStyle']) {
        u.uLineStyle.value = this.lineStyle === 'dashed' ? 1 : this.lineStyle === 'dotted' ? 2 : 0;
      }
      if (changes['lineJitter']) {
        u.uLineJitter.value = Math.max(0, Math.min(1, this.lineJitter || 0));
      }
      if (changes['noiseIntensity']) {
        u.uNoise.value = Math.max(0, this.noiseIntensity);
      }
      if (changes['scanGlow']) {
        u.uScanGlow.value = this.scanGlow;
      }
      if (changes['scanOpacity']) {
        u.uScanOpacity.value = Math.max(0, Math.min(1, this.scanOpacity));
      }
      if (changes['scanDirection']) {
        u.uScanDirection.value = this.scanDirection === 'backward' ? 1 : this.scanDirection === 'pingpong' ? 2 : 0;
      }
      if (changes['scanSoftness']) {
        u.uScanSoftness.value = this.scanSoftness;
      }
      if (changes['scanPhaseTaper']) {
        u.uPhaseTaper.value = this.scanPhaseTaper;
      }
      if (changes['scanDuration']) {
        u.uScanDuration.value = Math.max(0.05, this.scanDuration);
      }
      if (changes['scanDelay']) {
        u.uScanDelay.value = Math.max(0.0, this.scanDelay);
      }
      if (changes['sensitivity']) {
        this.updateSensitivity();
      }
    }
  }

  private updateSensitivity(): void {
    this.s = THREE.MathUtils.clamp(this.sensitivity, 0, 1);
    this.skewScale = THREE.MathUtils.lerp(0.06, 0.2, this.s);
    this.tiltScale = THREE.MathUtils.lerp(0.12, 0.3, this.s);
    this.yawScale = THREE.MathUtils.lerp(0.1, 0.28, this.s);
    this.smoothTime = THREE.MathUtils.lerp(0.45, 0.12, this.s);
    this.yBoost = THREE.MathUtils.lerp(1.2, 1.6, this.s);
  }

  private pushScan(t: number): void {
    const arr = this.scanStarts.slice();
    if (arr.length >= this.MAX_SCANS) arr.shift();
    arr.push(t);
    this.scanStarts = arr;
    if (this.material) {
      const u = this.material.uniforms as any;
      const buf = new Array(this.MAX_SCANS).fill(0);
      for (let i = 0; i < arr.length && i < this.MAX_SCANS; i++) buf[i] = arr[i];
      u.uScanStarts.value = buf;
      u.uScanCount.value = arr.length;
    }
  }

  private initGridScan(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    this.updateSensitivity();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    const uniforms = {
      iResolution: {
        value: new THREE.Vector3(container.clientWidth, container.clientHeight, this.renderer.getPixelRatio())
      },
      iTime: { value: 0 },
      uSkew: { value: new THREE.Vector2(0, 0) },
      uTilt: { value: 0 },
      uYaw: { value: 0 },
      uLineThickness: { value: this.lineThickness },
      uLinesColor: { value: srgbColor(this.linesColor) },
      uScanColor: { value: srgbColor(this.scanColor) },
      uGridScale: { value: this.gridScale },
      uLineStyle: { value: this.lineStyle === 'dashed' ? 1 : this.lineStyle === 'dotted' ? 2 : 0 },
      uLineJitter: { value: Math.max(0, Math.min(1, this.lineJitter || 0)) },
      uScanOpacity: { value: this.scanOpacity },
      uNoise: { value: this.noiseIntensity },
      uBloomOpacity: { value: 0 },
      uScanGlow: { value: this.scanGlow },
      uScanSoftness: { value: this.scanSoftness },
      uPhaseTaper: { value: this.scanPhaseTaper },
      uScanDuration: { value: this.scanDuration },
      uScanDelay: { value: this.scanDelay },
      uScanDirection: { value: this.scanDirection === 'backward' ? 1 : this.scanDirection === 'pingpong' ? 2 : 0 },
      uScanStarts: { value: new Array(this.MAX_SCANS).fill(0) },
      uScanCount: { value: 0 }
    };

    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    scene.add(quad);

    const onResize = () => {
      if (!container || !this.renderer || !this.material) return;
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      (this.material.uniforms as any).iResolution.value.set(
        container.clientWidth,
        container.clientHeight,
        this.renderer.getPixelRatio()
      );
    };
    this.resizeHandler = onResize;
    window.addEventListener('resize', onResize);

    const onMove = (e: MouseEvent) => {
      if (this.leaveTimer) {
        clearTimeout(this.leaveTimer);
        this.leaveTimer = null;
      }
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      this.lookTarget.set(nx, ny);
    };

    const onClick = async () => {
      const nowSec = performance.now() / 1000;
      if (this.scanOnClick) this.pushScan(nowSec);
      if (
        this.enableGyro &&
        typeof window !== 'undefined' &&
        window.DeviceOrientationEvent &&
        (DeviceOrientationEvent as any).requestPermission
      ) {
        try {
          await (DeviceOrientationEvent as any).requestPermission();
        } catch {
          // noop
        }
      }
    };

    const onEnter = () => {
      if (this.leaveTimer) {
        clearTimeout(this.leaveTimer);
        this.leaveTimer = null;
      }
    };

    const onLeave = () => {
      if (this.leaveTimer) clearTimeout(this.leaveTimer);
      this.leaveTimer = window.setTimeout(
        () => {
          this.lookTarget.set(0, 0);
          this.tiltTarget = 0;
          this.yawTarget = 0;
        },
        Math.max(0, this.snapBackDelay || 0)
      ) as unknown as number;
    };

    this.mouseMoveHandler = onMove;
    this.mouseEnterHandler = onEnter;
    this.mouseLeaveHandler = onLeave;
    this.clickHandler = onClick;

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseenter', onEnter);
    if (this.scanOnClick) container.addEventListener('click', onClick);
    container.addEventListener('mouseleave', onLeave);

    if (this.enableGyro) {
      const gyroHandler = (e: DeviceOrientationEvent) => {
        const gamma = e.gamma ?? 0;
        const beta = e.beta ?? 0;
        const nx = THREE.MathUtils.clamp(gamma / 45, -1, 1);
        const ny = THREE.MathUtils.clamp(-beta / 30, -1, 1);
        this.lookTarget.set(nx, ny);
        this.tiltTarget = THREE.MathUtils.degToRad(gamma) * 0.4;
      };
      this.gyroHandler = gyroHandler;
      window.addEventListener('deviceorientation', gyroHandler);
    }

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;

      this.lookCurrent.copy(
        smoothDampVec2(this.lookCurrent, this.lookTarget, this.lookVel, this.smoothTime, this.maxSpeed, dt)
      );

      const tiltSm = smoothDampFloat(
        this.tiltCurrent,
        this.tiltTarget,
        { v: this.tiltVel },
        this.smoothTime,
        this.maxSpeed,
        dt
      );
      this.tiltCurrent = tiltSm.value;
      this.tiltVel = tiltSm.v;

      const yawSm = smoothDampFloat(
        this.yawCurrent,
        this.yawTarget,
        { v: this.yawVel },
        this.smoothTime,
        this.maxSpeed,
        dt
      );
      this.yawCurrent = yawSm.value;
      this.yawVel = yawSm.v;

      if (this.material) {
        const u = this.material.uniforms as any;
        const skew = new THREE.Vector2(
          this.lookCurrent.x * this.skewScale,
          -this.lookCurrent.y * this.yBoost * this.skewScale
        );
        u.uSkew.value.set(skew.x, skew.y);
        u.uTilt.value = this.tiltCurrent * this.tiltScale;
        u.uYaw.value = THREE.MathUtils.clamp(this.yawCurrent * this.yawScale, -0.6, 0.6);

        u.iTime.value = now / 1000;
      }

      this.renderer!.clear(true, true, true);
      this.renderer!.render(scene, camera);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
    this.initialized = true;
  }

  private cleanup(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    const container = this.containerRef?.nativeElement;
    if (container) {
      if (this.mouseMoveHandler) {
        container.removeEventListener('mousemove', this.mouseMoveHandler);
      }
      if (this.mouseEnterHandler) {
        container.removeEventListener('mouseenter', this.mouseEnterHandler);
      }
      if (this.mouseLeaveHandler) {
        container.removeEventListener('mouseleave', this.mouseLeaveHandler);
      }
      if (this.clickHandler && this.scanOnClick) {
        container.removeEventListener('click', this.clickHandler);
      }
    }

    if (this.gyroHandler) {
      window.removeEventListener('deviceorientation', this.gyroHandler);
    }

    if (this.leaveTimer) {
      clearTimeout(this.leaveTimer);
    }

    if (this.material) {
      this.material.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (container && this.renderer.domElement && container.contains(this.renderer.domElement)) {
        container.removeChild(this.renderer.domElement);
      }
    }

    this.renderer = null;
    this.material = null;
  }
}

