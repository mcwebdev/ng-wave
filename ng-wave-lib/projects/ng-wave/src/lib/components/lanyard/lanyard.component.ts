import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

// Note: This is a simplified version. Full implementation would require:
// - @react-three/rapier or rapier3d for physics
// - meshline for the lanyard band
// - GLTFLoader for the card model
// - TextureLoader for the lanyard texture

@Component({
  selector: 'ngw-lanyard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lanyard.component.html',
  styleUrl: './lanyard.component.css'
})
export class LanyardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() position: [number, number, number] = [0, 0, 30];
  @Input() gravity: [number, number, number] = [0, -40, 0];
  @Input() fov = 20;
  @Input() transparent = true;
  @Input() className = '';

  private readonly platformId = inject(PLATFORM_ID);
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private animationFrameId?: number;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.initThree();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cleanup();
  }

  private initThree(): void {
    if (!this.canvasRef?.nativeElement) return;

    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(this.fov, width / height, 0.1, 1000);
    this.camera.position.set(this.position[0], this.position[1], this.position[2]);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: this.transparent, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (this.transparent) {
      this.renderer.setClearColor(0x000000, 0);
    } else {
      this.renderer.setClearColor(0x000000, 1);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, Math.PI);
    this.scene.add(ambientLight);

    // Placeholder: Add a simple card mesh
    // Full implementation would load GLTF model and use Rapier physics
    const cardGeometry = new THREE.BoxGeometry(1.6, 2.25, 0.02);
    const cardMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.9,
      clearcoat: 1,
      clearcoatRoughness: 0.15
    });
    const card = new THREE.Mesh(cardGeometry, cardMaterial);
    card.position.set(0, 4, 0);
    this.scene.add(card);

    // Placeholder: Add a simple lanyard line
    // Full implementation would use meshline with texture
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 32; i++) {
      const y = 4 - (i / 32) * 3;
      points.push(new THREE.Vector3(0, y, 0));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    this.animate();
  }

  private animate = (): void => {
    if (!this.scene || !this.camera || !this.renderer) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    // Placeholder animation - full implementation would use Rapier physics
    if (this.scene.children.length > 0) {
      const card = this.scene.children.find(child => child instanceof THREE.Mesh && child !== this.scene?.children[this.scene.children.length - 1]);
      if (card) {
        card.rotation.y += 0.01;
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

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

