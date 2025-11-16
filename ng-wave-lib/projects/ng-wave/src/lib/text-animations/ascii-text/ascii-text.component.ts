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
import * as THREE from 'three';

const PX_RATIO = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float mouse;
uniform float uEnableWaves;

void main() {
    vUv = uv;
    float time = uTime * 5.;

    float waveFactor = uEnableWaves;

    vec3 transformed = position;

    transformed.x += sin(time + position.y) * 0.5 * waveFactor;
    transformed.y += cos(time + position.z) * 0.15 * waveFactor;
    transformed.z += sin(time + position.x) * waveFactor;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform float mouse;
uniform float uTime;
uniform sampler2D uTexture;

void main() {
    float time = uTime;
    vec2 pos = vUv;
    
    float move = sin(time + mouse) * 0.01;
    float r = texture2D(uTexture, pos + cos(time * 2. - time + pos.x) * .01).r;
    float g = texture2D(uTexture, pos + tan(time * .5 + pos.x - time) * .01).g;
    float b = texture2D(uTexture, pos - cos(time * 2. + time + pos.y) * .01).b;
    float a = texture2D(uTexture, pos).a;
    gl_FragColor = vec4(r, g, b, a);
}
`;

class AsciiFilter {
    renderer: THREE.WebGLRenderer;
    domElement: HTMLDivElement;
    pre: HTMLPreElement;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    deg = 0;
    invert: boolean;
    fontSize: number;
    fontFamily: string;
    charset: string;
    width = 0;
    height = 0;
    cols = 0;
    rows = 0;
    center = { x: 0, y: 0 };
    mouse = { x: 0, y: 0 };
    onMouseMove: (e: MouseEvent) => void;
    gradient?: string | { type: 'linear' | 'radial'; colors: string[]; stops?: number[] };

    constructor(renderer: THREE.WebGLRenderer, { fontSize, fontFamily, charset, invert } = {} as any) {
        this.renderer = renderer;
        this.domElement = document.createElement('div');
        this.domElement.style.position = 'absolute';
        this.domElement.style.top = '0';
        this.domElement.style.left = '0';
        this.domElement.style.width = '100%';
        this.domElement.style.height = '100%';

        this.pre = document.createElement('pre');
        this.domElement.appendChild(this.pre);

        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d')!;
        this.domElement.appendChild(this.canvas);

        this.invert = invert ?? true;
        this.fontSize = fontSize ?? 8;
        this.fontFamily = fontFamily ?? "'Courier New', monospace";
        this.charset = charset ?? ' .\'`^",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

        this.context.imageSmoothingEnabled = false;
        (this.context as any).webkitImageSmoothingEnabled = false;
        (this.context as any).mozImageSmoothingEnabled = false;
        (this.context as any).msImageSmoothingEnabled = false;

        this.onMouseMove = (e: MouseEvent) => {
            this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO };
        };
        document.addEventListener('mousemove', this.onMouseMove);
    }

    setSize(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.renderer.setSize(width, height);
        this.reset();

        this.center = { x: width / 2, y: height / 2 };
        this.mouse = { x: this.center.x, y: this.center.y };
    }

    reset(): void {
        this.context.font = `${this.fontSize}px ${this.fontFamily}`;
        const charWidth = this.context.measureText('A').width;

        this.cols = Math.floor(this.width / (this.fontSize * (charWidth / this.fontSize)));
        this.rows = Math.floor(this.height / this.fontSize);

        this.canvas.width = this.cols;
        this.canvas.height = this.rows;
        this.pre.style.fontFamily = this.fontFamily;
        this.pre.style.fontSize = `${this.fontSize}px`;
        this.pre.style.margin = '0';
        this.pre.style.padding = '0';
        this.pre.style.lineHeight = '1em';
        this.pre.style.position = 'absolute';
        this.pre.style.left = '50%';
        this.pre.style.top = '50%';
        this.pre.style.transform = 'translate(-50%, -50%)';
        this.pre.style.zIndex = '9';
        this.pre.style.backgroundAttachment = 'fixed';
        this.pre.style.mixBlendMode = 'difference';
        this.updateGradient();
    }

    updateGradient(gradient?: string | { type: 'linear' | 'radial'; colors: string[]; stops?: number[] }): void {
        this.gradient = gradient;
        if (!gradient) {
            this.pre.style.backgroundImage = 'none';
            this.pre.style.webkitTextFillColor = '';
            this.pre.style.webkitBackgroundClip = '';
            this.pre.style.backgroundClip = '';
            this.pre.style.color = '#fdf9f3';
            return;
        }

        if (typeof gradient === 'object' && 'type' in gradient && 'colors' in gradient) {
            const gradientConfig = gradient;
            let gradientString: string;

            if (gradientConfig.type === 'linear') {
                gradientString = `linear-gradient(to right, ${gradientConfig.colors.join(', ')})`;
            } else {
                gradientString = `radial-gradient(circle, ${gradientConfig.colors.join(', ')})`;
            }

            this.pre.style.backgroundImage = gradientString;
            this.pre.style.webkitTextFillColor = 'transparent';
            this.pre.style.webkitBackgroundClip = 'text';
            this.pre.style.backgroundClip = 'text';
            this.pre.style.color = 'transparent';
            // Force repaint
            this.pre.style.display = 'none';
            this.pre.offsetHeight; // Trigger reflow
            this.pre.style.display = '';
        }
    }

    render(scene: THREE.Scene, camera: THREE.Camera): void {
        this.renderer.render(scene, camera);

        const w = this.canvas.width;
        const h = this.canvas.height;
        this.context.clearRect(0, 0, w, h);
        if (this.context && w && h) {
            this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
        }

        this.asciify(this.context, w, h);
        this.hue();
    }

    get dx(): number {
        return this.mouse.x - this.center.x;
    }

    get dy(): number {
        return this.mouse.y - this.center.y;
    }

    hue(): void {
        const deg = (Math.atan2(this.dy, this.dx) * 180) / Math.PI;
        this.deg += (deg - this.deg) * 0.075;
        this.domElement.style.filter = `hue-rotate(${this.deg.toFixed(1)}deg)`;
    }

    asciify(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        if (w && h) {
            const imgData = ctx.getImageData(0, 0, w, h).data;
            let str = '';
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const i = x * 4 + y * 4 * w;
                    const [r, g, b, a] = [imgData[i], imgData[i + 1], imgData[i + 2], imgData[i + 3]];

                    if (a === 0) {
                        str += ' ';
                        continue;
                    }

                    let gray = (0.3 * r + 0.6 * g + 0.1 * b) / 255;
                    let idx = Math.floor((1 - gray) * (this.charset.length - 1));
                    if (this.invert) idx = this.charset.length - idx - 1;
                    str += this.charset[idx];
                }
                str += '\n';
            }
            this.pre.innerHTML = str;
        }
    }

    dispose(): void {
        document.removeEventListener('mousemove', this.onMouseMove);
    }
}

