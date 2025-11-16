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

const vertexShader = `
uniform float time;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D uDataTexture;
uniform sampler2D uTexture;
uniform vec4 resolution;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 offset = texture2D(uDataTexture, vUv);
  gl_FragColor = texture2D(uTexture, uv - 0.02 * offset.rg);
}`;

@Component({
  selector: 'ngw-grid-distortion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grid-distortion.component.html',
  styleUrl: './grid-distortion.component.css'
})
export class GridDistortionComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('containerRef', { static: false }) containerRef!: ElementRef<HTMLElement>;

  @Input() grid = 15;
  @Input() mouse = 0.1;
  @Input() strength = 0.15;
  @Input() relaxation = 0.9;
  @Input() imageSrc = '';
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private plane: THREE.Mesh | null = null;
  private imageAspect = 1;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private mouseLeaveHandler: (() => void) | null = null;
  private initialized = false;

  private mouseState = {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    vX: 0,
    vY: 0
  };

  private uniforms: {
    time: { value: number };
    resolution: { value: THREE.Vector4 };
    uTexture: { value: THREE.Texture | null };
    uDataTexture: { value: THREE.DataTexture | null };
  } | null = null;

  private dataTexture: THREE.DataTexture | null = null;
  private size = 15;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initGridDistortion();
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

    if (changes['grid'] && this.uniforms && this.dataTexture) {
      this.size = this.grid;
      this.updateDataTexture();
    }

    if (changes['imageSrc'] && this.uniforms) {
      this.loadTexture();
    }
  }

  private initGridDistortion(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
    this.camera.position.z = 2;

    this.uniforms = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector4() },
      uTexture: { value: null },
      uDataTexture: { value: null }
    };

    this.size = this.grid;
    this.updateDataTexture();

    if (this.imageSrc) {
      this.loadTexture();
    }

    const material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(1, 1, this.size - 1, this.size - 1);
    this.plane = new THREE.Mesh(geometry, material);
    this.scene.add(this.plane);

    const handleResize = () => {
      if (!container || !this.renderer || !this.camera || !this.plane) return;

      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width === 0 || height === 0) return;

      const containerAspect = width / height;

      this.renderer.setSize(width, height);

      if (this.plane) {
        this.plane.scale.set(containerAspect, 1, 1);
      }

      const frustumHeight = 1;
      const frustumWidth = frustumHeight * containerAspect;
      this.camera.left = -frustumWidth / 2;
      this.camera.right = frustumWidth / 2;
      this.camera.top = frustumHeight / 2;
      this.camera.bottom = -frustumHeight / 2;
      this.camera.updateProjectionMatrix();

      if (this.uniforms) {
        this.uniforms.resolution.value.set(width, height, 1, 1);
      }
    };

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);
      this.resizeObserver = resizeObserver;
    } else {
      window.addEventListener('resize', handleResize);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      this.mouseState.vX = x - this.mouseState.prevX;
      this.mouseState.vY = y - this.mouseState.prevY;
      Object.assign(this.mouseState, { x, y, prevX: x, prevY: y });
    };

    const handleMouseLeave = () => {
      if (this.dataTexture) {
        this.dataTexture.needsUpdate = true;
      }
      Object.assign(this.mouseState, {
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        vX: 0,
        vY: 0
      });
    };

    this.mouseMoveHandler = handleMouseMove;
    this.mouseLeaveHandler = handleMouseLeave;
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    handleResize();

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      if (!this.renderer || !this.scene || !this.camera || !this.uniforms || !this.dataTexture) return;

      this.uniforms.time.value += 0.05;

      const data = this.dataTexture.image.data as Float32Array;
      for (let i = 0; i < this.size * this.size; i++) {
        data[i * 4] *= this.relaxation;
        data[i * 4 + 1] *= this.relaxation;
      }

      const gridMouseX = this.size * this.mouseState.x;
      const gridMouseY = this.size * this.mouseState.y;
      const maxDist = this.size * this.mouse;

      for (let i = 0; i < this.size; i++) {
        for (let j = 0; j < this.size; j++) {
          const distSq = Math.pow(gridMouseX - i, 2) + Math.pow(gridMouseY - j, 2);
          if (distSq < maxDist * maxDist) {
            const index = 4 * (i + this.size * j);
            const power = Math.min(maxDist / Math.sqrt(distSq), 10);
            data[index] += this.strength * 100 * this.mouseState.vX * power;
            data[index + 1] -= this.strength * 100 * this.mouseState.vY * power;
          }
        }
      }

      this.dataTexture.needsUpdate = true;
      this.renderer.render(this.scene, this.camera);
    };

    animate();
    this.initialized = true;
  }

  private updateDataTexture(): void {
    if (!this.uniforms) return;

    const data = new Float32Array(4 * this.size * this.size);
    for (let i = 0; i < this.size * this.size; i++) {
      data[i * 4] = Math.random() * 255 - 125;
      data[i * 4 + 1] = Math.random() * 255 - 125;
    }

    if (this.dataTexture) {
      this.dataTexture.dispose();
    }

    this.dataTexture = new THREE.DataTexture(data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
    this.dataTexture.needsUpdate = true;
    this.uniforms.uDataTexture.value = this.dataTexture;
  }

  private loadTexture(): void {
    if (!this.uniforms || !this.imageSrc) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      this.imageSrc,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        this.imageAspect = texture.image.width / texture.image.height;
        if (this.uniforms) {
          this.uniforms.uTexture.value = texture;
        }
        this.handleResize();
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
      }
    );
  }

  private handleResize(): void {
    if (!this.containerRef?.nativeElement || !this.renderer || !this.camera || !this.plane) return;

    const container = this.containerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    const containerAspect = width / height;

    this.renderer.setSize(width, height);

    if (this.plane) {
      this.plane.scale.set(containerAspect, 1, 1);
    }

    const frustumHeight = 1;
    const frustumWidth = frustumHeight * containerAspect;
    this.camera.left = -frustumWidth / 2;
    this.camera.right = frustumWidth / 2;
    this.camera.top = frustumHeight / 2;
    this.camera.bottom = -frustumHeight / 2;
    this.camera.updateProjectionMatrix();

    if (this.uniforms) {
      this.uniforms.resolution.value.set(width, height, 1, 1);
    }
  }

  private cleanup(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    } else {
      window.removeEventListener('resize', this.handleResize.bind(this));
    }

    const container = this.containerRef?.nativeElement;
    if (container) {
      if (this.mouseMoveHandler) {
        container.removeEventListener('mousemove', this.mouseMoveHandler);
      }
      if (this.mouseLeaveHandler) {
        container.removeEventListener('mouseleave', this.mouseLeaveHandler);
      }
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (container && this.renderer.domElement && container.contains(this.renderer.domElement)) {
        container.removeChild(this.renderer.domElement);
      }
    }

    if (this.plane) {
      if (this.plane.geometry) this.plane.geometry.dispose();
      if (this.plane.material instanceof THREE.Material) {
        this.plane.material.dispose();
      }
    }

    if (this.dataTexture) {
      this.dataTexture.dispose();
    }

    if (this.uniforms && this.uniforms.uTexture.value) {
      this.uniforms.uTexture.value.dispose();
    }

    this.scene = null;
    this.renderer = null;
    this.camera = null;
    this.plane = null;
    this.uniforms = null;
    this.dataTexture = null;
  }
}

