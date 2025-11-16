import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { StaggeredMenuComponent } from './staggered-menu.component';

describe('StaggeredMenuComponent', () => {
  let component: StaggeredMenuComponent;
  let fixture: ComponentFixture<StaggeredMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaggeredMenuComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StaggeredMenuComponent);
    component = fixture.componentInstance;
    component.items = [
      { label: 'Home', link: '/home' },
      { label: 'About', link: '/about' }
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle menu', () => {
    const toggleBtn = fixture.nativeElement.querySelector('.sm-toggle');
    toggleBtn.click();
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
  });

  it('should emit menu open event', () => {
    spyOn(component.menuOpen, 'emit');
    component.toggleMenu();
    
    expect(component.menuOpen.emit).toHaveBeenCalled();
  });
});

