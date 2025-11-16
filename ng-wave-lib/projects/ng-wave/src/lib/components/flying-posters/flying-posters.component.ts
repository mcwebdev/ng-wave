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
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';

const vertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

uniform float uPosition;
uniform float uTime;
uniform float uSpeed;
uniform vec3 distortionAxis;
uniform vec3 rotationAxis;
uniform float uDistortion;

varying vec2 vUv;
varying vec3 vNormal;

float PI = 3.141592653589793238;
mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(
      oc * axis.x * axis.x + c,         oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
      oc * axis.x * axis.y + axis.z * s,oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
      oc * axis.z * axis.x - axis.y * s,oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
      0.0,                              0.0,                                0.0,                                1.0
    );
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
  mat4 m = rotationMatrix(axis, angle);
  return (m * vec4(v, 1.0)).xyz;
}

float qinticInOut(float t) {
  return t < 0.5
    ? 16.0 * pow(t, 5.0)
    : -0.5 * abs(pow(2.0 * t - 2.0, 5.0)) + 1.0;
}

void main() {
  vUv = uv;
  
  float norm = 0.5;
  vec3 newpos = position;
  float offset = (dot(distortionAxis, position) + norm / 2.) / norm;
  float localprogress = clamp(
    (fract(uPosition * 5.0 * 0.01) - 0.01 * uDistortion * offset) / (1. - 0.01 * uDistortion),
    0.,
    2.
  );
  localprogress = qinticInOut(localprogress) * PI;
  newpos = rotate(newpos, rotationAxis, localprogress);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newpos, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform sampler2D tMap;

varying vec2 vUv;

void main() {
  vec2 imageSize = uImageSize;
  vec2 planeSize = uPlaneSize;

  float imageAspect = imageSize.x / imageSize.y;
  float planeAspect = planeSize.x / planeSize.y;
  vec2 scale = vec2(1.0, 1.0);

  if (planeAspect > imageAspect) {
      scale.x = imageAspect / planeAspect;
  } else {
      scale.y = planeAspect / imageAspect;
  }

  vec2 uv = vUv * scale + (1.0 - scale) * 0.5;

  gl_FragColor = texture2D(tMap, uv);
}
`;

function autoBind(self: any, { include, exclude }: { include?: any[]; exclude?: any[] } = {}): any {
  const getAllProperties = (object: any): Array<[any, string | symbol]> => {
    const properties = new Set<[any, string | symbol]>();
    let current = object;
    do {
      for (const key of Reflect.ownKeys(current)) {
        properties.add([current, key]);
      }
    } while ((current = Reflect.getPrototypeOf(current)) && current !== Object.prototype);
    return Array.from(properties);
  };

  const filter = (key: string | symbol): boolean => {
    const match = (pattern: string | RegExp) => (typeof pattern === 'string' ? key === pattern : (pattern as RegExp).test(String(key)));

    if (include) return include.some(match);
    if (exclude) return !exclude.some(match);
    return true;
  };

  for (const [object, key] of getAllProperties(self.constructor.prototype)) {
    if (key === 'constructor' || !filter(key)) continue;
    const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
    if (descriptor && typeof descriptor.value === 'function') {
      self[key] = self[key].bind(self);
    }
  }
  return self;
}

function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}

function map(num: number, min1: number, max1: number, min2: number, max2: number, round = false): number {
  const num1 = (num - min1) / (max1 - min1);
  const num2 = num1 * (max2 - min2) + min2;
  return round ? Math.round(num2) : num2;
}

interface Screen {
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

interface ScrollState {
  ease: number;
  current: number;
  target: number;
  last: number;
  position?: number;
}

class Media {
  extra = 0;
  gl: Renderer['gl'];
  geometry: Plane;
  scene: Transform;
  screen: Screen;
  viewport: Viewport;
  image: string;
  length: number;
  index: number;
  planeWidth: number;
  planeHeight: number;
  distortion: number;
  program?: Program;
  plane?: Mesh;
  padding = 0;
  height = 0;
  heightTotal = 0;
  y = 0;

  constructor({
    gl,
    geometry,
    scene,
    screen,
    viewport,
    image,
    length,
    index,
    planeWidth,
    planeHeight,
    distortion
  }: {
    gl: Renderer['gl'];
    geometry: Plane;
    scene: Transform;
    screen: Screen;
    viewport: Viewport;
    image: string;
    length: number;
    index: number;
    planeWidth: number;
    planeHeight: number;
    distortion: number;
  }) {
    this.extra = 0;
    this.gl = gl;
    this.geometry = geometry;
    this.scene = scene;
    this.screen = screen;
    this.viewport = viewport;
    this.image = image;
    this.length = length;
    this.index = index;
    this.planeWidth = planeWidth;
    this.planeHeight = planeHeight;
    this.distortion = distortion;

    this.createShader();
    this.createMesh();
    this.onResize();
  }

  createShader(): void {
    const texture = new Texture(this.gl, {
      generateMipmaps: false
    });

    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      fragment: fragmentShader,
      vertex: vertexShader,
      uniforms: {
        tMap: { value: texture },
        uPosition: { value: 0 },
        uPlaneSize: { value: [0, 0] },
        uImageSize: { value: [0, 0] },
        uSpeed: { value: 0 },
        rotationAxis: { value: [0, 1, 0] },
        distortionAxis: { value: [1, 1, 0] },
        uDistortion: { value: this.distortion },
        uViewportSize: { value: [this.viewport.width, this.viewport.height] },
        uTime: { value: 0 }
      },
      cullFace: false
    });

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      if (this.program) {
        texture.image = img;
        this.program.uniforms['uImageSize'].value = [img.naturalWidth, img.naturalHeight];
      }
    };
  }

  createMesh(): void {
    if (!this.program) return;
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  }

  setScale(): void {
    if (!this.plane || !this.program) return;
    this.plane.scale.x = (this.viewport.width * this.planeWidth) / this.screen.width;
    this.plane.scale.y = (this.viewport.height * this.planeHeight) / this.screen.height;

    this.plane.position.x = 0;
    this.program.uniforms['uPlaneSize'].value = [this.plane.scale.x, this.plane.scale.y];
  }

  onResize({ screen, viewport }: { screen?: Screen; viewport?: Viewport } = {}): void {
    if (screen) this.screen = screen;
    if (viewport) {
      this.viewport = viewport;
      if (this.plane?.program) {
        this.plane.program.uniforms['uViewportSize'].value = [this.viewport.width, this.viewport.height];
      }
    }
    this.setScale();

    this.padding = 5;
    this.height = this.plane?.scale.y ? this.plane.scale.y + this.padding : 0;
    this.heightTotal = this.height * this.length;

    this.y = -this.heightTotal / 2 + (this.index + 0.5) * this.height;
  }

  update(scroll: ScrollState): void {
    if (!this.plane || !this.program) return;
    this.plane.position.y = this.y - scroll.current - this.extra;

    const position = map(this.plane.position.y, -this.viewport.height, this.viewport.height, 5, 15);

    this.program.uniforms['uPosition'].value = position;
    this.program.uniforms['uTime'].value += 0.04;
    this.program.uniforms['uSpeed'].value = scroll.current;

    const planeHeight = this.plane.scale.y;
    const viewportHeight = this.viewport.height;

    const topEdge = this.plane.position.y + planeHeight / 2;
    const bottomEdge = this.plane.position.y - planeHeight / 2;

    if (topEdge < -viewportHeight / 2) {
      this.extra -= this.heightTotal;
    } else if (bottomEdge > viewportHeight / 2) {
      this.extra += this.heightTotal;
    }
  }
}

@Component({
  selector: 'ngw-flying-posters',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flying-posters.component.html',
  styleUrl: './flying-posters.component.css'
})
export class FlyingPostersComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() items: string[] = [];
  @Input() planeWidth = 320;
  @Input() planeHeight = 320;
  @Input() distortion = 3;
  @Input() scrollEase = 0.01;
  @Input() cameraFov = 45;
  @Input() cameraZ = 20;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer?: Renderer;
  private camera?: Camera;
  private scene?: Transform;
  private planeGeometry?: Plane;
  private medias: Media[] = [];
  private scroll: ScrollState = { ease: 0.01, current: 0, target: 0, last: 0 };
  private screen: Screen = { width: 0, height: 0 };
  private viewport: Viewport = { width: 0, height: 0 };
  private animationFrameId?: number;
  private isDown = false;
  private start = 0;
  private resizeObserver?: ResizeObserver;
  private loaded = 0;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initCanvas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.renderer) {
      return;
    }

    if (changes['items']) {
      this.recreateMedias();
      this.createPreloader();
    }

    if (changes['planeWidth'] || changes['planeHeight'] || changes['distortion']) {
      this.recreateMedias();
    }

    if (changes['scrollEase']) {
      this.scroll.ease = this.scrollEase;
    }

    if (changes['cameraFov'] || changes['cameraZ']) {
      this.updateCamera();
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.destroy();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.onResize();
  }

  @HostListener('wheel', ['$event'])
  onWheel(e: WheelEvent): void {
    if (!this.containerRef?.nativeElement.contains(e.target as Node)) {
      return;
    }
    e.preventDefault();
    const speed = e.deltaY;
    this.scroll.target += speed * 0.005;
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent): void {
    if (!this.containerRef?.nativeElement.contains(e.target as Node)) {
      return;
    }
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.clientY;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.isDown || !this.containerRef?.nativeElement.contains(e.target as Node)) {
      return;
    }
    const distance = (this.start - e.clientY) * 0.1;
    this.scroll.target = (this.scroll.position || 0) + distance;
  }

  @HostListener('mouseup')
  onMouseUp(): void {
    this.isDown = false;
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    if (!this.containerRef?.nativeElement.contains(e.target as Node)) {
      return;
    }
    e.preventDefault();
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.touches[0].clientY;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (!this.isDown || !this.containerRef?.nativeElement.contains(e.target as Node)) {
      return;
    }
    e.preventDefault();
    const distance = (this.start - e.touches[0].clientY) * 0.1;
    this.scroll.target = (this.scroll.position || 0) + distance;
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    this.isDown = false;
  }

  private initCanvas(): void {
    const container = this.containerRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!container || !canvas) {
      return;
    }

    this.scroll = { ease: this.scrollEase, current: 0, target: 0, last: 0 };
    this.createRenderer(canvas);
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias();
    this.createPreloader();
    this.update();
    this.addEventListeners();
  }

  private createRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new Renderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio, 2)
    });
  }

  private createCamera(): void {
    if (!this.renderer) return;
    this.camera = new Camera(this.renderer.gl);
    this.camera.fov = this.cameraFov;
    this.camera.position.z = this.cameraZ;
  }

  private updateCamera(): void {
    if (!this.camera) return;
    this.camera.fov = this.cameraFov;
    this.camera.position.z = this.cameraZ;
    if (this.renderer) {
      this.camera.perspective({
        aspect: this.renderer.gl.canvas.width / this.renderer.gl.canvas.height
      });
    }
  }

  private createScene(): void {
    this.scene = new Transform();
  }

  private createGeometry(): void {
    if (!this.renderer) return;
    this.planeGeometry = new Plane(this.renderer.gl, {
      heightSegments: 1,
      widthSegments: 100
    });
  }

  private createMedias(): void {
    if (!this.renderer || !this.planeGeometry || !this.scene) return;

    this.medias = this.items.map((image, index) => {
      return new Media({
        gl: this.renderer!.gl,
        geometry: this.planeGeometry!,
        scene: this.scene!,
        screen: this.screen,
        viewport: this.viewport,
        image,
        length: this.items.length,
        index,
        planeWidth: this.planeWidth,
        planeHeight: this.planeHeight,
        distortion: this.distortion
      });
    });
  }

  private recreateMedias(): void {
    if (!this.renderer || !this.planeGeometry || !this.scene) return;

    // Clean up existing medias
    this.medias.forEach(media => {
      if (media.plane) {
        this.scene!.removeChild(media.plane);
      }
    });
    this.medias = [];

    // Recreate
    this.createMedias();
  }

  private createPreloader(): void {
    this.loaded = 0;
    if (!this.items.length) return;

    this.items.forEach(src => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = src;
      image.onload = () => {
        this.loaded += 1;
        if (this.loaded === this.items.length) {
          document.documentElement.classList.remove('loading');
          document.documentElement.classList.add('loaded');
        }
      };
    });
  }

  private onResize(): void {
    if (!this.containerRef?.nativeElement || !this.renderer || !this.camera) return;

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    this.screen = {
      width: rect.width,
      height: rect.height
    };

    this.renderer.setSize(this.screen.width, this.screen.height);

    this.camera.perspective({
      aspect: this.renderer.gl.canvas.width / this.renderer.gl.canvas.height
    });

    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;

    this.viewport = { height, width };

    if (this.medias) {
      this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }

  private update = (): void => {
    this.animationFrameId = requestAnimationFrame(this.update);

    if (!this.renderer || !this.camera || !this.scene) return;

    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);

    if (this.medias) {
      this.medias.forEach(media => media.update(this.scroll));
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
  };

  private addEventListeners(): void {
    if (!this.containerRef?.nativeElement) return;

    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  private destroy(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.renderer) {
      try {
        const loseContextExt = this.renderer.gl.getExtension('WEBGL_lose_context');
        if (loseContextExt) {
          loseContextExt.loseContext();
        }
      } catch {
        // Already cleaned up
      }
    }
  }
}

