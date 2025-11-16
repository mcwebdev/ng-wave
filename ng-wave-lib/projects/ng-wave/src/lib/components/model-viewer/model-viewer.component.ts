import {
  Component,
  Input,
  Output,
  EventEmitter,
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
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Note: Full implementation would require:
// - OBJLoader, FBXLoader for additional formats
// - PMREMGenerator for environment maps
// - ContactShadows from drei equivalent

const deg2rad = (d: number): number => (d * Math.PI) / 180;
const ROTATE_SPEED = 0.005;
const INERTIA = 0.925;
const PARALLAX_MAG = 0.05;
const PARALLAX_EASE = 0.12;
const HOVER_MAG = deg2rad(6);
const HOVER_EASE = 0.15;

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));

@Component({
  selector: 'ngw-model-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-viewer.component.html',
  styleUrl: './model-viewer.component.css'
})
export class ModelViewerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;
  @ViewChild('canvasRef', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() url = '';
  @Input() width = 400;
  @Input() height = 400;
  @Input() modelXOffset = 0;
  @Input() modelYOffset = 0;
  @Input() defaultRotationX = -50;
  @Input() defaultRotationY = 20;
  @Input() defaultZoom = 0.5;
  @Input() minZoomDistance = 0.5;
  @Input() maxZoomDistance = 10;
  @Input() enableMouseParallax = true;
  @Input() enableManualRotation = true;
  @Input() enableHoverRotation = true;
  @Input() enableManualZoom = true;
  @Input() ambientIntensity = 0.3;
  @Input() keyLightIntensity = 1;
  @Input() fillLightIntensity = 0.5;
  @Input() rimLightIntensity = 0.8;
  @Input() environmentPreset = 'forest';
  @Input() autoFrame = false;
  @Input() placeholderSrc?: string;
  @Input() showScreenshotButton = true;
  @Input() fadeIn = false;
  @Input() autoRotate = false;
  @Input() autoRotateSpeed = 0.35;
  @Input() className = '';

  @Output() modelLoaded = new EventEmitter<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private model?: THREE.Group;
  private animationFrameId?: number;
  private loader?: GLTFLoader;
  private vel = { x: 0, y: 0 };
  private tPar = { x: 0, y: 0 };
  private cPar = { x: 0, y: 0 };
  private tHov = { x: 0, y: 0 };
  private cHov = { x: 0, y: 0 };
  private pivot = new THREE.Vector3();
  private pivotW = new THREE.Vector3();
  private outerGroup?: THREE.Group;
  private innerGroup?: THREE.Group;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initThree();
    this.loadModel();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (changes['url'] && !changes['url'].firstChange) {
      this.loadModel();
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cleanup();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (!this.camera || !this.renderer || !this.containerRef?.nativeElement) return;

    const width = this.containerRef.nativeElement.clientWidth;
    const height = this.containerRef.nativeElement.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private initThree(): void {
    if (!this.containerRef?.nativeElement || !this.canvasRef?.nativeElement) return;

    const container = this.containerRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    const width = container.clientWidth || this.width;
    const height = container.clientHeight || this.height;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    const camZ = Math.min(Math.max(this.defaultZoom, this.minZoomDistance), this.maxZoomDistance);
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100);
    this.camera.position.set(0, 0, camZ);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, preserveDrawingBuffer: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, this.ambientIntensity);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, this.keyLightIntensity);
    keyLight.position.set(5, 5, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, this.fillLightIntensity);
    fillLight.position.set(-5, 2, 5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, this.rimLightIntensity);
    rimLight.position.set(0, 4, -5);
    this.scene.add(rimLight);

    // Groups
    this.outerGroup = new THREE.Group();
    this.innerGroup = new THREE.Group();
    this.outerGroup.add(this.innerGroup);
    this.scene.add(this.outerGroup);

    const initYaw = deg2rad(this.defaultRotationX);
    const initPitch = deg2rad(this.defaultRotationY);
    this.outerGroup.rotation.set(initPitch, initYaw, 0);

    // Controls (desktop only)
    if (!isTouch) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enablePan = false;
      this.controls.enableRotate = false;
      this.controls.enableZoom = this.enableManualZoom;
      this.controls.minDistance = this.minZoomDistance;
      this.controls.maxDistance = this.maxZoomDistance;
      this.controls.target.copy(this.pivot);
    }

    this.setupEventListeners();
    this.animate();
  }

  private setupEventListeners(): void {
    if (!this.canvasRef?.nativeElement) return;

    const canvas = this.canvasRef.nativeElement;

    if (!isTouch && this.enableManualRotation) {
      canvas.addEventListener('pointerdown', this.onPointerDown);
      canvas.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
    }

    if (isTouch) {
      canvas.addEventListener('touchstart', this.onTouchStart);
      canvas.addEventListener('touchmove', this.onTouchMove);
      canvas.addEventListener('touchend', this.onTouchEnd);
    }

    if (!isTouch) {
      window.addEventListener('pointermove', this.onMouseMove);
    }
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging || !this.outerGroup) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.outerGroup.rotation.y += dx * ROTATE_SPEED;
    this.outerGroup.rotation.x += dy * ROTATE_SPEED;
    this.vel = { x: dx * ROTATE_SPEED, y: dy * ROTATE_SPEED };
  };

  private onPointerUp = (): void => {
    this.isDragging = false;
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || !this.outerGroup || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - this.lastX;
    const dy = e.touches[0].clientY - this.lastY;
    this.lastX = e.touches[0].clientX;
    this.lastY = e.touches[0].clientY;
    this.outerGroup.rotation.y += dx * ROTATE_SPEED;
    this.outerGroup.rotation.x += dy * ROTATE_SPEED;
    this.vel = { x: dx * ROTATE_SPEED, y: dy * ROTATE_SPEED };
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private onMouseMove = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse') return;
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    if (this.enableMouseParallax) {
      this.tPar = { x: -nx * PARALLAX_MAG, y: -ny * PARALLAX_MAG };
    }
    if (this.enableHoverRotation) {
      this.tHov = { x: ny * HOVER_MAG, y: nx * HOVER_MAG };
    }
  };

  private async loadModel(): Promise<void> {
    if (!this.url || !this.scene || !this.innerGroup) return;

    this.loader = new GLTFLoader();

    try {
      const gltf = await this.loader.loadAsync(this.url);
      this.model = gltf.scene.clone();

      // Auto-frame
      if (this.autoFrame && this.camera) {
        const box = new THREE.Box3().setFromObject(this.model);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        const s = 1 / (sphere.radius * 2);
        this.model.position.set(-sphere.center.x, -sphere.center.y, -sphere.center.z);
        this.model.scale.setScalar(s);
        this.model.getWorldPosition(this.pivotW);
        this.pivot.copy(this.pivotW);

        if (this.camera.isPerspectiveCamera) {
          const fitR = sphere.radius * s;
          const d = (fitR * 1.2) / Math.sin((this.camera.fov * Math.PI) / 180 / 2);
          this.camera.position.set(this.pivotW.x, this.pivotW.y, this.pivotW.z + d);
          this.camera.near = d / 10;
          this.camera.far = d * 10;
          this.camera.updateProjectionMatrix();
        }
      }

      // Setup shadows and materials
      this.model.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          if (this.fadeIn) {
            if (object.material instanceof THREE.Material) {
              object.material.transparent = true;
              object.material.opacity = 0;
            }
          }
        }
      });

      this.innerGroup.add(this.model);

      // Fade in animation
      if (this.fadeIn) {
        let t = 0;
        const interval = setInterval(() => {
          t += 0.05;
          const v = Math.min(t, 1);
          this.model?.traverse(object => {
            if (object instanceof THREE.Mesh && object.material instanceof THREE.Material) {
              object.material.opacity = v;
            }
          });
          if (v === 1) {
            clearInterval(interval);
            this.modelLoaded.emit();
          }
        }, 16);
      } else {
        this.modelLoaded.emit();
      }
    } catch (error) {
      console.error('Error loading model:', error);
    }
  }

  private animate = (): void => {
    if (!this.scene || !this.camera || !this.renderer) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = 0.016; // Approximate delta time

    // Parallax
    this.cPar.x += (this.tPar.x - this.cPar.x) * PARALLAX_EASE;
    this.cPar.y += (this.tPar.y - this.cPar.y) * PARALLAX_EASE;

    // Hover rotation
    const phx = this.cHov.x;
    const phy = this.cHov.y;
    this.cHov.x += (this.tHov.x - this.cHov.x) * HOVER_EASE;
    this.cHov.y += (this.tHov.y - this.cHov.y) * HOVER_EASE;

    if (this.outerGroup && this.model) {
      const ndc = this.pivotW.clone().project(this.camera);
      ndc.x += this.modelXOffset + this.cPar.x;
      ndc.y += this.modelYOffset + this.cPar.y;
      this.outerGroup.position.copy(ndc.unproject(this.camera));

      this.outerGroup.rotation.x += this.cHov.x - phx;
      this.outerGroup.rotation.y += this.cHov.y - phy;

      if (this.autoRotate) {
        this.outerGroup.rotation.y += this.autoRotateSpeed * dt;
      }

      this.outerGroup.rotation.y += this.vel.x;
      this.outerGroup.rotation.x += this.vel.y;
      this.vel.x *= INERTIA;
      this.vel.y *= INERTIA;
    }

    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  };

  captureScreenshot(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.renderer.shadowMap.enabled = false;
    const lights: Array<{ light: THREE.Light; castShadow: boolean }> = [];
    this.scene.traverse(object => {
      if (object instanceof THREE.Light && 'castShadow' in object) {
        lights.push({ light: object, castShadow: object.castShadow });
        object.castShadow = false;
      }
    });

    this.renderer.render(this.scene, this.camera);
    const urlPNG = this.renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = 'model.png';
    a.href = urlPNG;
    a.click();

    this.renderer.shadowMap.enabled = true;
    lights.forEach(({ light, castShadow }) => {
      (light as any).castShadow = castShadow;
    });
  }

  private cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.canvasRef?.nativeElement) {
      const canvas = this.canvasRef.nativeElement;
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('touchstart', this.onTouchStart);
      canvas.removeEventListener('touchmove', this.onTouchMove);
      canvas.removeEventListener('touchend', this.onTouchEnd);
      window.removeEventListener('pointermove', this.onMouseMove);
    }

    this.controls?.dispose();

    if (this.scene) {
      this.scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    this.renderer?.dispose();
  }
}

