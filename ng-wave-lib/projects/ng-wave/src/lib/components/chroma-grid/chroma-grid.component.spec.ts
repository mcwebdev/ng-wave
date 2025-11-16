import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ChromaGridComponent } from './chroma-grid.component';

describe('ChromaGridComponent', () => {
  let component: ChromaGridComponent;
  let fixture: ComponentFixture<ChromaGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChromaGridComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChromaGridComponent);
    component = fixture.componentInstance;
    component.items = [
      {
        image: 'test.jpg',
        title: 'Test',
        subtitle: 'Subtitle',
        borderColor: '#fff',
        gradient: 'linear-gradient(45deg, #000, #fff)'
      }
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render chroma cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.chroma-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should handle pointer move events', () => {
    const grid = fixture.nativeElement.querySelector('.chroma-grid');
    const pointerEvent = new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 100,
      clientY: 100
    });
    
    grid.dispatchEvent(pointerEvent);
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
  });
});

