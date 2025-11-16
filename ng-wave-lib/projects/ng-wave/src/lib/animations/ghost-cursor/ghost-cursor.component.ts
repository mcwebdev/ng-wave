import {
    Component,
    Input,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    inject,
    PLATFORM_ID,
    computed
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

@Component({
    selector: 'ngw-ghost-cursor',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ghost-cursor.component.html',
    styleUrl: './ghost-cursor.component.css'
})
export class GhostCursorComponent implements AfterViewInit, OnDestroy {
    @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

    @Input() className = '';
    @Input() style: Record<string, string> = {};
    @Input() trailLength = 50;
    @Input() inertia = 0.5;
    @Input() grainIntensity = 0.05;
    @Input() bloomStrength = 0.1;
    @Input() bloomRadius = 1.0;
    @Input() bloomThreshold = 0.025;
    @Input() brightness = 1;
    @Input() color = '#B19EEF';
    @Input() mixBlendMode = 'screen';
    @Input() edgeIntensity = 0;
    @Input() maxDevicePixelRatio = 0.5;
    @Input() targetPixels?: number;
    @Input() fadeDelayMs?: number;
    @Input() fadeDurationMs?: number;
    @Input() zIndex = 10;

    private readonly platformId = inject(PLATFORM_ID);
    private renderer?: THREE.WebGLRenderer;
    private composer?: EffectComposer;
    private material?: THREE.ShaderMaterial;
    private bloomPass?: UnrealBloomPass;
    private filmPass?: ShaderPass;
    private scene?: THREE.Scene;
    private camera?: THREE.OrthographicCamera;
    private mesh?: THREE.Mesh;
    private geometry?: THREE.PlaneGeometry;
    private rafId?: number;
    private resizeObserver?: ResizeObserver;
    private trailBuf: THREE.Vector2[] = [];
    private head = 0;
    private currentMouse = new THREE.Vector2(0.5, 0.5);
    private velocity = new THREE.Vector2(0, 0);
    private fadeOpacity = 1.0;
    private lastMoveTime = 0;
    private pointerActive = false;
    private running = false;
    private startTime = 0;
    private parentElement?: HTMLElement;
    private prevParentPos = '';

    readonly isTouch = computed(() => {
        if (!isPlatformBrowser(this.platformId)) {
            return false;
        }
        return 'ontouchstart' in window || (navigator as any).maxTouchPoints > 0;
    });

    readonly pixelBudget = computed(() => this.targetPixels ?? (this.isTouch() ? 0.9e6 : 1.3e6));
    readonly fadeDelay = computed(() => this.fadeDelayMs ?? (this.isTouch() ? 500 : 1000));
    readonly fadeDuration = computed(() => this.fadeDurationMs ?? (this.isTouch() ? 1000 : 1500));

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.init();
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.cleanup();
    }

    private init(): void {
        const host = this.containerRef?.nativeElement;
        this.parentElement = host?.parentElement || undefined;
        if (!host || !this.parentElement) {
            return;
        }

        this.prevParentPos = this.parentElement.style.position;
        if (!this.prevParentPos || this.prevParentPos === 'static') {
            this.parentElement.style.position = 'relative';
        }

        this.renderer = new THREE.WebGLRenderer({
            antialias: !this.isTouch(),
            alpha: true,
            depth: false,
            stencil: false,
            powerPreference: this.isTouch() ? 'low-power' : 'high-performance',
            premultipliedAlpha: false,
            preserveDrawingBuffer: false
        });
        this.renderer.setClearColor(0x000000, 0);

        this.renderer.domElement.style.pointerEvents = 'none';
        if (this.mixBlendMode) {
            this.renderer.domElement.style.mixBlendMode = String(this.mixBlendMode);
        }

        host.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this.geometry = new THREE.PlaneGeometry(2, 2);

        const maxTrail = Math.max(1, Math.floor(this.trailLength));
        this.trailBuf = Array.from({ length: maxTrail }, () => new THREE.Vector2(0.5, 0.5));
        this.head = 0;

        const baseColor = new THREE.Color(this.color);

        const fragmentShader = this.getFragmentShader(maxTrail);

        this.material = new THREE.ShaderMaterial({
            defines: { MAX_TRAIL_LENGTH: maxTrail },
            uniforms: {
                iTime: { value: 0 },
                iResolution: { value: new THREE.Vector3(1, 1, 1) },
                iMouse: { value: new THREE.Vector2(0.5, 0.5) },
                iPrevMouse: { value: this.trailBuf.map(v => v.clone()) },
                iOpacity: { value: 1.0 },
                iScale: { value: 1.0 },
                iBaseColor: { value: new THREE.Vector3(baseColor.r, baseColor.g, baseColor.b) },
                iBrightness: { value: this.brightness },
                iEdgeIntensity: { value: this.edgeIntensity }
            },
            vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
            fragmentShader,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), this.bloomStrength, this.bloomRadius, this.bloomThreshold);
        this.composer.addPass(this.bloomPass);

        const filmGrainShader = this.getFilmGrainShader();
        this.filmPass = new ShaderPass(filmGrainShader);
        this.composer.addPass(this.filmPass);

        const unpremultiplyPass = new ShaderPass({
            uniforms: { tDiffuse: { value: null } },
            vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main(){
          vec4 c = texture2D(tDiffuse, vUv);
          float a = max(c.a, 1e-5);
          vec3 straight = c.rgb / a;
          gl_FragColor = vec4(clamp(straight, 0.0, 1.0), c.a);
        }
      `
        });
        this.composer.addPass(unpremultiplyPass);

        this.resize();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.parentElement);
        this.resizeObserver.observe(host);

        this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.lastMoveTime = this.startTime;

        this.animate();

        const onPointerMove = (e: PointerEvent) => {
            if (!this.parentElement) {
                return;
            }
            const rect = this.parentElement.getBoundingClientRect();
            const x = THREE.MathUtils.clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
            const y = THREE.MathUtils.clamp(1 - (e.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
            this.currentMouse.set(x, y);
            this.pointerActive = true;
            this.lastMoveTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.ensureLoop();
        };

        const onPointerEnter = () => {
            this.pointerActive = true;
            this.ensureLoop();
        };

        const onPointerLeave = () => {
            this.pointerActive = false;
            this.lastMoveTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.ensureLoop();
        };

        this.parentElement.addEventListener('pointermove', onPointerMove, { passive: true });
        this.parentElement.addEventListener('pointerenter', onPointerEnter, { passive: true });
        this.parentElement.addEventListener('pointerleave', onPointerLeave, { passive: true });

        // Store handlers for cleanup
        (this.parentElement as any)._ghostCursorHandlers = { onPointerMove, onPointerEnter, onPointerLeave };
    }

    private getFragmentShader(maxTrail: number): string {
        return `
      uniform float iTime;
      uniform vec3  iResolution;
      uniform vec2  iMouse;
      uniform vec2  iPrevMouse[${maxTrail}];
      uniform float iOpacity;
      uniform float iScale;
      uniform vec3  iBaseColor;
      uniform float iBrightness;
      uniform float iEdgeIntensity;
      varying vec2  vUv;

      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f *= f * (3. - 2. * f);
        return mix(mix(hash(i + vec2(0.,0.)), hash(i + vec2(1.,0.)), f.x),
                   mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), f.x), f.y);
      }
      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.5;
        mat2 m = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for(int i=0;i<5;i++){
          v += a * noise(p);
          p = m * p * 2.0;
          a *= 0.5;
        }
        return v;
      }
      vec3 tint1(vec3 base){ return mix(base, vec3(1.0), 0.15); }
      vec3 tint2(vec3 base){ return mix(base, vec3(0.8, 0.9, 1.0), 0.25); }

      vec4 blob(vec2 p, vec2 mousePos, float intensity, float activity) {
        vec2 q = vec2(fbm(p * iScale + iTime * 0.1), fbm(p * iScale + vec2(5.2,1.3) + iTime * 0.1));
        vec2 r = vec2(fbm(p * iScale + q * 1.5 + iTime * 0.15), fbm(p * iScale + q * 1.5 + vec2(8.3,2.8) + iTime * 0.15));

        float smoke = fbm(p * iScale + r * 0.8);
        float radius = 0.5 + 0.3 * (1.0 / iScale);
        float distFactor = 1.0 - smoothstep(0.0, radius * activity, length(p - mousePos));
        float alpha = pow(smoke, 2.5) * distFactor;

        vec3 c1 = tint1(iBaseColor);
        vec3 c2 = tint2(iBaseColor);
        vec3 color = mix(c1, c2, sin(iTime * 0.5) * 0.5 + 0.5);

        return vec4(color * alpha * intensity, alpha * intensity);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy / iResolution.xy * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
        vec2 mouse = (iMouse * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);

        vec3 colorAcc = vec3(0.0);
        float alphaAcc = 0.0;

        vec4 b = blob(uv, mouse, 1.0, iOpacity);
        colorAcc += b.rgb;
        alphaAcc += b.a;

        for (int i = 0; i < ${maxTrail}; i++) {
          vec2 pm = (iPrevMouse[i] * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
          float t = 1.0 - float(i) / float(${maxTrail});
          t = pow(t, 2.0);
          if (t > 0.01) {
            vec4 bt = blob(uv, pm, t * 0.8, iOpacity);
            colorAcc += bt.rgb;
            alphaAcc += bt.a;
          }
        }

        colorAcc *= iBrightness;

        vec2 uv01 = gl_FragCoord.xy / iResolution.xy;
        float edgeDist = min(min(uv01.x, 1.0 - uv01.x), min(uv01.y, 1.0 - uv01.y));
        float distFromEdge = clamp(edgeDist * 2.0, 0.0, 1.0);
        float k = clamp(iEdgeIntensity, 0.0, 1.0);
        float edgeMask = mix(1.0 - k, 1.0, distFromEdge);

        float outAlpha = clamp(alphaAcc * iOpacity * edgeMask, 0.0, 1.0);
        gl_FragColor = vec4(colorAcc, outAlpha);
      }
    `;
    }

    private getFilmGrainShader(): { uniforms: any; vertexShader: string; fragmentShader: string } {
        return {
            uniforms: {
                tDiffuse: { value: null },
                iTime: { value: 0 },
                intensity: { value: this.grainIntensity }
            },
            vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
            fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float iTime;
        uniform float intensity;
        varying vec2 vUv;

        float hash1(float n){ return fract(sin(n)*43758.5453); }

        void main(){
          vec4 color = texture2D(tDiffuse, vUv);
          float n = hash1(vUv.x*1000.0 + vUv.y*2000.0 + iTime) * 2.0 - 1.0;
          color.rgb += n * intensity * color.rgb;
          gl_FragColor = color;
        }
      `
        };
    }

    private calculateScale(el: HTMLElement): number {
        const r = el.getBoundingClientRect();
        const base = 600;
        const current = Math.min(Math.max(1, r.width), Math.max(1, r.height));
        return Math.max(0.5, Math.min(2.0, current / base));
    }

    private resize(): void {
        if (!this.containerRef?.nativeElement || !this.renderer || !this.composer || !this.material || !this.bloomPass) {
            return;
        }

        const host = this.containerRef.nativeElement;
        const rect = host.getBoundingClientRect();
        const cssW = Math.max(1, Math.floor(rect.width));
        const cssH = Math.max(1, Math.floor(rect.height));

        const currentDPR = Math.min(
            typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
            this.maxDevicePixelRatio
        );
        const need = cssW * cssH * currentDPR * currentDPR;
        const scale = need <= this.pixelBudget() ? 1 : Math.max(0.5, Math.min(1, Math.sqrt(this.pixelBudget() / Math.max(1, need))));
        const pixelRatio = currentDPR * scale;

        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(cssW, cssH, false);

        if (this.composer.setPixelRatio) {
            this.composer.setPixelRatio(pixelRatio);
        }
        this.composer.setSize(cssW, cssH);

        const wpx = Math.max(1, Math.floor(cssW * pixelRatio));
        const hpx = Math.max(1, Math.floor(cssH * pixelRatio));
        this.material.uniforms['iResolution'].value.set(wpx, hpx, 1);
        this.material.uniforms['iScale'].value = this.calculateScale(host);
        this.bloomPass.setSize(wpx, hpx);
    }

    private animate = (): void => {
        if (!this.material || !this.composer) {
            return;
        }

        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const t = (now - this.startTime) / 1000;

        if (this.pointerActive) {
            const iMouse = this.material.uniforms['iMouse'].value as THREE.Vector2;
            this.velocity.set(
                this.currentMouse.x - iMouse.x,
                this.currentMouse.y - iMouse.y
            );
            iMouse.copy(this.currentMouse);
            this.fadeOpacity = 1.0;
        } else {
            this.velocity.multiplyScalar(this.inertia);
            if (this.velocity.lengthSq() > 1e-6) {
                (this.material.uniforms['iMouse'].value as THREE.Vector2).add(this.velocity);
            }
            const dt = now - this.lastMoveTime;
            if (dt > this.fadeDelay()) {
                const k = Math.min(1, (dt - this.fadeDelay()) / this.fadeDuration());
                this.fadeOpacity = Math.max(0, 1 - k);
            }
        }

        const N = this.trailBuf.length;
        this.head = (this.head + 1) % N;
        const iMouse = this.material.uniforms['iMouse'].value as THREE.Vector2;
        this.trailBuf[this.head].copy(iMouse);
        const arr = this.material.uniforms['iPrevMouse'].value as THREE.Vector2[];
        for (let i = 0; i < N; i++) {
            const srcIdx = (this.head - i + N) % N;
            arr[i].copy(this.trailBuf[srcIdx]);
        }

        (this.material.uniforms['iOpacity'] as any).value = this.fadeOpacity;
        (this.material.uniforms['iTime'] as any).value = t;

        if (this.filmPass && (this.filmPass as any).uniforms?.iTime) {
            (this.filmPass as any).uniforms.iTime.value = t;
        }

        this.composer.render();

        if (!this.pointerActive && this.fadeOpacity <= 0.001) {
            this.running = false;
            this.rafId = undefined;
            return;
        }

        this.rafId = requestAnimationFrame(this.animate);
    };

    private ensureLoop(): void {
        if (!this.running) {
            this.running = true;
            this.rafId = requestAnimationFrame(this.animate);
        }
    }

    private cleanup(): void {
        if (this.rafId !== undefined) {
            cancelAnimationFrame(this.rafId);
        }
        this.running = false;
        this.rafId = undefined;

        if (this.parentElement && (this.parentElement as any)._ghostCursorHandlers) {
            const handlers = (this.parentElement as any)._ghostCursorHandlers;
            this.parentElement.removeEventListener('pointermove', handlers.onPointerMove);
            this.parentElement.removeEventListener('pointerenter', handlers.onPointerEnter);
            this.parentElement.removeEventListener('pointerleave', handlers.onPointerLeave);
            delete (this.parentElement as any)._ghostCursorHandlers;
        }

        this.resizeObserver?.disconnect();

        if (this.scene) {
            this.scene.clear();
        }
        this.geometry?.dispose();
        this.material?.dispose();
        this.composer?.dispose();
        this.renderer?.dispose();

        if (this.renderer?.domElement && this.renderer.domElement.parentElement) {
            this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
        }

        if (this.parentElement && (!this.prevParentPos || this.prevParentPos === 'static')) {
            this.parentElement.style.position = this.prevParentPos;
        }
    }

    readonly mergedStyle = computed(() => ({ zIndex: this.zIndex, ...this.style }));
}

