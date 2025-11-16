import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { GlassIconsComponent } from './glass-icons.component';

describe('GlassIconsComponent', () => {
  let component: GlassIconsComponent;
  let fixture: ComponentFixture<GlassIconsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlassIconsComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GlassIconsComponent);
    component = fixture.componentInstance;
    component.items = [
      { label: 'Icon 1', icon: '<svg>Icon1</svg>', color: 'blue' },
      { label: 'Icon 2', icon: '<svg>Icon2</svg>', color: 'purple' }
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render icon buttons', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('.icon-btn');
    expect(buttons.length).toBe(2);
  });
});

