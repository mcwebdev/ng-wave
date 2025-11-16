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
import {
  Clock,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  WebGLRendererParameters,
  SRGBColorSpace,
  MathUtils,
  Vector2,
  Vector3,
  MeshPhysicalMaterial,
  ShaderChunk,
  Color,
  Object3D,
  InstancedMesh,
  PMREMGenerator,
  SphereGeometry,
  AmbientLight,
  PointLight,
  ACESFilmicToneMapping,
  Raycaster,
  Plane
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface ThreeSetupOptions {
  canvas?: HTMLCanvasElement;
  id?: string;
  size?: 'parent' | { width: number; height: number };
  rendererOptions?: Partial<WebGLRendererParameters>;
}

interface Size {
  width: number;
  height: number;
  wWidth: number;
  wHeight: number;
  ratio: number;
  pixelRatio: number;
}

interface TimeData {
  elapsed: number;
  delta: number;
}

class ThreeSetup {
  private options: ThreeSetupOptions;
  canvas!: HTMLCanvasElement;
  camera!: PerspectiveCamera;
  cameraMinAspect?: number;
  cameraMaxAspect?: number;
  cameraFov!: number;
  maxPixelRatio?: number;
  minPixelRatio?: number;
  scene!: Scene;
  renderer!: WebGLRenderer;
  private _postprocessing?: any;
  size: Size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render!: () => void;
  onBeforeRender: (time: TimeData) => void = () => { };
  onAfterRender: (time: TimeData) => void = () => { };
  onAfterResize: (size: Size) => void = () => { };
  private isIntersecting = false;
  private isAnimating = false;
  private intersectionObserver?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private resizeTimeout?: number;
  private clock = new Clock();
  private timeData: TimeData = { elapsed: 0, delta: 0 };
  private animationFrameId?: number;
  isDisposed = false;

  constructor(options: ThreeSetupOptions) {
    this.options = { ...options };
    this.initCamera();
    this.initScene();
    this.initRenderer();
    this.resize();
    this.initObservers();
  }

  private initCamera(): void {
    this.camera = new PerspectiveCamera();
    this.cameraFov = this.camera.fov;
  }

  private initScene(): void {
    this.scene = new Scene();
  }

  private initRenderer(): void {
    if (this.options.canvas) {
      this.canvas = this.options.canvas;
    } else if (this.options.id) {
      const el = document.getElementById(this.options.id);
      if (!el || !(el instanceof HTMLCanvasElement)) {
        throw new Error('Three: Missing canvas or id parameter');
      }
      this.canvas = el;
    } else {
      throw new Error('Three: Missing canvas or id parameter');
    }
    this.canvas.style.display = 'block';
    const rendererOptions = {
      canvas: this.canvas,
      powerPreference: 'high-performance' as const,
      ...(this.options.rendererOptions ?? {})
    };
    this.renderer = new WebGLRenderer(rendererOptions as WebGLRendererParameters);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.render = this.renderScene.bind(this);
  }

  private initObservers(): void {
    if (!(this.options.size instanceof Object)) {
      window.addEventListener('resize', this.handleResize.bind(this));
      if (this.options.size === 'parent' && this.canvas.parentNode) {
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this.canvas.parentNode as Element);
      }
    }
    this.intersectionObserver = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        root: null,
        rootMargin: '0px',
        threshold: 0
      }
    );
    this.intersectionObserver.observe(this.canvas);
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private cleanupObservers(): void {
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    this.isIntersecting = entries[0].isIntersecting;
    if (this.isIntersecting) {
      this.startAnimation();
    } else {
      this.stopAnimation();
    }
  }

  private handleVisibilityChange(): void {
    if (this.isIntersecting) {
      if (document.hidden) {
        this.stopAnimation();
      } else {
        this.startAnimation();
      }
    }
  }

  private handleResize(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = window.setTimeout(() => this.resize(), 100);
  }

  resize(): void {
    let width: number, height: number;
    if (this.options.size instanceof Object) {
      width = this.options.size.width;
      height = this.options.size.height;
    } else if (this.options.size === 'parent' && this.canvas.parentNode) {
      width = (this.canvas.parentNode as HTMLElement).offsetWidth;
      height = (this.canvas.parentNode as HTMLElement).offsetHeight;
    } else {
      width = window.innerWidth;
      height = window.innerHeight;
    }
    this.size.width = width;
    this.size.height = height;
    this.size.ratio = width / height;
    this.updateCamera();
    this.updateRenderer();
    this.onAfterResize(this.size);
  }

  private updateCamera(): void {
    this.camera.aspect = this.size.width / this.size.height;
    if (this.camera.isPerspectiveCamera && this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) {
        this.adjustFovForAspect(this.cameraMinAspect);
      } else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) {
        this.adjustFovForAspect(this.cameraMaxAspect);
      } else {
        this.camera.fov = this.cameraFov;
      }
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();
  }

  private adjustFovForAspect(targetAspect: number): void {
    const tan = Math.tan(MathUtils.degToRad(this.cameraFov / 2)) / (this.camera.aspect / targetAspect);
    this.camera.fov = 2 * MathUtils.radToDeg(Math.atan(tan));
  }

  updateWorldSize(): void {
    if (this.camera.isPerspectiveCamera) {
      const fov = (this.camera.fov * Math.PI) / 180;
      this.size.wHeight = 2 * Math.tan(fov / 2) * this.camera.position.length();
      this.size.wWidth = this.size.wHeight * this.camera.aspect;
    }
  }

  private updateRenderer(): void {
    this.renderer.setSize(this.size.width, this.size.height);
    this._postprocessing?.setSize(this.size.width, this.size.height);
    let pixelRatio = window.devicePixelRatio;
    if (this.maxPixelRatio && pixelRatio > this.maxPixelRatio) {
      pixelRatio = this.maxPixelRatio;
    } else if (this.minPixelRatio && pixelRatio < this.minPixelRatio) {
      pixelRatio = this.minPixelRatio;
    }
    this.renderer.setPixelRatio(pixelRatio);
    this.size.pixelRatio = pixelRatio;
  }

  get postprocessing(): any {
    return this._postprocessing;
  }

  set postprocessing(value: any) {
    this._postprocessing = value;
    this.render = value.render.bind(value);
  }

  private startAnimation(): void {
    if (this.isAnimating) return;
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.timeData.delta = this.clock.getDelta();
      this.timeData.elapsed += this.timeData.delta;
      this.onBeforeRender(this.timeData);
      this.render();
      this.onAfterRender(this.timeData);
    };
    this.isAnimating = true;
    this.clock.start();
    animate();
  }

  private stopAnimation(): void {
    if (this.isAnimating) {
      if (this.animationFrameId !== undefined) {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.isAnimating = false;
      this.clock.stop();
    }
  }

  private renderScene(): void {
    this.renderer.render(this.scene, this.camera);
  }

  clear(): void {
    this.scene.traverse((obj) => {
      if ((obj as any).isMesh && typeof (obj as any).material === 'object' && (obj as any).material !== null) {
        const material = (obj as any).material;
        Object.keys(material).forEach((key) => {
          const value = material[key];
          if (value !== null && typeof value === 'object' && typeof value.dispose === 'function') {
            value.dispose();
          }
        });
        material.dispose();
        (obj as any).geometry.dispose();
      }
    });
    this.scene.clear();
  }

  dispose(): void {
    this.cleanupObservers();
    this.stopAnimation();
    this.clear();
    this._postprocessing?.dispose();
    this.renderer.dispose();
    this.isDisposed = true;
  }
}

