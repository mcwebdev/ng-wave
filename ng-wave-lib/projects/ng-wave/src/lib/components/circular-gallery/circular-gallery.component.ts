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

interface GalleryItem {
  image: string;
  text: string;
}

function debounce(func: Function, wait: number): Function {
  let timeout: number | undefined;
  return function (this: any, ...args: any[]) {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    const context = this;
    timeout = window.setTimeout(() => func.apply(context, args), wait);
  };
}

function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance: any): void {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach(key => {
    if (key !== 'constructor' && typeof instance[key] === 'function') {
      instance[key] = instance[key].bind(instance);
    }
  });
}

function createTextTexture(gl: Renderer['gl'], text: string, font = 'bold 30px monospace', color = 'black'): { texture: Texture; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get 2D context');
  }
  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(parseInt(font, 10) * 1.2);
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
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

class Title {
  gl: Renderer['gl'];
  plane: Mesh;
  renderer: Renderer;
  text: string;
  textColor: string;
  font: string;
  mesh?: Mesh;

  constructor({ gl, plane, renderer, text, textColor = '#545050', font = '30px sans-serif' }: {
    gl: Renderer['gl'];
    plane: Mesh;
    renderer: Renderer;
    text: string;
    textColor?: string;
    font?: string;
  }) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.renderer = renderer;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }

  createMesh(): void {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    const aspect = width / height;
    const textHeight = this.plane.scale.y * 0.15;
    const textWidth = textHeight * aspect;
    this.mesh.scale.set(textWidth, textHeight, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  }
}