class CanvasTxt {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    txt: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    gradient?: string | { type: 'linear' | 'radial'; colors: string[]; stops?: number[] };
    font: string;

    constructor(txt: string, { fontSize = 200, fontFamily = 'Arial', color = '#fdf9f3', gradient } = {} as any) {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d')!;
        this.txt = txt;
        this.fontSize = fontSize;
        this.fontFamily = fontFamily;
        this.color = color;
        this.gradient = gradient;

        this.font = `600 ${this.fontSize}px ${this.fontFamily}`;
    }

    resize(): void {
        this.context.font = this.font;
        const metrics = this.context.measureText(this.txt);

        const textWidth = Math.ceil(metrics.width) + 20;
        const textHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + 20;

        this.canvas.width = textWidth;
        this.canvas.height = textHeight;
    }

    render(): void {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.font = this.font;

        const metrics = this.context.measureText(this.txt);
        const yPos = 10 + metrics.actualBoundingBoxAscent;

        if (this.gradient && typeof this.gradient === 'object' && 'type' in this.gradient && 'colors' in this.gradient) {
            // Create gradient
            const gradientConfig = this.gradient;
            let gradientObj: CanvasGradient;
            if (gradientConfig.type === 'linear') {
                gradientObj = this.context.createLinearGradient(0, 0, this.canvas.width, 0);
            } else {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const radius = Math.max(this.canvas.width, this.canvas.height) / 2;
                gradientObj = this.context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            }

            const stops = gradientConfig.stops || gradientConfig.colors.map((_: string, i: number) => i / (gradientConfig.colors.length - 1));
            gradientConfig.colors.forEach((color: string, i: number) => {
                gradientObj.addColorStop(stops[i] || i / (gradientConfig.colors.length - 1), color);
            });

            this.context.fillStyle = gradientObj;
        } else if (this.gradient && typeof this.gradient === 'string') {
            // Predefined gradient - parse it
            this.context.fillStyle = this.color; // Fallback to color for now
        } else {
            this.context.fillStyle = this.color;
        }

        this.context.fillText(this.txt, 10, yPos);
    }