const interactionMap = new Map<HTMLElement, any>();
const globalPointer = new Vector2();
let interactionListenersActive = false;

interface InteractionState {
  position: Vector2;
  nPosition: Vector2;
  hover: boolean;
  touching: boolean;
  onEnter: () => void;
  onMove: () => void;
  onClick: () => void;
  onLeave: () => void;
  dispose: () => void;
}

function setupInteraction(domElement: HTMLElement, callbacks: Partial<InteractionState>): InteractionState {
  const state: InteractionState = {
    position: new Vector2(),
    nPosition: new Vector2(),
    hover: false,
    touching: false,
    onEnter: () => { },
    onMove: () => { },
    onClick: () => { },
    onLeave: () => { },
    dispose: () => { },
    ...callbacks
  };

  if (!interactionMap.has(domElement)) {
    interactionMap.set(domElement, state);
    if (!interactionListenersActive) {
      document.body.addEventListener('pointermove', handlePointerMove);
      document.body.addEventListener('pointerleave', handlePointerLeave);
      document.body.addEventListener('click', handleClick);
      document.body.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.body.addEventListener('touchend', handleTouchEnd, { passive: false });
      document.body.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      interactionListenersActive = true;
    }
  }

  state.dispose = () => {
    interactionMap.delete(domElement);
    if (interactionMap.size === 0) {
      document.body.removeEventListener('pointermove', handlePointerMove);
      document.body.removeEventListener('pointerleave', handlePointerLeave);
      document.body.removeEventListener('click', handleClick);
      document.body.removeEventListener('touchstart', handleTouchStart);
      document.body.removeEventListener('touchmove', handleTouchMove);
      document.body.removeEventListener('touchend', handleTouchEnd);
      document.body.removeEventListener('touchcancel', handleTouchEnd);
      interactionListenersActive = false;
    }
  };

  return state;
}

