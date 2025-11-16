import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { GlassSurfaceComponent } from './glass-surface.component';

describe('GlassSurfaceComponent', () => {
  let component: GlassSurfaceComponent;
  let fixture: ComponentFixture<GlassSurfaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlassSurfaceComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GlassSurfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render SVG filter', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const svg = compiled.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});

