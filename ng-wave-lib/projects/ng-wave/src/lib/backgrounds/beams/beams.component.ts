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
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  BufferAttribute,
  MeshStandardMaterial,
  Mesh,
  DirectionalLight,
  AmbientLight,
  Color,
  Group,
  Clock,
  ShaderLib
} from 'three';
import * as THREE from 'three';
import { UniformsUtils } from 'three';

const noise = `
float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) +
           (c - a)* u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
float cnoise(vec3 P){
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x,Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x,Pf1.y,Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy,Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy,Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x,Pf0.y,Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x,Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),fade_xyz.z);
  vec2 n_yz = mix(n_z.xy,n_z.zw,fade_xyz.y);
  float n_xyz = mix(n_yz.x,n_yz.y,fade_xyz.x);
  return 2.2 * n_xyz;
}
`;

function hexToNormalizedRGB(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r / 255, g / 255, b / 255];
}

function createStackedPlanesBufferGeometry(
  n: number,
  width: number,
  height: number,
  spacing: number,
  heightSegments: number
): BufferGeometry {
  const geometry = new BufferGeometry();
  const numVertices = n * (heightSegments + 1) * 2;
  const numFaces = n * heightSegments * 2;
  const positions = new Float32Array(numVertices * 3);
  const indices = new Uint32Array(numFaces * 3);
  const uvs = new Float32Array(numVertices * 2);

  let vertexOffset = 0;
  let indexOffset = 0;
  let uvOffset = 0;
  const totalWidth = n * width + (n - 1) * spacing;
  const xOffsetBase = -totalWidth / 2;

  for (let i = 0; i < n; i++) {
    const xOffset = xOffsetBase + i * (width + spacing);
    const uvXOffset = Math.random() * 300;
    const uvYOffset = Math.random() * 300;

    for (let j = 0; j <= heightSegments; j++) {
      const y = height * (j / heightSegments - 0.5);
      const v0 = [xOffset, y, 0];
      const v1 = [xOffset + width, y, 0];
      positions.set([...v0, ...v1], vertexOffset * 3);

      const uvY = j / heightSegments;
      uvs.set([uvXOffset, uvY + uvYOffset, uvXOffset + 1, uvY + uvYOffset], uvOffset);

      if (j < heightSegments) {
        const a = vertexOffset,
          b = vertexOffset + 1,
          c = vertexOffset + 2,
          d = vertexOffset + 3;
        indices.set([a, b, c, c, b, d], indexOffset);
        indexOffset += 6;
      }
      vertexOffset += 2;
      uvOffset += 4;
    }
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  return geometry;
}

function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

@Component({
  selector: 'ngw-beams',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './beams.component.html',
  styleUrl: './beams.component.css'
})
export class BeamsComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('container', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() beamWidth = 2;
  @Input() beamHeight = 15;
  @Input() beamNumber = 12;
  @Input() lightColor = '#ffffff';
  @Input() speed = 2;
  @Input() noiseIntensity = 1.75;
  @Input() scale = 0.2;
  @Input() rotation = 0;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private mesh!: Mesh;
  private material!: MeshStandardMaterial;
  private geometry!: BufferGeometry;
  private directionalLight!: DirectionalLight;
  private ambientLight!: AmbientLight;
  private group!: Group;
  private clock = new Clock();
  private animationFrameId: number | null = null;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initThree();
    this.animate();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId) || !this.material) {
      return;
    }

    if (changes['speed'] || changes['noiseIntensity'] || changes['scale']) {
      this.updateMaterial();
    }

    if (changes['beamNumber'] || changes['beamWidth'] || changes['beamHeight']) {
      this.updateGeometry();
    }

    if (changes['lightColor']) {
      this.updateLight();
    }

    if (changes['rotation']) {
      this.updateRotation();
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.material) {
      this.material.dispose();
    }

    if (this.geometry) {
      this.geometry.dispose();
    }
  }

  private initThree(): void {
    const container = this.containerRef.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    this.scene = new Scene();
    this.scene.background = new Color(0x000000);

    // Camera
    this.camera = new PerspectiveCamera(30, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 20);

    // Renderer
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // Group for rotation
    this.group = new Group();
    this.scene.add(this.group);

    // Material
    this.createMaterial();

    // Geometry
    this.createGeometry();

    // Mesh
    this.mesh = new Mesh(this.geometry, this.material);
    this.group.add(this.mesh);

    // Lights
    this.directionalLight = new DirectionalLight(
      new Color(...hexToNormalizedRGB(this.lightColor)),
      1
    );
    this.directionalLight.position.set(0, 3, 10);
    this.directionalLight.castShadow = true;
    if (this.directionalLight.shadow) {
      const cam = this.directionalLight.shadow.camera;
      cam.top = 24;
      cam.bottom = -24;
      cam.left = -24;
      cam.right = 24;
      cam.far = 64;
      this.directionalLight.shadow.bias = -0.004;
    }
    this.group.add(this.directionalLight);

    this.ambientLight = new AmbientLight(0xffffff, 1);
    this.scene.add(this.ambientLight);

    // Handle resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private createMaterial(): void {
    // Get the base physical material shader
    const physical = ShaderLib.physical;
    const baseVert = physical.vertexShader;
    const baseFrag = physical.fragmentShader;
    const baseUniforms = UniformsUtils.clone(physical.uniforms);

    // Add custom uniforms
    baseUniforms['time'] = { value: 0 };
    baseUniforms['uSpeed'] = { value: this.speed };
    baseUniforms['uNoiseIntensity'] = { value: this.noiseIntensity };
    baseUniforms['uScale'] = { value: this.scale };

    // Modify vertex shader
    const vertexHeader = `
      uniform float time;
      uniform float uSpeed;
      uniform float uScale;
      ${noise}
      float getPos(vec3 pos) {
        vec3 noisePos =
          vec3(pos.x * 0., pos.y - uv.y, pos.z + time * uSpeed * 3.) * uScale;
        return cnoise(noisePos);
      }
      vec3 getCurrentPos(vec3 pos) {
        vec3 newpos = pos;
        newpos.z += getPos(pos);
        return newpos;
      }
      vec3 getNormal(vec3 pos) {
        vec3 curpos = getCurrentPos(pos);
        vec3 nextposX = getCurrentPos(pos + vec3(0.01, 0.0, 0.0));
        vec3 nextposZ = getCurrentPos(pos + vec3(0.0, -0.01, 0.0));
        vec3 tangentX = normalize(nextposX - curpos);
        vec3 tangentZ = normalize(nextposZ - curpos);
        return normalize(cross(tangentZ, tangentX));
      }
    `;

    let vertexShader = vertexHeader + '\n' + baseVert;
    // Replace the includes - need to modify after the include processes transformed
    vertexShader = vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed.z += getPos(transformed.xyz);`
    );
    vertexShader = vertexShader.replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
      objectNormal = getNormal(position.xyz);`
    );

    // Modify fragment shader
    let fragmentShader = baseFrag;
    
    // Add uniform declaration and noise function at the beginning
    fragmentShader = `uniform float uNoiseIntensity;\n${noise}\n` + fragmentShader;
    
    fragmentShader = fragmentShader.replace(
      '#include <dithering_fragment>',
      `
        float randomNoise = noise(gl_FragCoord.xy);
        gl_FragColor.rgb -= randomNoise / 15. * uNoiseIntensity;
        #include <dithering_fragment>
      `
    );

    this.material = new MeshStandardMaterial({
      color: new Color(...hexToNormalizedRGB('#000000')),
      roughness: 0.3,
      metalness: 0.3,
      fog: true
    }) as any;
    
    // Set envMapIntensity for proper lighting
    (this.material as any).envMapIntensity = 10;

    // Store uniforms for later access
    (this.material as any).userData = {
      uniforms: baseUniforms
    };

    // Override shaders
    (this.material as any).onBeforeCompile = (shader: any) => {
      shader.uniforms.time = baseUniforms['time'];
      shader.uniforms.uSpeed = baseUniforms['uSpeed'];
      shader.uniforms.uNoiseIntensity = baseUniforms['uNoiseIntensity'];
      shader.uniforms.uScale = baseUniforms['uScale'];
      shader.vertexShader = vertexShader;
      shader.fragmentShader = fragmentShader;
      (this.material as any).userData.shader = shader;
    };
  }

  private createGeometry(): void {
    if (this.geometry) {
      this.geometry.dispose();
    }
    this.geometry = createStackedPlanesBufferGeometry(
      this.beamNumber,
      this.beamWidth,
      this.beamHeight,
      0,
      100
    );
    if (this.mesh) {
      this.mesh.geometry = this.geometry;
    }
  }

  private updateMaterial(): void {
    if (this.material && (this.material as any).userData?.shader) {
      const shader = (this.material as any).userData.shader;
      if (shader.uniforms) {
        shader.uniforms['uSpeed'].value = this.speed;
        shader.uniforms['uNoiseIntensity'].value = this.noiseIntensity;
        shader.uniforms['uScale'].value = this.scale;
      }
    }
    // Force recompilation if material hasn't been compiled yet
    if (this.material) {
      (this.material as any).needsUpdate = true;
    }
  }

  private updateGeometry(): void {
    if (this.mesh) {
      this.createGeometry();
    }
  }

  private updateLight(): void {
    if (this.directionalLight) {
      this.directionalLight.color = new Color(...hexToNormalizedRGB(this.lightColor));
    }
  }

  private updateRotation(): void {
    if (this.group) {
      this.group.rotation.z = degToRad(this.rotation);
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.material && (this.material as any).userData?.shader) {
      const shader = (this.material as any).userData.shader;
      if (shader.uniforms && shader.uniforms['time']) {
        shader.uniforms['time'].value += 0.1 * this.clock.getDelta();
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private onWindowResize(): void {
    if (!this.containerRef?.nativeElement) {
      return;
    }

    const container = this.containerRef.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}