function handlePointerMove(e: PointerEvent): void {
  globalPointer.x = e.clientX;
  globalPointer.y = e.clientY;
  processInteraction();
}

function processInteraction(): void {
  for (const [elem, state] of interactionMap) {
    const rect = elem.getBoundingClientRect();
    if (isPointInRect(rect)) {
      updateInteractionState(state, rect);
      if (!state.hover) {
        state.hover = true;
        state.onEnter();
      }
      state.onMove();
    } else if (state.hover && !state.touching) {
      state.hover = false;
      state.onLeave();
    }
  }
}

function handleClick(e: MouseEvent): void {
  globalPointer.x = e.clientX;
  globalPointer.y = e.clientY;
  for (const [elem, state] of interactionMap) {
    const rect = elem.getBoundingClientRect();
    updateInteractionState(state, rect);
    if (isPointInRect(rect)) {
      state.onClick();
    }
  }
}

function handlePointerLeave(): void {
  for (const state of interactionMap.values()) {
    if (state.hover) {
      state.hover = false;
      state.onLeave();
    }
  }
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length > 0) {
    e.preventDefault();
    globalPointer.x = e.touches[0].clientX;
    globalPointer.y = e.touches[0].clientY;

    for (const [elem, state] of interactionMap) {
      const rect = elem.getBoundingClientRect();
      if (isPointInRect(rect)) {
        state.touching = true;
        updateInteractionState(state, rect);
        if (!state.hover) {
          state.hover = true;
          state.onEnter();
        }
        state.onMove();
      }
    }
  }
}

function handleTouchMove(e: TouchEvent): void {
  if (e.touches.length > 0) {
    e.preventDefault();
    globalPointer.x = e.touches[0].clientX;
    globalPointer.y = e.touches[0].clientY;

    for (const [elem, state] of interactionMap) {
      const rect = elem.getBoundingClientRect();
      updateInteractionState(state, rect);

      if (isPointInRect(rect)) {
        if (!state.hover) {
          state.hover = true;
          state.touching = true;
          state.onEnter();
        }
        state.onMove();
      } else if (state.hover && state.touching) {
        state.onMove();
      }
    }
  }
}

function handleTouchEnd(): void {
  for (const [, state] of interactionMap) {
    if (state.touching) {
      state.touching = false;
      if (state.hover) {
        state.hover = false;
        state.onLeave();
      }
    }
  }
}

