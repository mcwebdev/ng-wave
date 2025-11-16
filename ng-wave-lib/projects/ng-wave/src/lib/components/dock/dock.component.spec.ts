import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { DockComponent } from './dock.component';

describe('DockComponent', () => {
  let component: DockComponent;
  let fixture: ComponentFixture<DockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DockComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DockComponent);
    component = fixture.componentInstance;
    component.items = [
      { icon: '<svg>Icon1</svg>', label: 'Item 1' },
      { icon: '<svg>Icon2</svg>', label: 'Item 2' }
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render dock items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.dock-item');
    expect(items.length).toBe(2);
  });

  it('should handle mouse move events', () => {
    const panel = fixture.nativeElement.querySelector('.dock-panel');
    const mouseEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 100
    });
    Object.defineProperty(mouseEvent, 'pageX', { value: 100, writable: true });
    
    panel.dispatchEvent(mouseEvent);
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
  });

  it('should handle item clicks', () => {
    let clicked = false;
    component.items[0].onClick = () => {
      clicked = true;
    };
    
    const item = fixture.nativeElement.querySelector('.dock-item');
    item.click();
    fixture.detectChanges();
    
    expect(clicked).toBe(true);
  });
});

