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
import { Renderer, Program, Triangle, Mesh } from 'ogl';

const DEFAULT_COLOR = '#ffffff';

function hexToRgb(hex: string): [number, number, number] {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
}

function getAnchorAndDir(
    origin: string,
    w: number,
    h: number
): { anchor: [number, number]; dir: [number, number] } {
    const outside = 0.2;
    switch (origin) {
        case 'top-left':
            return { anchor: [0, -outside * h], dir: [0, 1] };
        case 'top-right':
            return { anchor: [w, -outside * h], dir: [0, 1] };
        case 'left':
            return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
        case 'right':
            return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
        case 'bottom-left':
            return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
        case 'bottom-center':
            return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
        case 'bottom-right':
            return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
        default: // "top-center"
            return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
    }
}

const vert = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const frag = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  
  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  
  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  
  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor  = color;
}`;

@Component({
    selector: 'ngw-light-rays',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './light-rays.component.html',
    styleUrl: './light-rays.component.css'
})
export class LightRaysComponent implements AfterViewInit, OnDestroy, OnChanges {
    @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

    @Input() raysOrigin: 'top-center' | 'top-left' | 'top-right' | 'right' | 'left' | 'bottom-center' | 'bottom-right' | 'bottom-left' = 'top-center';
    @Input() raysColor = DEFAULT_COLOR;
    @Input() raysSpeed = 1;
    @Input() lightSpread = 0.5;
    @Input() rayLength = 2;
    @Input() pulsating = false;
    @Input() fadeDistance = 1.0;
    @Input() saturation = 1.0;
    @Input() followMouse = true;
    @Input() mouseInfluence = 0.1;
    @Input() noiseAmount = 0.0;
    @Input() distortion = 0.0;
    @Input() className = '';

    private readonly platformId = inject(PLATFORM_ID);
    private renderer: Renderer | null = null;
    private program: Program | null = null;
    private mesh: Mesh | null = null;
    private animationFrameId: number | null = null;
    private intersectionObserver: IntersectionObserver | null = null;
    private isVisible = false;
    private mousePos = { x: 0.5, y: 0.5 };
    private smoothMousePos = { x: 0.5, y: 0.5 };

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.setupIntersectionObserver();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!isPlatformBrowser(this.platformId) || !this.program) {
            return;
        }

        if (changes['raysColor']) {
            this.program.uniforms['raysColor'].value = hexToRgb(this.raysColor);
        }

        if (changes['raysSpeed']) {
            this.program.uniforms['raysSpeed'].value = this.raysSpeed;
        }

        if (changes['lightSpread']) {
            this.program.uniforms['lightSpread'].value = this.lightSpread;
        }

        if (changes['rayLength']) {
            this.program.uniforms['rayLength'].value = this.rayLength;
        }

        if (changes['pulsating']) {
            this.program.uniforms['pulsating'].value = this.pulsating ? 1.0 : 0.0;
        }

        if (changes['fadeDistance']) {
            this.program.uniforms['fadeDistance'].value = this.fadeDistance;
        }

        if (changes['saturation']) {
            this.program.uniforms['saturation'].value = this.saturation;
        }

        if (changes['mouseInfluence']) {
            this.program.uniforms['mouseInfluence'].value = this.mouseInfluence;
        }

        if (changes['noiseAmount']) {
            this.program.uniforms['noiseAmount'].value = this.noiseAmount;
        }

        if (changes['distortion']) {
            this.program.uniforms['distortion'].value = this.distortion;
        }

        if (changes['raysOrigin'] || changes['rayLength'] || changes['fadeDistance']) {
            this.updatePlacement();
        }
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('mousemove', this.handleMouseMove);

        if (this.renderer) {
            try {
                const gl = this.renderer.gl;
                const loseContextExt = gl.getExtension('WEBGL_lose_context');
                if (loseContextExt) {
                    loseContextExt.loseContext();
                }

                if (gl.canvas && gl.canvas.parentNode) {
                    gl.canvas.parentNode.removeChild(gl.canvas);
                }
            } catch {
                // Already cleaned up
            }
        }
    }

    @HostListener('window:mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        if (!this.followMouse || !this.containerRef?.nativeElement) {
            return;
        }

        const rect = this.containerRef.nativeElement.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        this.mousePos = { x, y };
    }

    private handleResize = (): void => {
        this.updatePlacement();
    };

    private handleMouseMove = (event: MouseEvent): void => {
        this.onMouseMove(event);
    };

    private setupIntersectionObserver(): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }

        this.intersectionObserver = new IntersectionObserver(
            entries => {
                const entry = entries[0];
                this.isVisible = entry.isIntersecting;
                if (this.isVisible) {
                    this.initLightRays();
                } else {
                    this.cleanup();
                }
            },
            { threshold: 0.1 }
        );

        this.intersectionObserver.observe(this.containerRef.nativeElement);
    }

    private updatePlacement(): void {
        if (!this.containerRef?.nativeElement || !this.renderer || !this.program) {
            return;
        }

        const container = this.containerRef.nativeElement;
        const { clientWidth: wCSS, clientHeight: hCSS } = container;
        this.renderer.setSize(wCSS, hCSS);

        const dpr = this.renderer.dpr;
        const w = wCSS * dpr;
        const h = hCSS * dpr;

        this.program.uniforms['iResolution'].value = [w, h];

        const { anchor, dir } = getAnchorAndDir(this.raysOrigin, w, h);
        this.program.uniforms['rayPos'].value = anchor;
        this.program.uniforms['rayDir'].value = dir;
    }

    private initLightRays(): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }

        const container = this.containerRef.nativeElement;

        this.renderer = new Renderer({
            dpr: Math.min(window.devicePixelRatio, 2),
            alpha: true
        });

        const gl = this.renderer.gl;
        gl.canvas.style.width = '100%';
        gl.canvas.style.height = '100%';

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(gl.canvas);

        const uniforms = {
            iTime: { value: 0 },
            iResolution: { value: [1, 1] },
            rayPos: { value: [0, 0] },
            rayDir: { value: [0, 1] },
            raysColor: { value: hexToRgb(this.raysColor) },
            raysSpeed: { value: this.raysSpeed },
            lightSpread: { value: this.lightSpread },
            rayLength: { value: this.rayLength },
            pulsating: { value: this.pulsating ? 1.0 : 0.0 },
            fadeDistance: { value: this.fadeDistance },
            saturation: { value: this.saturation },
            mousePos: { value: [0.5, 0.5] },
            mouseInfluence: { value: this.mouseInfluence },
            noiseAmount: { value: this.noiseAmount },
            distortion: { value: this.distortion }
        };

        const geometry = new Triangle(gl);
        this.program = new Program(gl, {
            vertex: vert,
            fragment: frag,
            uniforms
        });
        this.mesh = new Mesh(gl, { geometry, program: this.program });

        this.updatePlacement();
        window.addEventListener('resize', this.handleResize);
        if (this.followMouse) {
            window.addEventListener('mousemove', this.handleMouseMove);
        }

        this.animate();
    }

    private animate = (): void => {
        this.animationFrameId = requestAnimationFrame(this.animate);

        if (!this.renderer || !this.program || !this.mesh) {
            return;
        }

        const t = performance.now();
        this.program.uniforms['iTime'].value = t * 0.001;

        if (this.followMouse && this.mouseInfluence > 0.0) {
            const smoothing = 0.92;
            this.smoothMousePos.x = this.smoothMousePos.x * smoothing + this.mousePos.x * (1 - smoothing);
            this.smoothMousePos.y = this.smoothMousePos.y * smoothing + this.mousePos.y * (1 - smoothing);
            this.program.uniforms['mousePos'].value = [this.smoothMousePos.x, this.smoothMousePos.y];
        }

        try {
            this.renderer.render({ scene: this.mesh });
        } catch (error) {
            console.warn('WebGL rendering error:', error);
        }
    };

    private cleanup(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('mousemove', this.handleMouseMove);

        if (this.renderer) {
            try {
                const gl = this.renderer.gl;
                const loseContextExt = gl.getExtension('WEBGL_lose_context');
                if (loseContextExt) {
                    loseContextExt.loseContext();
                }

                if (gl.canvas && gl.canvas.parentNode) {
                    gl.canvas.parentNode.removeChild(gl.canvas);
                }
            } catch {
                // Already cleaned up
            }
        }

        this.renderer = null;
        this.program = null;
        this.mesh = null;
    }
}