    get width(): number {
        return this.canvas.width;
    }

    get height(): number {
        return this.canvas.height;
    }

    get texture(): HTMLCanvasElement {
        return this.canvas;
    }
}

class CanvAscii {
    textString: string;
    asciiFontSize: number;
    textFontSize: number;
    textColor: string;
    gradient?: string | { type: 'linear' | 'radial'; colors: string[]; stops?: number[] };
    planeBaseHeight: number;
    container: HTMLElement;
    width: number;
    height: number;
    enableWaves: boolean;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    mouse: { x: number; y: number };
    textCanvas!: CanvasTxt;
    texture!: THREE.CanvasTexture;
    geometry!: THREE.PlaneGeometry;
    material!: THREE.ShaderMaterial;
    mesh!: THREE.Mesh;
    renderer!: THREE.WebGLRenderer;
    filter!: AsciiFilter;
    center: { x: number; y: number } = { x: 0, y: 0 };
    animationFrameId?: number;
    onMouseMove!: (evt: MouseEvent | TouchEvent) => void;

    constructor(
        { text, asciiFontSize, textFontSize, textColor, gradient, planeBaseHeight, enableWaves }: any,
        containerElem: HTMLElement,
        width: number,
        height: number
    ) {
        this.textString = text;
        this.asciiFontSize = asciiFontSize;
        this.textFontSize = textFontSize;
        this.textColor = textColor;
        this.gradient = gradient;
        this.planeBaseHeight = planeBaseHeight;
        this.container = containerElem;
        this.width = width;
        this.height = height;
        this.enableWaves = enableWaves;

        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1000);
        this.camera.position.z = 30;

        this.scene = new THREE.Scene();
        this.mouse = { x: this.width / 2, y: this.height / 2 };

        this.onMouseMove = (evt: MouseEvent | TouchEvent) => {
            const e = (evt as TouchEvent).touches ? (evt as TouchEvent).touches[0] : (evt as MouseEvent);
            const bounds = this.container.getBoundingClientRect();
            const x = e.clientX - bounds.left;
            const y = e.clientY - bounds.top;
            this.mouse = { x, y };
        };