function updateInteractionState(state: InteractionState, rect: DOMRect): void {
  state.position.x = globalPointer.x - rect.left;
  state.position.y = globalPointer.y - rect.top;
  state.nPosition.x = (state.position.x / rect.width) * 2 - 1;
  state.nPosition.y = (-state.position.y / rect.height) * 2 + 1;
}

function isPointInRect(rect: DOMRect): boolean {
  return (
    globalPointer.x >= rect.left &&
    globalPointer.x <= rect.left + rect.width &&
    globalPointer.y >= rect.top &&
    globalPointer.y <= rect.top + rect.height
  );
}

const tempVec3_1 = new Vector3();
const tempVec3_2 = new Vector3();
const tempVec3_3 = new Vector3();
const tempVec3_4 = new Vector3();
const tempVec3_5 = new Vector3();
const tempVec3_6 = new Vector3();
const tempVec3_7 = new Vector3();
const tempVec3_8 = new Vector3();
const tempVec3_9 = new Vector3();
const tempVec3_10 = new Vector3();

interface PhysicsConfig {
  count: number;
  minSize: number;
  maxSize: number;
  size0: number;
  gravity: number;
  friction: number;
  wallBounce: number;
  maxVelocity: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  controlSphere0: boolean;
}

class Physics {
  config: PhysicsConfig;
  positionData: Float32Array;
  velocityData: Float32Array;
  sizeData: Float32Array;
  center: Vector3;

  constructor(config: PhysicsConfig) {
    this.config = config;
    this.positionData = new Float32Array(3 * config.count).fill(0);
    this.velocityData = new Float32Array(3 * config.count).fill(0);
    this.sizeData = new Float32Array(config.count).fill(1);
    this.center = new Vector3();
    this.initializePositions();
    this.setSizes();
  }

  private initializePositions(): void {
    this.center.toArray(this.positionData, 0);
    for (let i = 1; i < this.config.count; i++) {
      const base = 3 * i;
      this.positionData[base] = MathUtils.randFloatSpread(2 * this.config.maxX);
      this.positionData[base + 1] = MathUtils.randFloatSpread(2 * this.config.maxY);
      this.positionData[base + 2] = MathUtils.randFloatSpread(2 * this.config.maxZ);
    }
  }

  setSizes(): void {
    this.sizeData[0] = this.config.size0;
    for (let i = 1; i < this.config.count; i++) {
      this.sizeData[i] = MathUtils.randFloat(this.config.minSize, this.config.maxSize);
    }
  }

