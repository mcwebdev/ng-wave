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
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

#define PI 3.14159265359

uniform float iTime;
uniform vec3 iResolution;
uniform float uSpinRotation;
uniform float uSpinSpeed;
uniform vec2 uOffset;
uniform vec4 uColor1;
uniform vec4 uColor2;
uniform vec4 uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSpinAmount;
uniform float uPixelFilter;
uniform float uSpinEase;
uniform bool uIsRotate;
uniform vec2 uMouse;

varying vec2 vUv;

vec4 effect(vec2 screenSize, vec2 screen_coords) {
    float pixel_size = length(screenSize.xy) / uPixelFilter;
    vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize.xy) / length(screenSize.xy) - uOffset;
    float uv_len = length(uv);
    
    float speed = (uSpinRotation * uSpinEase * 0.2);
    if(uIsRotate){
       speed = iTime * speed;
    }
    speed += 302.2;
    
    float mouseInfluence = (uMouse.x * 2.0 - 1.0);
    speed += mouseInfluence * 0.1;
    
    float new_pixel_angle = atan(uv.y, uv.x) + speed - uSpinEase * 20.0 * (uSpinAmount * uv_len + (1.0 - uSpinAmount));
    vec2 mid = (screenSize.xy / length(screenSize.xy)) / 2.0;
    uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);
    
    uv *= 30.0;
    float baseSpeed = iTime * uSpinSpeed;
    speed = baseSpeed + mouseInfluence * 2.0;
    
    vec2 uv2 = vec2(uv.x + uv.y);
    
    for(int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(
            cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
            sin(uv2.x - 0.113 * speed)
        );
        uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
    }
    
    float contrast_mod = (0.25 * uContrast + 0.5 * uSpinAmount + 1.2);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);
    float light = (uLighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + uLighting * max(c2p * 5.0 - 4.0, 0.0);
    
    return (0.3 / uContrast) * uColor1 + (1.0 - 0.3 / uContrast) * (uColor1 * c1p + uColor2 * c2p + vec4(c3p * uColor3.rgb, c3p * uColor1.a)) + light;
}

