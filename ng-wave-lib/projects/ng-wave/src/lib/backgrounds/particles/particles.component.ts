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
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl';

const defaultColors = ['#ffffff', '#ffffff', '#ffffff'];

const hexToRgb = (hex: string): [number, number, number] => {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map(c => c + c)
            .join('');
    }
    const int = parseInt(hex, 16);
    const r = ((int >> 16) & 255) / 255;
    const g = ((int >> 8) & 255) / 255;
    const b = (int & 255) / 255;
    return [r, g, b];
};

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;
  
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vRandom = random;
    vColor = color;
    
    vec3 pos = position * uSpread;
    pos.z *= 10.0;
    
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);
    
    vec4 mvPos = viewMatrix * mPos;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }

    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  
  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    
    if(uAlphaParticles < 0.5) {
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      float circle = smoothstep(0.5, 0.4, d) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`;

@Component({
    selector: 'ngw-particles',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './particles.component.html',
    styleUrl: './particles.component.css'
})
export class ParticlesComponent implements AfterViewInit, OnDestroy, OnChanges {
    @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

    @Input() particleCount = 200;
    @Input() particleSpread = 10;
    @Input() speed = 0.1;
    @Input() particleColors: string[] = [];
    @Input() moveParticlesOnHover = false;
    @Input() particleHoverFactor = 1;
    @Input() alphaParticles = false;
    @Input() particleBaseSize = 100;
    @Input() sizeRandomness = 1;
    @Input() cameraDistance = 20;
    @Input() disableRotation = false;
    @Input() className = '';

    private readonly platformId = inject(PLATFORM_ID);
    private renderer!: Renderer;
    private camera!: Camera;
    private program!: Program;
    private particles!: Mesh;
    private animationFrameId: number | null = null;
    private lastTime = 0;
    private elapsed = 0;
    private mousePos = { x: 0, y: 0 };
    private needsReinit = false;

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.initParticles();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        // Properties that require full reinitialization
        if (
            changes['particleCount'] ||
            changes['particleColors'] ||
            changes['particleSpread'] ||
            changes['particleBaseSize'] ||
            changes['sizeRandomness'] ||
            changes['cameraDistance']
        ) {
            this.needsReinit = true;
            if (this.renderer) {
                this.cleanup();
                this.initParticles();
            }
            return;
        }

        // Properties that can be updated without reinitialization
        if (this.program) {
            if (changes['alphaParticles']) {
                this.program.uniforms['uAlphaParticles'].value = this.alphaParticles ? 1 : 0;
            }
        }
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.cleanup();
    }

    private cleanup(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        window.removeEventListener('resize', this.handleResize);

        if (this.containerRef?.nativeElement && this.renderer?.gl?.canvas) {
            try {
                this.containerRef.nativeElement.removeChild(this.renderer.gl.canvas);
            } catch {
                // Canvas already removed
            }
        }
    }

    private initParticles(): void {
        const container = this.containerRef.nativeElement;

        this.renderer = new Renderer({ depth: false, alpha: true });
        const gl = this.renderer.gl;
        container.appendChild(gl.canvas);
        gl.clearColor(0, 0, 0, 0);

        this.camera = new Camera(gl, { fov: 15 });
        this.camera.position.set(0, 0, this.cameraDistance);

        this.setSize();
        window.addEventListener('resize', this.handleResize);

        const count = this.particleCount;
        const positions = new Float32Array(count * 3);
        const randoms = new Float32Array(count * 4);
        const colors = new Float32Array(count * 3);
        const palette = this.particleColors && this.particleColors.length > 0 ? this.particleColors : defaultColors;

        for (let i = 0; i < count; i++) {
            let x, y, z, len;
            do {
                x = Math.random() * 2 - 1;
                y = Math.random() * 2 - 1;
                z = Math.random() * 2 - 1;
                len = x * x + y * y + z * z;
            } while (len > 1 || len === 0);
            const r = Math.cbrt(Math.random());
            positions.set([x * r, y * r, z * r], i * 3);
            randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
            const col = hexToRgb(palette[Math.floor(Math.random() * palette.length)]);
            colors.set(col, i * 3);
        }

        const geometry = new Geometry(gl, {
            position: { size: 3, data: positions },
            random: { size: 4, data: randoms },
            color: { size: 3, data: colors }
        });

        this.program = new Program(gl, {
            vertex,
            fragment,
            uniforms: {
                uTime: { value: 0 },
                uSpread: { value: this.particleSpread },
                uBaseSize: { value: this.particleBaseSize },
                uSizeRandomness: { value: this.sizeRandomness },
                uAlphaParticles: { value: this.alphaParticles ? 1 : 0 }
            },
            transparent: true,
            depthTest: false
        });

        this.particles = new Mesh(gl, { mode: gl.POINTS, geometry, program: this.program });

        this.lastTime = performance.now();
        this.elapsed = 0;
        this.animate();
    }

    private handleResize = (): void => {
        this.setSize();
    };

    private setSize(): void {
        if (!this.containerRef?.nativeElement || !this.renderer || !this.camera) {
            return;
        }

        const container = this.containerRef.nativeElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        this.renderer.setSize(width, height);
        const gl = this.renderer.gl;
        this.camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    }

    private animate = (): void => {
        this.animationFrameId = requestAnimationFrame(this.animate);

        if (!this.program || !this.renderer || !this.particles || !this.camera) {
            return;
        }

        const t = performance.now();
        const delta = t - this.lastTime;
        this.lastTime = t;
        this.elapsed += delta * this.speed;

        this.program.uniforms['uTime'].value = this.elapsed * 0.001;

        if (this.moveParticlesOnHover) {
            this.particles.position.x = -this.mousePos.x * this.particleHoverFactor;
            this.particles.position.y = -this.mousePos.y * this.particleHoverFactor;
        } else {
            this.particles.position.x = 0;
            this.particles.position.y = 0;
        }

        if (!this.disableRotation) {
            this.particles.rotation.x = Math.sin(this.elapsed * 0.0002) * 0.1;
            this.particles.rotation.y = Math.cos(this.elapsed * 0.0005) * 0.15;
            this.particles.rotation.z += 0.01 * this.speed;
        }

        this.renderer.render({ scene: this.particles, camera: this.camera });
    };

    @HostListener('mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        if (!this.moveParticlesOnHover || !this.containerRef?.nativeElement) {
            return;
        }

        const rect = this.containerRef.nativeElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
        this.mousePos = { x, y };
    }
}