  update(time: TimeData): void {
    let startIdx = 0;
    if (this.config.controlSphere0) {
      startIdx = 1;
      tempVec3_1.fromArray(this.positionData, 0);
      tempVec3_1.lerp(this.center, 0.1).toArray(this.positionData, 0);
      tempVec3_4.set(0, 0, 0).toArray(this.velocityData, 0);
    }

    for (let idx = startIdx; idx < this.config.count; idx++) {
      const base = 3 * idx;
      tempVec3_2.fromArray(this.positionData, base);
      tempVec3_5.fromArray(this.velocityData, base);
      tempVec3_5.y -= time.delta * this.config.gravity * this.sizeData[idx];
      tempVec3_5.multiplyScalar(this.config.friction);
      tempVec3_5.clampLength(0, this.config.maxVelocity);
      tempVec3_2.add(tempVec3_5);
      tempVec3_2.toArray(this.positionData, base);
      tempVec3_5.toArray(this.velocityData, base);
    }

    for (let idx = startIdx; idx < this.config.count; idx++) {
      const base = 3 * idx;
      tempVec3_2.fromArray(this.positionData, base);
      tempVec3_5.fromArray(this.velocityData, base);
      const radius = this.sizeData[idx];
      for (let jdx = idx + 1; jdx < this.config.count; jdx++) {
        const otherBase = 3 * jdx;
        tempVec3_3.fromArray(this.positionData, otherBase);
        tempVec3_6.fromArray(this.velocityData, otherBase);
        const otherRadius = this.sizeData[jdx];
        tempVec3_7.copy(tempVec3_3).sub(tempVec3_2);
        const dist = tempVec3_7.length();
        const sumRadius = radius + otherRadius;
        if (dist < sumRadius) {
          const overlap = sumRadius - dist;
          tempVec3_8.copy(tempVec3_7).normalize().multiplyScalar(0.5 * overlap);
          tempVec3_9.copy(tempVec3_8).multiplyScalar(Math.max(tempVec3_5.length(), 1));
          tempVec3_10.copy(tempVec3_8).multiplyScalar(Math.max(tempVec3_6.length(), 1));
          tempVec3_2.sub(tempVec3_8);
          tempVec3_5.sub(tempVec3_9);
          tempVec3_2.toArray(this.positionData, base);
          tempVec3_5.toArray(this.velocityData, base);
          tempVec3_3.add(tempVec3_8);
          tempVec3_6.add(tempVec3_10);
          tempVec3_3.toArray(this.positionData, otherBase);
          tempVec3_6.toArray(this.velocityData, otherBase);
        }
      }
      if (this.config.controlSphere0) {
        tempVec3_7.copy(tempVec3_1).sub(tempVec3_2);
        const dist = tempVec3_7.length();
        const sumRadius0 = radius + this.sizeData[0];
        if (dist < sumRadius0) {
          const diff = sumRadius0 - dist;
          tempVec3_8.copy(tempVec3_7.normalize()).multiplyScalar(diff);
          tempVec3_9.copy(tempVec3_8).multiplyScalar(Math.max(tempVec3_5.length(), 2));
          tempVec3_2.sub(tempVec3_8);
          tempVec3_5.sub(tempVec3_9);
        }
      }
      if (Math.abs(tempVec3_2.x) + radius > this.config.maxX) {
        tempVec3_2.x = Math.sign(tempVec3_2.x) * (this.config.maxX - radius);
        tempVec3_5.x = -tempVec3_5.x * this.config.wallBounce;
      }
      if (this.config.gravity === 0) {
        if (Math.abs(tempVec3_2.y) + radius > this.config.maxY) {
          tempVec3_2.y = Math.sign(tempVec3_2.y) * (this.config.maxY - radius);
          tempVec3_5.y = -tempVec3_5.y * this.config.wallBounce;
        }
      } else if (tempVec3_2.y - radius < -this.config.maxY) {
        tempVec3_2.y = -this.config.maxY + radius;
        tempVec3_5.y = -tempVec3_5.y * this.config.wallBounce;
      }
      const maxBoundary = Math.max(this.config.maxZ, this.config.maxSize);
      if (Math.abs(tempVec3_2.z) + radius > maxBoundary) {
        tempVec3_2.z = Math.sign(tempVec3_2.z) * (maxBoundary - radius);
        tempVec3_5.z = -tempVec3_5.z * this.config.wallBounce;
      }
      tempVec3_2.toArray(this.positionData, base);
      tempVec3_5.toArray(this.velocityData, base);
    }
  }
}

class ScatteringMaterial extends MeshPhysicalMaterial {
  uniforms: {
    thicknessDistortion: { value: number };
    thicknessAmbient: { value: number };
    thicknessAttenuation: { value: number };
    thicknessPower: { value: number };
    thicknessScale: { value: number };
  };

  constructor(params: any) {
    super(params);
    this.uniforms = {
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient: { value: 0 },
      thicknessAttenuation: { value: 0.1 },
      thicknessPower: { value: 2 },
      thicknessScale: { value: 10 }
    };
    if (!(this as any).defines) {
      (this as any).defines = {};
    }
    (this as any).defines.USE_UV = '';
    this.onBeforeCompile = (shader: any) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader =
        '\n        uniform float thicknessPower;\n        uniform float thicknessScale;\n        uniform float thicknessDistortion;\n        uniform float thicknessAmbient;\n        uniform float thicknessAttenuation;\n      ' +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        '\n        void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {\n          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));\n          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;\n          #ifdef USE_COLOR\n            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;\n          #else\n            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;\n          #endif\n          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;\n        }\n\n        void main() {\n      '
      );
      const lightsFragmentBegin = ShaderChunk.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        '\n          RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );\n          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);\n        '
      );
      shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', lightsFragmentBegin);
      if ((this as any).onBeforeCompile2) {
        (this as any).onBeforeCompile2(shader);
      }
    };
  }
}