        this.setMesh();
        this.setRenderer();
    }

    setMesh(): void {
        this.textCanvas = new CanvasTxt(this.textString, {
            fontSize: this.textFontSize,
            fontFamily: 'IBM Plex Mono',
            color: this.textColor,
            gradient: this.gradient
        });
        this.textCanvas.resize();
        this.textCanvas.render();

        this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
        this.texture.minFilter = THREE.NearestFilter;

        const textAspect = this.textCanvas.width / this.textCanvas.height;
        const baseH = this.planeBaseHeight;
        const planeW = baseH * textAspect;
        const planeH = baseH;

        // Scale plane to fit within container, ensuring nothing is clipped
        const containerAspect = this.width / this.height;
        const planeAspect = planeW / planeH;

        let finalPlaneW = planeW;
        let finalPlaneH = planeH;

        // If plane is wider than container, scale down width
        if (planeAspect > containerAspect) {
            finalPlaneW = baseH * containerAspect;
            finalPlaneH = baseH;
        } else {
            // If plane is taller than container, scale down height
            finalPlaneH = (baseH * textAspect) / containerAspect;
            finalPlaneW = baseH * textAspect;
        }

        this.geometry = new THREE.PlaneGeometry(finalPlaneW, finalPlaneH, 36, 36);
        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            uniforms: {
                uTime: { value: 0 },
                mouse: { value: 1.0 },
                uTexture: { value: this.texture },
                uEnableWaves: { value: this.enableWaves ? 1.0 : 0.0 }
            }
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.rotation.x = 0;
        this.mesh.rotation.y = 0;
        this.mesh.rotation.z = 0;
        this.scene.add(this.mesh);
    }

    setRenderer(): void {
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.setPixelRatio(1);
        this.renderer.setClearColor(0x000000, 0);

        this.filter = new AsciiFilter(this.renderer, {
            fontFamily: 'IBM Plex Mono',
            fontSize: this.asciiFontSize,
            invert: true
        });
        if (this.gradient) {
            this.filter.updateGradient(this.gradient);
        }

        this.container.appendChild(this.filter.domElement);
        this.setSize(this.width, this.height);

        this.container.addEventListener('mousemove', this.onMouseMove);
        this.container.addEventListener('touchmove', this.onMouseMove);
    }

    setSize(w: number, h: number): void {
        this.width = w;
        this.height = h;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.filter.setSize(w, h);

        this.center = { x: w / 2, y: h / 2 };
        this.mouse = { x: w / 2, y: h / 2 };
    }

    updateGradient(gradient?: string | { type: 'linear' | 'radial'; colors: string[]; stops?: number[] }): void {
        this.gradient = gradient;
        if (this.textCanvas) {
            this.textCanvas.gradient = gradient;
            this.textCanvas.render();
            if (this.texture) {
                this.texture.needsUpdate = true;
            }
        }
        if (this.filter) {
            this.filter.updateGradient(gradient);
        }
    }

    updateTextFontSize(textFontSize: number): void {
        if (this.textFontSize === textFontSize) return;
        const oldFontSize = this.textFontSize;
        this.textFontSize = textFontSize;
        if (this.textCanvas) {
            this.textCanvas.fontSize = textFontSize;
            this.textCanvas.font = `600 ${textFontSize}px ${this.textCanvas.fontFamily}`;
            this.textCanvas.resize();
            this.textCanvas.render();

            // Recreate texture with new dimensions to avoid WebGL errors
            if (this.texture) {
                this.texture.dispose();
            }
            this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
            this.texture.minFilter = THREE.NearestFilter;
            this.material.uniforms['uTexture'].value = this.texture;

            // Scale mesh geometry proportionally to font size change
            const scaleFactor = textFontSize / oldFontSize;
            const textAspect = this.textCanvas.width / this.textCanvas.height;
            const baseH = this.planeBaseHeight * scaleFactor;
            const planeW = baseH * textAspect;
            const planeH = baseH;

            // Scale plane to fit within container, ensuring nothing is clipped
            const containerAspect = this.width / this.height;
            const planeAspect = planeW / planeH;

            let finalPlaneW = planeW;
            let finalPlaneH = planeH;

            // If plane is wider than container, scale down width
            if (planeAspect > containerAspect) {
                finalPlaneW = baseH * containerAspect;
                finalPlaneH = baseH;
            } else {
                // If plane is taller than container, scale down height
                finalPlaneH = (baseH * textAspect) / containerAspect;
                finalPlaneW = baseH * textAspect;
            }

            this.geometry.dispose();
            this.geometry = new THREE.PlaneGeometry(finalPlaneW, finalPlaneH, 36, 36);
            this.mesh.geometry = this.geometry;
        }
    }

    load(): void {
        this.animate();
    }

    map(n: number, start: number, stop: number, start2: number, stop2: number): number {
        return ((n - start) / (stop - start)) * (stop2 - start2) + start2;
    }

    animate(): void {
        const animateFrame = () => {
            this.animationFrameId = requestAnimationFrame(animateFrame);
            this.render();
        };
        animateFrame();
    }

    render(): void {
        const time = new Date().getTime() * 0.001;

        this.textCanvas.render();
        this.texture.needsUpdate = true;

        (this.material.uniforms['uTime'] as any).value = Math.sin(time);

        this.updateRotation();
        this.filter.render(this.scene, this.camera);
    }

    updateRotation(): void {
        const x = this.map(this.mouse.y, 0, this.height, 0.5, -0.5);
        const y = this.map(this.mouse.x, 0, this.width, -0.5, 0.5);

        this.mesh.rotation.x += (x - this.mesh.rotation.x) * 0.05;
        this.mesh.rotation.y += (y - this.mesh.rotation.y) * 0.05;
    }

    clear(): void {
        this.scene.traverse(obj => {
            if ((obj as any).isMesh && typeof (obj as any).material === 'object' && (obj as any).material !== null) {
                Object.keys((obj as any).material).forEach(key => {
                    const matProp = (obj as any).material[key];
                    if (matProp !== null && typeof matProp === 'object' && typeof matProp.dispose === 'function') {
                        matProp.dispose();
                    }
                });
                (obj as any).material.dispose();
                (obj as any).geometry.dispose();
            }
        });
        this.scene.clear();
    }

    dispose(): void {
        if (this.animationFrameId !== undefined) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.filter.dispose();
        if (this.filter.domElement.parentElement) {
            this.container.removeChild(this.filter.domElement);
        }
        this.container.removeEventListener('mousemove', this.onMouseMove);
        this.container.removeEventListener('touchmove', this.onMouseMove);
        this.clear();
        this.renderer.dispose();
    }
}