void main() {
    vec2 uv = vUv * iResolution.xy;
    gl_FragColor = effect(iResolution.xy, uv);
}
`;

function hexToVec4(hex: string): [number, number, number, number] {
    const hexStr = hex.replace('#', '');
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 1;
    if (hexStr.length === 6) {
        r = parseInt(hexStr.slice(0, 2), 16) / 255;
        g = parseInt(hexStr.slice(2, 4), 16) / 255;
        b = parseInt(hexStr.slice(4, 6), 16) / 255;
    } else if (hexStr.length === 8) {
        r = parseInt(hexStr.slice(0, 2), 16) / 255;
        g = parseInt(hexStr.slice(2, 4), 16) / 255;
        b = parseInt(hexStr.slice(4, 6), 16) / 255;
        a = parseInt(hexStr.slice(6, 8), 16) / 255;
    }
    return [r, g, b, a];
}

@Component({
    selector: 'ngw-balatro',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './balatro.component.html',
    styleUrl: './balatro.component.css'
})
export class BalatroComponent implements AfterViewInit, OnDestroy, OnChanges {
    @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

    @Input() spinRotation = -2.0;
    @Input() spinSpeed = 7.0;
    @Input() offset: [number, number] = [0.0, 0.0];
    @Input() color1 = '#DE443B';
    @Input() color2 = '#006BB4';
    @Input() color3 = '#162325';
    @Input() contrast = 3.5;
    @Input() lighting = 0.4;
    @Input() spinAmount = 0.25;
    @Input() pixelFilter = 745.0;
    @Input() spinEase = 1.0;
    @Input() isRotate = false;
    @Input() mouseInteraction = true;
    @Input() className = '';

    private readonly platformId = inject(PLATFORM_ID);
    private renderer: Renderer | null = null;
    private program: Program | null = null;
    private mesh: Mesh | null = null;
    private animationFrameId: number | null = null;
    private mousePos: [number, number] = [0.5, 0.5];

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.initBalatro();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!isPlatformBrowser(this.platformId) || !this.program) {
            return;
        }

        if (changes['spinRotation']) {
            this.program.uniforms['uSpinRotation'].value = this.spinRotation;
        }

        if (changes['spinSpeed']) {
            this.program.uniforms['uSpinSpeed'].value = this.spinSpeed;
        }

        if (changes['offset']) {
            const offsetUniform = this.program.uniforms['uOffset'].value as Float32Array;
            offsetUniform[0] = this.offset[0];
            offsetUniform[1] = this.offset[1];
        }

        if (changes['color1']) {
            this.program.uniforms['uColor1'].value = hexToVec4(this.color1);
        }

        if (changes['color2']) {
            this.program.uniforms['uColor2'].value = hexToVec4(this.color2);
        }

        if (changes['color3']) {
            this.program.uniforms['uColor3'].value = hexToVec4(this.color3);
        }

        if (changes['contrast']) {
            this.program.uniforms['uContrast'].value = this.contrast;
        }

        if (changes['lighting']) {
            this.program.uniforms['uLighting'].value = this.lighting;
        }

        if (changes['spinAmount']) {
            this.program.uniforms['uSpinAmount'].value = this.spinAmount;
        }

        if (changes['pixelFilter']) {
            this.program.uniforms['uPixelFilter'].value = this.pixelFilter;
        }

        if (changes['spinEase']) {
            this.program.uniforms['uSpinEase'].value = this.spinEase;
        }

        if (changes['isRotate']) {
            this.program.uniforms['uIsRotate'].value = this.isRotate;
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
                this.containerRef.nativeElement.removeEventListener('mousemove', this.handleMouseMove);
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

    @HostListener('mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        if (!this.mouseInteraction || !this.containerRef?.nativeElement || !this.program) {
            return;
        }

        const container = this.containerRef.nativeElement;
        const rect = container.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = 1.0 - (event.clientY - rect.top) / rect.height;
        this.mousePos = [x, y];
        const mouseUniform = this.program.uniforms['uMouse'].value as Float32Array;
        mouseUniform[0] = x;
        mouseUniform[1] = y;
    }

    private handleResize = (): void => {
        this.setSize();
    };

    private handleMouseMove = (e: MouseEvent): void => {
        this.onMouseMove(e);
    };

    private setSize(): void {
        if (!this.containerRef?.nativeElement || !this.renderer || !this.program) {
            return;
        }

        const container = this.containerRef.nativeElement;
        this.renderer.setSize(container.offsetWidth, container.offsetHeight);
        const gl = this.renderer.gl;
        const res = this.program.uniforms['iResolution'].value as Float32Array;
        res[0] = gl.canvas.width;
        res[1] = gl.canvas.height;
        res[2] = gl.canvas.width / gl.canvas.height;
    }

    private initBalatro(): void {
        const container = this.containerRef.nativeElement;
        if (!container) {
            return;
        }

        this.renderer = new Renderer();
        const gl = this.renderer.gl;
        gl.canvas.style.width = '100%';
        gl.canvas.style.height = '100%';
        gl.canvas.style.display = 'block';
        gl.clearColor(0, 0, 0, 1);
        container.appendChild(gl.canvas);

        this.setSize();
        window.addEventListener('resize', this.handleResize);
        container.addEventListener('mousemove', this.handleMouseMove);

        const geometry = new Triangle(gl);
        this.program = new Program(gl, {
            vertex: vertexShader,
            fragment: fragmentShader,
            uniforms: {
                iTime: { value: 0 },
                iResolution: {
                    value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height]
                },
                uSpinRotation: { value: this.spinRotation },
                uSpinSpeed: { value: this.spinSpeed },
                uOffset: { value: new Float32Array(this.offset) },
                uColor1: { value: hexToVec4(this.color1) },
                uColor2: { value: hexToVec4(this.color2) },
                uColor3: { value: hexToVec4(this.color3) },
                uContrast: { value: this.contrast },
                uLighting: { value: this.lighting },
                uSpinAmount: { value: this.spinAmount },
                uPixelFilter: { value: this.pixelFilter },
                uSpinEase: { value: this.spinEase },
                uIsRotate: { value: this.isRotate },
                uMouse: { value: new Float32Array(this.mousePos) }
            }
        });

        this.mesh = new Mesh(gl, { geometry, program: this.program });
        this.animate();
    }

    private animate = (): void => {
        this.animationFrameId = requestAnimationFrame(this.animate);

        if (!this.program || !this.renderer || !this.mesh) {
            return;
        }

        this.program.uniforms['iTime'].value = performance.now() * 0.001;
        this.renderer.render({ scene: this.mesh });
    };
}