const defaultConfig = {
  count: 200,
  colors: [0, 0, 0],
  ambientColor: 16777215,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: {
    metalness: 0.5,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.15
  },
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0.5,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true
};

const tempObject3D = new Object3D();

interface ColorGradient {
  setColors: (colors: number[]) => void;
  getColorAt: (ratio: number, out?: Color) => Color;
}

function createColorGradient(colors: number[]): ColorGradient {
  let colorArray: number[];
  let colorObjects: Color[];

  function setColors(colors: number[]): void {
    colorArray = colors;
    colorObjects = [];
    colorArray.forEach((col) => {
      colorObjects.push(new Color(col));
    });
  }

  setColors(colors);

  return {
    setColors,
    getColorAt: function (ratio: number, out = new Color()): Color {
      const scaled = Math.max(0, Math.min(1, ratio)) * (colorArray.length - 1);
      const idx = Math.floor(scaled);
      const start = colorObjects[idx];
      if (idx >= colorArray.length - 1) return start.clone();
      const alpha = scaled - idx;
      const end = colorObjects[idx + 1];
      out.r = start.r + alpha * (end.r - start.r);
      out.g = start.g + alpha * (end.g - start.g);
      out.b = start.b + alpha * (end.b - start.b);
      return out;
    }
  };
}

interface SpheresConfig extends PhysicsConfig {
  colors: number[];
  ambientColor: number;
  ambientIntensity: number;
  lightIntensity: number;
  materialParams: {
    metalness: number;
    roughness: number;
    clearcoat: number;
    clearcoatRoughness: number;
  };
  followCursor: boolean;
}

class Spheres extends InstancedMesh {
  config: SpheresConfig;
  physics: Physics;
  ambientLight!: AmbientLight;
  light!: PointLight;

  constructor(renderer: WebGLRenderer, config: Partial<SpheresConfig> = {}) {
    const fullConfig = { ...defaultConfig, ...config } as SpheresConfig;
    const roomEnv = new RoomEnvironment();
    const pmremGenerator = new PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromScene(roomEnv).texture;
    const geometry = new SphereGeometry();
    const material = new ScatteringMaterial({ envMap, ...fullConfig.materialParams });
    material.envMapRotation.x = -Math.PI / 2;
    super(geometry, material, fullConfig.count);
    this.config = fullConfig;
    this.physics = new Physics(fullConfig);
    this.initLights();
    this.setColors(fullConfig.colors);
  }

  private initLights(): void {
    this.ambientLight = new AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
    this.add(this.ambientLight);
    this.light = new PointLight(this.config.colors[0], this.config.lightIntensity);
    this.add(this.light);
  }

  setColors(colors: number[]): void {
    if (Array.isArray(colors) && colors.length > 1) {
      const gradient = createColorGradient(colors);
      for (let idx = 0; idx < this.count; idx++) {
        this.setColorAt(idx, gradient.getColorAt(idx / this.count));
        if (idx === 0) {
          this.light.color.copy(gradient.getColorAt(idx / this.count));
        }
      }
      (this.instanceColor as any).needsUpdate = true;
    }
  }

  update(time: TimeData): void {
    this.physics.update(time);
    for (let idx = 0; idx < this.count; idx++) {
      tempObject3D.position.fromArray(this.physics.positionData, 3 * idx);
      if (idx === 0 && this.config.followCursor === false) {
        tempObject3D.scale.setScalar(0);
      } else {
        tempObject3D.scale.setScalar(this.physics.sizeData[idx]);
      }
      tempObject3D.updateMatrix();
      this.setMatrixAt(idx, tempObject3D.matrix);
      if (idx === 0) {
        this.light.position.copy(tempObject3D.position);
      }
    }
    (this.instanceMatrix as any).needsUpdate = true;
  }
}

