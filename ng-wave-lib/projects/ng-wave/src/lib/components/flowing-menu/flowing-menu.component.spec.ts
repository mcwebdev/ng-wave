import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { FlowingMenuComponent } from './flowing-menu.component';

describe('FlowingMenuComponent', () => {
  let component: FlowingMenuComponent;
  let fixture: ComponentFixture<FlowingMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlowingMenuComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FlowingMenuComponent);
    component = fixture.componentInstance;
    component.items = [
      { link: '/home', text: 'Home', image: 'home.jpg' },
      { link: '/about', text: 'About', image: 'about.jpg' }
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render menu items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.menu__item');
    expect(items.length).toBe(2);
  });

  it('should handle mouse enter events', () => {
    const item = fixture.nativeElement.querySelector('.menu__item-link');
    const mouseEvent = new MouseEvent('mouseenter', {
      bubbles: true,
      clientX: 100,
      clientY: 100
    });
    
    item.dispatchEvent(mouseEvent);
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
  });
});

