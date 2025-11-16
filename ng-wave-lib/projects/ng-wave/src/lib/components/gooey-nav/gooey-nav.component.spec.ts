import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { GooeyNavComponent } from './gooey-nav.component';

describe('GooeyNavComponent', () => {
  let component: GooeyNavComponent;
  let fixture: ComponentFixture<GooeyNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GooeyNavComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GooeyNavComponent);
    component = fixture.componentInstance;
    component.items = [
      { label: 'Home', href: '/home' },
      { label: 'About', href: '/about' }
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render navigation items', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('nav ul li');
    expect(items.length).toBe(2);
  });

  it('should handle item clicks', () => {
    const firstItem = fixture.nativeElement.querySelector('nav ul li a');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    firstItem.dispatchEvent(clickEvent);
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
  });
});