interface BallpitInstance {
  three: ThreeSetup;
  spheres: Spheres;
  setCount: (count: number) => void;
  togglePause: () => void;
  dispose: () => void;
}

function createBallpit(canvas: HTMLCanvasElement, config: Partial<SpheresConfig> = {}): BallpitInstance {
  const three = new ThreeSetup({
    canvas,
    size: 'parent',
    rendererOptions: { antialias: true, alpha: true }
  });
  let spheres: Spheres;
  three.renderer.toneMapping = ACESFilmicToneMapping;
  three.camera.position.set(0, 0, 20);
  three.camera.lookAt(0, 0, 0);
  three.cameraMaxAspect = 1.5;
  three.resize();
  let isPaused = false;

  function initialize(newConfig: Partial<SpheresConfig>): void {
    if (spheres) {
      three.clear();
      three.scene.remove(spheres);
    }
    spheres = new Spheres(three.renderer, newConfig);
    three.scene.add(spheres);
  }

  initialize(config);

  const raycaster = new Raycaster();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const intersectionPoint = new Vector3();

  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';
  (canvas.style as any).webkitUserSelect = 'none';

  const interaction = setupInteraction(canvas, {
    onMove() {
      raycaster.setFromCamera(interaction.nPosition, three.camera);
      three.camera.getWorldDirection(plane.normal);
      raycaster.ray.intersectPlane(plane, intersectionPoint);
      spheres.physics.center.copy(intersectionPoint);
      spheres.config.controlSphere0 = true;
    },
    onLeave() {
      spheres.config.controlSphere0 = false;
    }
  });

  three.onBeforeRender = (time: TimeData) => {
    if (!isPaused) {
      spheres.update(time);
    }
  };

  three.onAfterResize = (size: Size) => {
    spheres.config.maxX = size.wWidth / 2;
    spheres.config.maxY = size.wHeight / 2;
  };

  return {
    three,
    get spheres(): Spheres {
      return spheres;
    },
    setCount(count: number): void {
      initialize({ ...spheres.config, count });
    },
    togglePause(): void {
      isPaused = !isPaused;
    },
    dispose(): void {
      interaction.dispose();
      three.dispose();
    }
  };
}

@Component({
  selector: 'ngw-ballpit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ballpit.component.html',
  styleUrl: './ballpit.component.css'
})
export class BallpitComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() count = 200;
  @Input() colors: number[] = [0, 0, 0];
  @Input() ambientColor = 16777215;
  @Input() ambientIntensity = 1;
  @Input() lightIntensity = 200;
  @Input() minSize = 0.5;
  @Input() maxSize = 1;
  @Input() size0 = 1;
  @Input() gravity = 0.5;
  @Input() friction = 0.9975;
  @Input() wallBounce = 0.95;
  @Input() maxVelocity = 0.15;
  @Input() followCursor = true;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private ballpitInstance: BallpitInstance | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initBallpit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.ballpitInstance) {
      return;
    }

    if (changes['count']) {
      this.ballpitInstance.setCount(this.count);
    }

    if (changes['colors']) {
      this.ballpitInstance.spheres.setColors(this.colors);
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.ballpitInstance) {
      this.ballpitInstance.dispose();
    }
  }

  private initBallpit(): void {
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) {
      return;
    }

    this.ballpitInstance = createBallpit(canvas, {
      count: this.count,
      colors: this.colors,
      ambientColor: this.ambientColor,
      ambientIntensity: this.ambientIntensity,
      lightIntensity: this.lightIntensity,
      minSize: this.minSize,
      maxSize: this.maxSize,
      size0: this.size0,
      gravity: this.gravity,
      friction: this.friction,
      wallBounce: this.wallBounce,
      maxVelocity: this.maxVelocity,
      followCursor: this.followCursor
    });
  }
}