class Media {
  extra = 0;
  geometry: Plane;
  gl: Renderer['gl'];
  image: string;
  index: number;
  length: number;
  renderer: Renderer;
  scene: Transform;
  screen: Screen;
  text: string;
  viewport: Viewport;
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  program?: Program;
  plane?: Mesh;
  title?: Title;
  speed = 0;
  isBefore = false;
  isAfter = false;
  width = 0;
  widthTotal = 0;
  x = 0;
  scale = 1;
  padding = 0;

  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    renderer,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius = 0,
    font
  }: {
    geometry: Plane;
    gl: Renderer['gl'];
    image: string;
    index: number;
    length: number;
    renderer: Renderer;
    scene: Transform;
    screen: Screen;
    text: string;
    viewport: Viewport;
    bend: number;
    textColor: string;
    borderRadius?: number;
    font: string;
  }) {
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }

  createShader(): void {
    const texture = new Texture(this.gl, {
      generateMipmaps: true
    });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;
        
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
          
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius }
      },
      transparent: true
    });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      if (this.program) {
        texture.image = img;
        this.program.uniforms['uImageSizes'].value = [img.naturalWidth, img.naturalHeight];
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

  createTitle(): void {
    if (!this.plane) return;
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      renderer: this.renderer,
      text: this.text,
      textColor: this.textColor,
      font: this.font
    });
  }

  update(scroll: ScrollState, direction: string): void {
    if (!this.plane || !this.program) return;
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B_abs = Math.abs(this.bend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);

      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms['uTime'].value += 0.04;
    this.program.uniforms['uSpeed'].value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize({ screen, viewport }: { screen?: Screen; viewport?: Viewport } = {}): void {
    if (screen) this.screen = screen;
    if (viewport) {
      this.viewport = viewport;
    }
    if (!this.plane || !this.program) return;
    this.scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
    this.program.uniforms['uPlaneSizes'].value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

@Component({
  selector: 'ngw-circular-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './circular-gallery.component.html',
  styleUrl: './circular-gallery.component.css'
})
export class CircularGalleryComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() items?: GalleryItem[];
  @Input() bend = 3;
  @Input() textColor = '#ffffff';
  @Input() borderRadius = 0.05;
  @Input() font = 'bold 30px Figtree';
  @Input() scrollSpeed = 2;
  @Input() scrollEase = 0.05;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private renderer?: Renderer;
  private camera?: Camera;
  private scene?: Transform;
  private planeGeometry?: Plane;
  private medias: Media[] = [];
  private mediasImages: GalleryItem[] = [];
  private scroll: ScrollState = { ease: 0.05, current: 0, target: 0, last: 0 };
  private screen: Screen = { width: 0, height: 0 };
  private viewport: Viewport = { width: 0, height: 0 };
  private animationFrameId?: number;
  private isDown = false;
  private start = 0;
  private resizeObserver?: ResizeObserver;
  private onCheckDebounce?: Function;
  private boundOnResize?: () => void;
  private boundOnWheel?: (e: WheelEvent) => void;
  private boundOnTouchDown?: (e: MouseEvent | TouchEvent) => void;
  private boundOnTouchMove?: (e: MouseEvent | TouchEvent) => void;
  private boundOnTouchUp?: () => void;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initGallery();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.renderer) {
      return;
    }

    if (changes['items'] || changes['bend'] || changes['textColor'] || changes['borderRadius'] || changes['font']) {
      this.recreateMedias();
    }

    if (changes['scrollSpeed']) {
      // scrollSpeed is used in event handlers
    }

    if (changes['scrollEase']) {
      this.scroll.ease = this.scrollEase;
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
    const delta = e.deltaY || (e as any).wheelDelta || (e as any).detail;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    if (this.onCheckDebounce) {
      this.onCheckDebounce();
    }
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent): void {
    if (!this.containerRef?.nativeElement.contains(e.target as Node)) {
      return;
    }
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.clientX;
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.isDown || !this.containerRef?.nativeElement.contains(e.target as Node)) {
      return;
    }
    const distance = (this.start - e.clientX) * (this.scrollSpeed * 0.025);
    this.scroll.target = (this.scroll.position || 0) + distance;
  }

  @HostListener('mouseup')
  onMouseUp(): void {
    this.isDown = false;
    this.onCheck();
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    if (!this.containerRef?.nativeElement.contains(e.target as Node)) {
      return;
    }
    e.preventDefault();
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.touches[0].clientX;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent): void {
    if (!this.isDown || !this.containerRef?.nativeElement.contains(e.target as Node)) {
      return;
    }
    e.preventDefault();
    const distance = (this.start - e.touches[0].clientX) * (this.scrollSpeed * 0.025);
    this.scroll.target = (this.scroll.position || 0) + distance;
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    this.isDown = false;
    this.onCheck();
  }

  private initGallery(): void {
    const container = this.containerRef.nativeElement;
    if (!container) {
      return;
    }

    document.documentElement.classList.remove('no-js');
    this.scroll = { ease: this.scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(() => this.onCheck(), 200);
    this.createRenderer(container);
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias();
    this.update();
    this.addEventListeners();
  }

  private createRenderer(container: HTMLElement): void {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.renderer.gl.clearColor(0, 0, 0, 0);
    const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
    container.appendChild(canvas);
  }

  private createCamera(): void {
    if (!this.renderer) return;
    this.camera = new Camera(this.renderer.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }

  private createScene(): void {
    this.scene = new Transform();
  }

  private createGeometry(): void {
    if (!this.renderer) return;
    this.planeGeometry = new Plane(this.renderer.gl, {
      heightSegments: 50,
      widthSegments: 100
    });
  }

  private createMedias(): void {
    if (!this.renderer || !this.planeGeometry || !this.scene) return;

    const defaultItems: GalleryItem[] = [
      { image: `https://picsum.photos/seed/1/800/600?grayscale`, text: 'Bridge' },
      { image: `https://picsum.photos/seed/2/800/600?grayscale`, text: 'Desk Setup' },
      { image: `https://picsum.photos/seed/3/800/600?grayscale`, text: 'Waterfall' },
      { image: `https://picsum.photos/seed/4/800/600?grayscale`, text: 'Strawberries' },
      { image: `https://picsum.photos/seed/5/800/600?grayscale`, text: 'Deep Diving' },
      { image: `https://picsum.photos/seed/16/800/600?grayscale`, text: 'Train Track' },
      { image: `https://picsum.photos/seed/17/800/600?grayscale`, text: 'Santorini' },
      { image: `https://picsum.photos/seed/8/800/600?grayscale`, text: 'Blurry Lights' },
      { image: `https://picsum.photos/seed/9/800/600?grayscale`, text: 'New York' },
      { image: `https://picsum.photos/seed/10/800/600?grayscale`, text: 'Good Boy' },
      { image: `https://picsum.photos/seed/21/800/600?grayscale`, text: 'Coastline' },
      { image: `https://picsum.photos/seed/12/800/600?grayscale`, text: 'Palm Trees' }
    ];
    const galleryItems = this.items && this.items.length ? this.items : defaultItems;
    this.mediasImages = galleryItems.concat(galleryItems);
    this.medias = this.mediasImages.map((data, index) => {
      return new Media({
        geometry: this.planeGeometry!,
        gl: this.renderer!.gl,
        image: data.image,
        index,
        length: this.mediasImages.length,
        renderer: this.renderer!,
        scene: this.scene!,
        screen: this.screen,
        text: data.text,
        viewport: this.viewport,
        bend: this.bend,
        textColor: this.textColor,
        borderRadius: this.borderRadius,
        font: this.font
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

  private onCheck(): void {
    if (!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  private onResize(): void {
    if (!this.containerRef?.nativeElement || !this.renderer || !this.camera) return;

    this.screen = {
      width: this.containerRef.nativeElement.clientWidth,
      height: this.containerRef.nativeElement.clientHeight
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height
    });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    if (this.medias) {
      this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }

  private update = (): void => {
    this.animationFrameId = requestAnimationFrame(this.update);

    if (!this.renderer || !this.camera || !this.scene) return;

    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
    if (this.medias) {
      this.medias.forEach(media => media.update(this.scroll, direction));
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
  };

  private addEventListeners(): void {
    if (!this.containerRef?.nativeElement) return;

    this.boundOnResize = () => this.onResize();
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
      const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
      if (canvas && canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
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

