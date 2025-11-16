import { Component, input, ElementRef, ViewChild, AfterViewInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';

interface Pointer {
  id: number;
  texcoordX: number;
  texcoordY: number;
  prevTexcoordX: number;
  prevTexcoordY: number;
  deltaX: number;
  deltaY: number;
  down: boolean;
  moved: boolean;
  color: { r: number; g: number; b: number };
}

interface Config {
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  CAPTURE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  PRESSURE: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  SHADING: boolean;
  COLOR_UPDATE_SPEED: number;
  PAUSED: boolean;
  BACK_COLOR: { r: number; g: number; b: number };
  TRANSPARENT: boolean;
}

interface WebGLExt {
  formatRGBA: { internalFormat: number; format: number } | null;
  formatRG: { internalFormat: number; format: number } | null;
  formatR: { internalFormat: number; format: number } | null;
  halfFloatTexType: number | null;
  supportLinearFiltering: boolean;
}

interface FBO {
  texture: WebGLTexture | null;
  fbo: WebGLFramebuffer | null;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach(id: number): number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

interface Uniforms {
  [key: string]: WebGLUniformLocation | null;
}

class Material {
  vertexShader: WebGLShader;
  fragmentShaderSource: string;
  programs: { [hash: number]: WebGLProgram } = {};
  activeProgram: WebGLProgram | null = null;
  uniforms: Uniforms = {};

  constructor(vertexShader: WebGLShader, fragmentShaderSource: string) {
    this.vertexShader = vertexShader;
    this.fragmentShaderSource = fragmentShaderSource;
  }

  setKeywords(keywords: string[], gl: WebGLRenderingContext, compileShader: (type: number, source: string, keywords: string[] | null) => WebGLShader, createProgram: (vertexShader: WebGLShader, fragmentShader: WebGLShader) => WebGLProgram, getUniforms: (program: WebGLProgram, gl: WebGLRenderingContext) => Uniforms): void {
    let hash = 0;
    for (let i = 0; i < keywords.length; i++) hash += this.hashCode(keywords[i]);
    let program = this.programs[hash];
    if (program == null) {
      let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
      program = createProgram(this.vertexShader, fragmentShader);
      this.programs[hash] = program;
    }
    if (program === this.activeProgram) return;
    this.uniforms = getUniforms(program, gl);
    this.activeProgram = program;
  }

  bind(gl: WebGLRenderingContext): void {
    if (this.activeProgram) {
      gl.useProgram(this.activeProgram);
    }
  }

  private hashCode(s: string): number {
    if (s.length === 0) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

class Program {
  uniforms: Uniforms = {};
  program: WebGLProgram;

  constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader, gl: WebGLRenderingContext, createProgram: (vertexShader: WebGLShader, fragmentShader: WebGLShader) => WebGLProgram, getUniforms: (program: WebGLProgram, gl: WebGLRenderingContext) => Uniforms) {
    this.program = createProgram(vertexShader, fragmentShader);
    this.uniforms = getUniforms(this.program, gl);
  }

  bind(gl: WebGLRenderingContext): void {
    gl.useProgram(this.program);
  }
}

@Component({
  selector: 'ngw-splash-cursor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-cursor.component.html',
  styleUrl: './splash-cursor.component.css'
})
export class SplashCursorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly simResolution = input<number>(128);
  readonly dyeResolution = input<number>(1440);
  readonly captureResolution = input<number>(512);
  readonly densityDissipation = input<number>(3.5);
  readonly velocityDissipation = input<number>(2);
  readonly pressure = input<number>(0.1);
  readonly pressureIterations = input<number>(20);
  readonly curl = input<number>(3);
  readonly splatRadius = input<number>(0.2);
  readonly splatForce = input<number>(6000);
  readonly shading = input<boolean>(true);
  readonly colorUpdateSpeed = input<number>(10);
  readonly backColor = input<{ r: number; g: number; b: number }>({ r: 0.5, g: 0, b: 0 });
  readonly transparent = input<boolean>(true);
  readonly className = input<string>('');

  private readonly platformId = inject(PLATFORM_ID);
  private gl: WebGLRenderingContext | null = null;
  private ext: WebGLExt | null = null;
  private config: Config | null = null;
  private pointers: Pointer[] = [];
  private dye: DoubleFBO | null = null;
  private velocity: DoubleFBO | null = null;
  private divergence: FBO | null = null;
  private curlFBO: FBO | null = null;
  private pressureFBO: DoubleFBO | null = null;
  private copyProgram: Program | null = null;
  private clearProgram: Program | null = null;
  private splatProgram: Program | null = null;
  private advectionProgram: Program | null = null;
  private divergenceProgram: Program | null = null;
  private curlProgram: Program | null = null;
  private vorticityProgram: Program | null = null;
  private pressureProgram: Program | null = null;
  private gradientSubtractProgram: Program | null = null;
  private displayMaterial: Material | null = null;
  private blit: ((target: FBO | null, clear?: boolean) => void) | null = null;
  private baseVertexShader: WebGLShader | null = null;
  private lastUpdateTime = 0;
  private colorUpdateTimer = 0.0;
  private animationFrameId: number | null = null;
  private mouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private firstMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private firstTouchStartHandler: ((e: TouchEvent) => void) | null = null;
  private touchStartHandler: ((e: TouchEvent) => void) | null = null;
  private touchMoveHandler: ((e: TouchEvent) => void) | null = null;
  private touchEndHandler: ((e: TouchEvent) => void) | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.canvasRef?.nativeElement) return;
    this.init();
  }

  private init(): void {
    if (!isPlatformBrowser(this.platformId) || !this.canvasRef?.nativeElement) return;

    const canvas = this.canvasRef.nativeElement;
    const pointer: Pointer = {
      id: -1,
      texcoordX: 0,
      texcoordY: 0,
      prevTexcoordX: 0,
      prevTexcoordY: 0,
      deltaX: 0,
      deltaY: 0,
      down: false,
      moved: false,
      color: { r: 0, g: 0, b: 0 }
    };
    this.pointers = [pointer];

    this.config = {
      SIM_RESOLUTION: this.simResolution(),
      DYE_RESOLUTION: this.dyeResolution(),
      CAPTURE_RESOLUTION: this.captureResolution(),
      DENSITY_DISSIPATION: this.densityDissipation(),
      VELOCITY_DISSIPATION: this.velocityDissipation(),
      PRESSURE: this.pressure(),
      PRESSURE_ITERATIONS: this.pressureIterations(),
      CURL: this.curl(),
      SPLAT_RADIUS: this.splatRadius(),
      SPLAT_FORCE: this.splatForce(),
      SHADING: this.shading(),
      COLOR_UPDATE_SPEED: this.colorUpdateSpeed(),
      PAUSED: false,
      BACK_COLOR: this.backColor(),
      TRANSPARENT: this.transparent()
    };

    const webglContext = this.getWebGLContext(canvas);
    if (!webglContext) return;
    this.gl = webglContext.gl;
    this.ext = webglContext.ext;

    if (!this.ext.supportLinearFiltering) {
      this.config.DYE_RESOLUTION = 256;
      this.config.SHADING = false;
    }

    const compileShader = (type: number, source: string, keywords: string[] | null): WebGLShader => {
      return this.compileShader(type, source, keywords);
    };

    const createProgram = (vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram => {
      return this.createProgram(vertexShader, fragmentShader);
    };

    const getUniforms = (program: WebGLProgram, gl: WebGLRenderingContext): Uniforms => {
      return this.getUniforms(program, gl);
    };

    this.baseVertexShader = compileShader(
      this.gl.VERTEX_SHADER,
      `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;

        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `,
      null
    );

    const copyShader = compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;

        void main () {
            gl_FragColor = texture2D(uTexture, vUv);
        }
      `,
      null
    );

    const clearShader = compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;

        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
      `,
      null
    );

    const displayShaderSource = `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D uTexture;
      uniform sampler2D uDithering;
      uniform vec2 ditherScale;
      uniform vec2 texelSize;

      vec3 linearToGamma (vec3 color) {
          color = max(color, vec3(0));
          return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
      }

      void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          #ifdef SHADING
              vec3 lc = texture2D(uTexture, vL).rgb;
              vec3 rc = texture2D(uTexture, vR).rgb;
              vec3 tc = texture2D(uTexture, vT).rgb;
              vec3 bc = texture2D(uTexture, vB).rgb;

              float dx = length(rc) - length(lc);
              float dy = length(tc) - length(bc);

              vec3 n = normalize(vec3(dx, dy, length(texelSize)));
              vec3 l = vec3(0.0, 0.0, 1.0);

              float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
              c *= diffuse;
          #endif

          float a = max(c.r, max(c.g, c.b));
          gl_FragColor = vec4(c, a);
      }
    `;

    const splatShader = compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;

        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
      `,
      null
    );

    const advectionShader = compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;

        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
            vec2 st = uv / tsize - 0.5;
            vec2 iuv = floor(st);
            vec2 fuv = fract(st);

            vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
            vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
            vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
            vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

            return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }

        void main () {
            #ifdef MANUAL_FILTERING
                vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
                vec4 result = bilerp(uSource, coord, dyeTexelSize);
            #else
                vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
                vec4 result = texture2D(uSource, coord);
            #endif
            float decay = 1.0 + dissipation * dt;
            gl_FragColor = result / decay;
        }
      `,
      this.ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
    );

    const divergenceShader = compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;

            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }

            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `,
      null
    );

    const curlShader = compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
      `,
      null
    );

    const vorticityShader = compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;

        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;

            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;

            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity += force * dt;
            velocity = min(max(velocity, -1000.0), 1000.0);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `,
      null
    );

    const pressureShader = compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;

        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `,
      null
    );

    const gradientSubtractShader = compileShader(
      this.gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;

        void main () {
            float L = texture2D(uPressure, vL).x;
            float R = texture2D(uPressure, vR).x;
            float T = texture2D(uPressure, vT).x;
            float B = texture2D(uPressure, vB).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `,
      null
    );

    this.blit = (() => {
      this.gl!.bindBuffer(this.gl!.ARRAY_BUFFER, this.gl!.createBuffer());
      this.gl!.bufferData(this.gl!.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), this.gl!.STATIC_DRAW);
      this.gl!.bindBuffer(this.gl!.ELEMENT_ARRAY_BUFFER, this.gl!.createBuffer());
      this.gl!.bufferData(this.gl!.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), this.gl!.STATIC_DRAW);
      this.gl!.vertexAttribPointer(0, 2, this.gl!.FLOAT, false, 0, 0);
      this.gl!.enableVertexAttribArray(0);
      return (target: FBO | null, clear = false) => {
        if (target == null) {
          this.gl!.viewport(0, 0, this.gl!.drawingBufferWidth, this.gl!.drawingBufferHeight);
          this.gl!.bindFramebuffer(this.gl!.FRAMEBUFFER, null);
        } else {
          this.gl!.viewport(0, 0, target.width, target.height);
          this.gl!.bindFramebuffer(this.gl!.FRAMEBUFFER, target.fbo);
        }
        if (clear) {
          this.gl!.clearColor(0.0, 0.0, 0.0, 1.0);
          this.gl!.clear(this.gl!.COLOR_BUFFER_BIT);
        }
        this.gl!.drawElements(this.gl!.TRIANGLES, 6, this.gl!.UNSIGNED_SHORT, 0);
      };
    })();

    this.copyProgram = new Program(this.baseVertexShader, copyShader, this.gl, createProgram, getUniforms);
    this.clearProgram = new Program(this.baseVertexShader, clearShader, this.gl, createProgram, getUniforms);
    this.splatProgram = new Program(this.baseVertexShader, splatShader, this.gl, createProgram, getUniforms);
    this.advectionProgram = new Program(this.baseVertexShader, advectionShader, this.gl, createProgram, getUniforms);
    this.divergenceProgram = new Program(this.baseVertexShader, divergenceShader, this.gl, createProgram, getUniforms);
    this.curlProgram = new Program(this.baseVertexShader, curlShader, this.gl, createProgram, getUniforms);
    this.vorticityProgram = new Program(this.baseVertexShader, vorticityShader, this.gl, createProgram, getUniforms);
    this.pressureProgram = new Program(this.baseVertexShader, pressureShader, this.gl, createProgram, getUniforms);
    this.gradientSubtractProgram = new Program(this.baseVertexShader, gradientSubtractShader, this.gl, createProgram, getUniforms);
    this.displayMaterial = new Material(this.baseVertexShader, displayShaderSource);

    this.initFramebuffers();
    this.updateKeywords();
    this.lastUpdateTime = Date.now();
    this.colorUpdateTimer = 0.0;

    this.setupEventHandlers(canvas);
    this.updateFrame();
  }

  private getWebGLContext(canvas: HTMLCanvasElement): { gl: WebGLRenderingContext; ext: WebGLExt } | null {
    const params = {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false
    };
    let gl: WebGLRenderingContext | null = canvas.getContext('webgl2', params) as WebGLRenderingContext | null;
    const isWebGL2 = !!gl;
    if (!isWebGL2) gl = (canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params)) as WebGLRenderingContext | null;
    if (!gl) return null;

    let halfFloat: OES_texture_half_float | null = null;
    let supportLinearFiltering: boolean;
    if (isWebGL2) {
      gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = !!gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = !!gl.getExtension('OES_texture_half_float_linear');
    }
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : (halfFloat && halfFloat.HALF_FLOAT_OES) || null;
    let formatRGBA: { internalFormat: number; format: number } | null;
    let formatRG: { internalFormat: number; format: number } | null;
    let formatR: { internalFormat: number; format: number } | null;

    if (isWebGL2) {
      const gl2 = gl as WebGL2RenderingContext;
      formatRGBA = this.getSupportedFormat(gl, gl2.RGBA16F, gl.RGBA, halfFloatTexType);
      formatRG = this.getSupportedFormat(gl, gl2.RG16F, gl2.RG, halfFloatTexType);
      formatR = this.getSupportedFormat(gl, gl2.R16F, gl2.RED, halfFloatTexType);
    } else {
      formatRGBA = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatRG = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
      formatR = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    return {
      gl,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering
      }
    };
  }

  private getSupportedFormat(gl: WebGLRenderingContext, internalFormat: number, format: number, type: number | null): { internalFormat: number; format: number } | null {
    if (!this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
      const gl2 = gl as WebGL2RenderingContext;
      if ('R16F' in gl2 && internalFormat === gl2.R16F) {
        return this.getSupportedFormat(gl, gl2.RG16F, gl2.RG, type);
      }
      if ('RG16F' in gl2 && internalFormat === gl2.RG16F) {
        return this.getSupportedFormat(gl, gl2.RGBA16F, gl.RGBA, type);
      }
      return null;
    }
    return { internalFormat, format };
  }

  private supportRenderTextureFormat(gl: WebGLRenderingContext, internalFormat: number, format: number, type: number | null): boolean {
    const texture = gl.createTexture();
    if (!texture) return false;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type || gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    if (!fbo) return false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status === gl.FRAMEBUFFER_COMPLETE;
  }

  private compileShader(type: number, source: string, keywords: string[] | null): WebGLShader {
    source = this.addKeywords(source, keywords);
    const shader = this.gl!.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    this.gl!.shaderSource(shader, source);
    this.gl!.compileShader(shader);
    if (!this.gl!.getShaderParameter(shader, this.gl!.COMPILE_STATUS)) {
      console.trace(this.gl!.getShaderInfoLog(shader));
    }
    return shader;
  }

  private addKeywords(source: string, keywords: string[] | null): string {
    if (!keywords) return source;
    let keywordsString = '';
    keywords.forEach(keyword => {
      keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
  }

  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = this.gl!.createProgram();
    if (!program) throw new Error('Failed to create program');
    this.gl!.attachShader(program, vertexShader);
    this.gl!.attachShader(program, fragmentShader);
    this.gl!.linkProgram(program);
    if (!this.gl!.getProgramParameter(program, this.gl!.LINK_STATUS)) {
      console.trace(this.gl!.getProgramInfoLog(program));
    }
    return program;
  }

  private getUniforms(program: WebGLProgram, gl: WebGLRenderingContext): Uniforms {
    const uniforms: Uniforms = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = gl.getActiveUniform(program, i);
      if (uniformInfo) {
        uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
      }
    }
    return uniforms;
  }

  private createFBO(w: number, h: number, internalFormat: number, format: number, type: number | null, param: number): FBO {
    if (!this.gl) throw new Error('WebGL context not available');
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    if (!texture) throw new Error('Failed to create texture');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type || gl.UNSIGNED_BYTE, null);

    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Failed to create framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const texelSizeX = 1.0 / w;
    const texelSizeY = 1.0 / h;
    const self = this;
    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX,
      texelSizeY,
      attach(id: number): number {
        if (!self.gl) return id;
        self.gl.activeTexture(self.gl.TEXTURE0 + id);
        self.gl.bindTexture(self.gl.TEXTURE_2D, texture);
        return id;
      }
    } as FBO;
  }

  private createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number | null, param: number): DoubleFBO {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() {
        return fbo1;
      },
      set read(value: FBO) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value: FBO) {
        fbo2 = value;
      },
      swap() {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      }
    };
  }

  private resizeFBO(target: FBO, w: number, h: number, internalFormat: number, format: number, type: number | null, param: number): FBO {
    const newFBO = this.createFBO(w, h, internalFormat, format, type, param);
    this.copyProgram!.bind(this.gl!);
    const uTexture = this.copyProgram!.uniforms['uTexture'];
    if (uTexture) {
      this.gl!.uniform1i(uTexture, target.attach(0));
    }
    this.blit!(newFBO);
    return newFBO;
  }

  private resizeDoubleFBO(target: DoubleFBO, w: number, h: number, internalFormat: number, format: number, type: number | null, param: number): DoubleFBO {
    if (target.width === w && target.height === h) return target;
    target.read = this.resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = this.createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
  }

  private initFramebuffers(): void {
    if (!this.gl || !this.ext || !this.config) return;

    const simRes = this.getResolution(this.config.SIM_RESOLUTION);
    const dyeRes = this.getResolution(this.config.DYE_RESOLUTION);
    const texType = this.ext.halfFloatTexType;
    const rgba = this.ext.formatRGBA;
    const rg = this.ext.formatRG;
    const r = this.ext.formatR;
    if (!rgba || !rg || !r) return;

    const filtering = this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST;
    this.gl.disable(this.gl.BLEND);

    if (!this.dye) {
      this.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    } else {
      this.dye = this.resizeDoubleFBO(this.dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    }

    if (!this.velocity) {
      this.velocity = this.createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    } else {
      this.velocity = this.resizeDoubleFBO(this.velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    }

    this.divergence = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, this.gl.NEAREST);
    this.curlFBO = this.createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, this.gl.NEAREST);
    this.pressureFBO = this.createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, this.gl.NEAREST);
  }

  private getResolution(resolution: number): { width: number; height: number } {
    if (!this.gl) return { width: 0, height: 0 };
    let aspectRatio = this.gl.drawingBufferWidth / this.gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);
    if (this.gl.drawingBufferWidth > this.gl.drawingBufferHeight) return { width: max, height: min };
    else return { width: min, height: max };
  }

  private updateKeywords(): void {
    if (!this.displayMaterial || !this.gl || !this.config) return;
    const displayKeywords: string[] = [];
    if (this.config.SHADING) displayKeywords.push('SHADING');
    this.displayMaterial.setKeywords(displayKeywords, this.gl, (type, source, keywords) => this.compileShader(type, source, keywords), (vs, fs) => this.createProgram(vs, fs), (p, gl) => this.getUniforms(p, gl));
  }

  private calcDeltaTime(): number {
    const now = Date.now();
    const dt = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;
    return Math.min(dt, 0.016666);
  }

  private resizeCanvas(): boolean {
    if (!this.canvasRef?.nativeElement) return false;
    const canvas = this.canvasRef.nativeElement;
    const width = this.scaleByPixelRatio(canvas.clientWidth);
    const height = this.scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }

  private scaleByPixelRatio(input: number): number {
    const pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
  }

  private updateColors(dt: number): void {
    if (!this.config) return;
    this.colorUpdateTimer += dt * this.config.COLOR_UPDATE_SPEED;
    if (this.colorUpdateTimer >= 1) {
      this.colorUpdateTimer = this.wrap(this.colorUpdateTimer, 0, 1);
      this.pointers.forEach(p => {
        p.color = this.generateColor();
      });
    }
  }

  private applyInputs(): void {
    this.pointers.forEach(p => {
      if (p.moved) {
        p.moved = false;
        this.splatPointer(p);
      }
    });
  }

  private step(dt: number): void {
    if (!this.gl || !this.config || !this.velocity || !this.curlFBO || !this.divergence || !this.pressureFBO || !this.dye || !this.ext) return;

    this.gl.disable(this.gl.BLEND);
    this.curlProgram!.bind(this.gl);
    const curlTexelSize = this.curlProgram!.uniforms['texelSize'];
    const curlUVelocity = this.curlProgram!.uniforms['uVelocity'];
    if (curlTexelSize) this.gl.uniform2f(curlTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    if (curlUVelocity) this.gl.uniform1i(curlUVelocity, this.velocity.read.attach(0));
    this.blit!(this.curlFBO);

    this.vorticityProgram!.bind(this.gl);
    const vortTexelSize = this.vorticityProgram!.uniforms['texelSize'];
    const vortUVelocity = this.vorticityProgram!.uniforms['uVelocity'];
    const vortUCurl = this.vorticityProgram!.uniforms['uCurl'];
    const vortCurl = this.vorticityProgram!.uniforms['curl'];
    const vortDt = this.vorticityProgram!.uniforms['dt'];
    if (vortTexelSize) this.gl.uniform2f(vortTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    if (vortUVelocity) this.gl.uniform1i(vortUVelocity, this.velocity.read.attach(0));
    if (vortUCurl) this.gl.uniform1i(vortUCurl, this.curlFBO.attach(1));
    if (vortCurl) this.gl.uniform1f(vortCurl, this.config.CURL);
    if (vortDt) this.gl.uniform1f(vortDt, dt);
    this.blit!(this.velocity.write);
    this.velocity.swap();

    this.divergenceProgram!.bind(this.gl);
    const divTexelSize = this.divergenceProgram!.uniforms['texelSize'];
    const divUVelocity = this.divergenceProgram!.uniforms['uVelocity'];
    if (divTexelSize) this.gl.uniform2f(divTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    if (divUVelocity) this.gl.uniform1i(divUVelocity, this.velocity.read.attach(0));
    this.blit!(this.divergence);

    this.clearProgram!.bind(this.gl);
    const clearUTexture = this.clearProgram!.uniforms['uTexture'];
    const clearValue = this.clearProgram!.uniforms['value'];
    if (clearUTexture) this.gl.uniform1i(clearUTexture, this.pressureFBO.read.attach(0));
    if (clearValue) this.gl.uniform1f(clearValue, this.config.PRESSURE);
    this.blit!(this.pressureFBO.write);
    this.pressureFBO.swap();

    this.pressureProgram!.bind(this.gl);
    const pressTexelSize = this.pressureProgram!.uniforms['texelSize'];
    const pressUDivergence = this.pressureProgram!.uniforms['uDivergence'];
    const pressUPressure = this.pressureProgram!.uniforms['uPressure'];
    if (pressTexelSize) this.gl.uniform2f(pressTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    if (pressUDivergence) this.gl.uniform1i(pressUDivergence, this.divergence.attach(0));
    for (let i = 0; i < this.config.PRESSURE_ITERATIONS; i++) {
      if (pressUPressure) this.gl.uniform1i(pressUPressure, this.pressureFBO.read.attach(1));
      this.blit!(this.pressureFBO.write);
      this.pressureFBO.swap();
    }

    this.gradientSubtractProgram!.bind(this.gl);
    const gradTexelSize = this.gradientSubtractProgram!.uniforms['texelSize'];
    const gradUPressure = this.gradientSubtractProgram!.uniforms['uPressure'];
    const gradUVelocity = this.gradientSubtractProgram!.uniforms['uVelocity'];
    if (gradTexelSize) this.gl.uniform2f(gradTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    if (gradUPressure) this.gl.uniform1i(gradUPressure, this.pressureFBO.read.attach(0));
    if (gradUVelocity) this.gl.uniform1i(gradUVelocity, this.velocity.read.attach(1));
    this.blit!(this.velocity.write);
    this.velocity.swap();

    this.advectionProgram!.bind(this.gl);
    const advTexelSize = this.advectionProgram!.uniforms['texelSize'];
    const advDyeTexelSize = this.advectionProgram!.uniforms['dyeTexelSize'];
    const advUVelocity = this.advectionProgram!.uniforms['uVelocity'];
    const advUSource = this.advectionProgram!.uniforms['uSource'];
    const advDt = this.advectionProgram!.uniforms['dt'];
    const advDissipation = this.advectionProgram!.uniforms['dissipation'];
    if (advTexelSize) this.gl.uniform2f(advTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    if (!this.ext.supportLinearFiltering && advDyeTexelSize) {
      this.gl.uniform2f(advDyeTexelSize, this.velocity.texelSizeX, this.velocity.texelSizeY);
    }
    const velocityId = this.velocity.read.attach(0);
    if (advUVelocity) this.gl.uniform1i(advUVelocity, velocityId);
    if (advUSource) this.gl.uniform1i(advUSource, velocityId);
    if (advDt) this.gl.uniform1f(advDt, dt);
    if (advDissipation) this.gl.uniform1f(advDissipation, this.config.VELOCITY_DISSIPATION);
    this.blit!(this.velocity.write);
    this.velocity.swap();

    if (!this.ext.supportLinearFiltering && advDyeTexelSize) {
      this.gl.uniform2f(advDyeTexelSize, this.dye.texelSizeX, this.dye.texelSizeY);
    }
    if (advUVelocity) this.gl.uniform1i(advUVelocity, this.velocity.read.attach(0));
    if (advUSource) this.gl.uniform1i(advUSource, this.dye.read.attach(1));
    if (advDissipation) this.gl.uniform1f(advDissipation, this.config.DENSITY_DISSIPATION);
    this.blit!(this.dye.write);
    this.dye.swap();
  }

  private render(target: FBO | null): void {
    if (!this.gl) return;
    this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.enable(this.gl.BLEND);
    this.drawDisplay(target);
  }

  private drawDisplay(target: FBO | null): void {
    if (!this.gl || !this.displayMaterial || !this.dye || !this.config) return;
    const width = target == null ? this.gl.drawingBufferWidth : target.width;
    const height = target == null ? this.gl.drawingBufferHeight : target.height;
    this.displayMaterial.bind(this.gl);
    const texelSize = this.displayMaterial.uniforms['texelSize'];
    const uTexture = this.displayMaterial.uniforms['uTexture'];
    if (this.config.SHADING && texelSize) {
      this.gl.uniform2f(texelSize, 1.0 / width, 1.0 / height);
    }
    if (uTexture) {
      this.gl.uniform1i(uTexture, this.dye.read.attach(0));
    }
    this.blit!(target);
  }

  private splatPointer(pointer: Pointer): void {
    if (!this.config) return;
    const dx = pointer.deltaX * this.config.SPLAT_FORCE;
    const dy = pointer.deltaY * this.config.SPLAT_FORCE;
    this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
  }

  private clickSplat(pointer: Pointer): void {
    const color = this.generateColor();
    color.r *= 10.0;
    color.g *= 10.0;
    color.b *= 10.0;
    const dx = 10 * (Math.random() - 0.5);
    const dy = 30 * (Math.random() - 0.5);
    this.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
  }

  private splat(x: number, y: number, dx: number, dy: number, color: { r: number; g: number; b: number }): void {
    if (!this.gl || !this.config || !this.velocity || !this.dye || !this.splatProgram || !this.canvasRef?.nativeElement) return;
    this.splatProgram.bind(this.gl);
    const uTarget = this.splatProgram.uniforms['uTarget'];
    const aspectRatio = this.splatProgram.uniforms['aspectRatio'];
    const point = this.splatProgram.uniforms['point'];
    const splatColor = this.splatProgram.uniforms['color'];
    const radius = this.splatProgram.uniforms['radius'];
    if (uTarget) this.gl.uniform1i(uTarget, this.velocity.read.attach(0));
    if (aspectRatio) this.gl.uniform1f(aspectRatio, this.canvasRef.nativeElement.width / this.canvasRef.nativeElement.height);
    if (point) this.gl.uniform2f(point, x, y);
    if (splatColor) this.gl.uniform3f(splatColor, dx, dy, 0.0);
    if (radius) this.gl.uniform1f(radius, this.correctRadius(this.config.SPLAT_RADIUS / 100.0));
    this.blit!(this.velocity.write);
    this.velocity.swap();

    if (uTarget) this.gl.uniform1i(uTarget, this.dye.read.attach(0));
    if (splatColor) this.gl.uniform3f(splatColor, color.r, color.g, color.b);
    this.blit!(this.dye.write);
    this.dye.swap();
  }

  private correctRadius(radius: number): number {
    if (!this.canvasRef?.nativeElement) return radius;
    const aspectRatio = this.canvasRef.nativeElement.width / this.canvasRef.nativeElement.height;
    if (aspectRatio > 1) radius *= aspectRatio;
    return radius;
  }

  private updatePointerDownData(pointer: Pointer, id: number, posX: number, posY: number): void {
    if (!this.canvasRef?.nativeElement) return;
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / this.canvasRef.nativeElement.width;
    pointer.texcoordY = 1.0 - posY / this.canvasRef.nativeElement.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = this.generateColor();
  }

  private updatePointerMoveData(pointer: Pointer, posX: number, posY: number, color: { r: number; g: number; b: number }): void {
    if (!this.canvasRef?.nativeElement) return;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / this.canvasRef.nativeElement.width;
    pointer.texcoordY = 1.0 - posY / this.canvasRef.nativeElement.height;
    pointer.deltaX = this.correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = this.correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.color = color;
  }

  private updatePointerUpData(pointer: Pointer): void {
    pointer.down = false;
  }

  private correctDeltaX(delta: number): number {
    if (!this.canvasRef?.nativeElement) return delta;
    const aspectRatio = this.canvasRef.nativeElement.width / this.canvasRef.nativeElement.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
  }

  private correctDeltaY(delta: number): number {
    if (!this.canvasRef?.nativeElement) return delta;
    const aspectRatio = this.canvasRef.nativeElement.width / this.canvasRef.nativeElement.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
  }

  private generateColor(): { r: number; g: number; b: number } {
    const c = this.HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
  }

  private HSVtoRGB(h: number, s: number, v: number): { r: number; g: number; b: number } {
    let r: number, g: number, b: number, i: number, f: number, p: number, q: number, t: number;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
      default:
        r = 0;
        g = 0;
        b = 0;
        break;
    }
    return { r, g, b };
  }

  private wrap(value: number, min: number, max: number): number {
    const range = max - min;
    if (range === 0) return min;
    return ((value - min) % range) + min;
  }

  private setupEventHandlers(canvas: HTMLCanvasElement): void {
    this.mouseDownHandler = (e: MouseEvent) => {
      const pointer = this.pointers[0];
      const posX = this.scaleByPixelRatio(e.clientX);
      const posY = this.scaleByPixelRatio(e.clientY);
      this.updatePointerDownData(pointer, -1, posX, posY);
      this.clickSplat(pointer);
    };
    window.addEventListener('mousedown', this.mouseDownHandler);

    this.firstMouseMoveHandler = (e: MouseEvent) => {
      const pointer = this.pointers[0];
      const posX = this.scaleByPixelRatio(e.clientX);
      const posY = this.scaleByPixelRatio(e.clientY);
      const color = this.generateColor();
      this.updateFrame();
      this.updatePointerMoveData(pointer, posX, posY, color);
      document.body.removeEventListener('mousemove', this.firstMouseMoveHandler!);
    };
    document.body.addEventListener('mousemove', this.firstMouseMoveHandler);

    this.mouseMoveHandler = (e: MouseEvent) => {
      const pointer = this.pointers[0];
      const posX = this.scaleByPixelRatio(e.clientX);
      const posY = this.scaleByPixelRatio(e.clientY);
      const color = pointer.color;
      this.updatePointerMoveData(pointer, posX, posY, color);
    };
    window.addEventListener('mousemove', this.mouseMoveHandler);

    this.firstTouchStartHandler = (e: TouchEvent) => {
      const touches = e.targetTouches;
      const pointer = this.pointers[0];
      for (let i = 0; i < touches.length; i++) {
        const posX = this.scaleByPixelRatio(touches[i].clientX);
        const posY = this.scaleByPixelRatio(touches[i].clientY);
        this.updateFrame();
        this.updatePointerDownData(pointer, touches[i].identifier, posX, posY);
      }
      document.body.removeEventListener('touchstart', this.firstTouchStartHandler!);
    };
    document.body.addEventListener('touchstart', this.firstTouchStartHandler);

    this.touchStartHandler = (e: TouchEvent) => {
      const touches = e.targetTouches;
      const pointer = this.pointers[0];
      for (let i = 0; i < touches.length; i++) {
        const posX = this.scaleByPixelRatio(touches[i].clientX);
        const posY = this.scaleByPixelRatio(touches[i].clientY);
        this.updatePointerDownData(pointer, touches[i].identifier, posX, posY);
      }
    };
    window.addEventListener('touchstart', this.touchStartHandler);

    this.touchMoveHandler = (e: TouchEvent) => {
      const touches = e.targetTouches;
      const pointer = this.pointers[0];
      for (let i = 0; i < touches.length; i++) {
        const posX = this.scaleByPixelRatio(touches[i].clientX);
        const posY = this.scaleByPixelRatio(touches[i].clientY);
        this.updatePointerMoveData(pointer, posX, posY, pointer.color);
      }
    };
    window.addEventListener('touchmove', this.touchMoveHandler, false);

    this.touchEndHandler = (e: TouchEvent) => {
      const touches = e.changedTouches;
      const pointer = this.pointers[0];
      for (let i = 0; i < touches.length; i++) {
        this.updatePointerUpData(pointer);
      }
    };
    window.addEventListener('touchend', this.touchEndHandler);
  }

  private updateFrame(): void {
    if (!this.config) return;
    const dt = this.calcDeltaTime();
    if (this.resizeCanvas()) this.initFramebuffers();
    this.updateColors(dt);
    this.applyInputs();
    this.step(dt);
    this.render(null);
    this.animationFrameId = requestAnimationFrame(() => this.updateFrame());
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.mouseDownHandler) {
      window.removeEventListener('mousedown', this.mouseDownHandler);
    }
    if (this.firstMouseMoveHandler) {
      document.body.removeEventListener('mousemove', this.firstMouseMoveHandler);
    }
    if (this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.firstTouchStartHandler) {
      document.body.removeEventListener('touchstart', this.firstTouchStartHandler);
    }
    if (this.touchStartHandler) {
      window.removeEventListener('touchstart', this.touchStartHandler);
    }
    if (this.touchMoveHandler) {
      window.removeEventListener('touchmove', this.touchMoveHandler);
    }
    if (this.touchEndHandler) {
      window.removeEventListener('touchend', this.touchEndHandler);
    }
  }
}