@Component({
    selector: 'ngw-ascii-text',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ascii-text.component.html',
    styleUrl: './ascii-text.component.css'
})
export class ASCIITextComponent implements AfterViewInit, OnDestroy, OnChanges {
    @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

    @Input() text = 'David!';
    @Input() asciiFontSize = 2;
    @Input() textFontSize = 200;
    @Input() textColor = '#fdf9f3';
    @Input() gradient?: string | { type: 'linear' | 'radial'; colors: string[]; stops?: number[] };
    @Input() planeBaseHeight = 8;
    @Input() enableWaves = true;

    private readonly platformId = inject(PLATFORM_ID);
    private asciiInstance?: CanvAscii;
    private observer?: IntersectionObserver;
    private resizeObserver?: ResizeObserver;

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.asciiInstance) return;

        if (changes['gradient'] && !changes['gradient'].firstChange) {
            this.asciiInstance.updateGradient(this.gradient);
        }

        if (changes['textFontSize'] && !changes['textFontSize'].firstChange) {
            this.asciiInstance.updateTextFontSize(this.textFontSize);
        }

        if (changes['asciiFontSize'] && !changes['asciiFontSize'].firstChange) {
            // Recreate the instance if ASCII font size changes
            const { width, height } = this.containerRef.nativeElement.getBoundingClientRect();
            if (width > 0 && height > 0) {
                this.cleanup();
                this.initAscii(width, height);
            }
        }
    }

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        if (!this.containerRef?.nativeElement) {
            return;
        }

        const { width, height } = this.containerRef.nativeElement.getBoundingClientRect();

        if (width === 0 || height === 0) {
            this.observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0) {
                        const { width: w, height: h } = entry.boundingClientRect;
                        this.initAscii(w, h);
                        this.observer?.disconnect();
                    }
                },
                { threshold: 0.1 }
            );
            this.observer.observe(this.containerRef.nativeElement);
        } else {
            this.initAscii(width, height);
        }

        this.resizeObserver = new ResizeObserver(entries => {
            if (!entries[0] || !this.asciiInstance) return;
            const { width: w, height: h } = entries[0].contentRect;
            if (w > 0 && h > 0) {
                this.asciiInstance.setSize(w, h);
            }
        });
        this.resizeObserver.observe(this.containerRef.nativeElement);
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
    }

    private initAscii(width: number, height: number): void {
        if (!this.containerRef?.nativeElement) {
            return;
        }

        this.asciiInstance = new CanvAscii(
            {
                text: this.text,
                asciiFontSize: this.asciiFontSize,
                textFontSize: this.textFontSize,
                textColor: this.textColor,
                gradient: this.gradient,
                planeBaseHeight: this.planeBaseHeight,
                enableWaves: this.enableWaves
            },
            this.containerRef.nativeElement,
            width,
            height
        );
        this.asciiInstance.load();
    }

    private cleanup(): void {
        if (this.observer) {
            this.observer.disconnect();
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        if (this.asciiInstance) {
            this.asciiInstance.dispose();
        }
    }
}

