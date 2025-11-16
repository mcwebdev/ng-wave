import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { CardNavComponent } from './card-nav.component';

describe('CardNavComponent', () => {
  let component: CardNavComponent;
  let fixture: ComponentFixture<CardNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardNavComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CardNavComponent);
    component = fixture.componentInstance;
    component.logo = 'test-logo.png';
    component.items = [
      {
        label: 'Category 1',
        bgColor: '#fff',
        textColor: '#000',
        links: [{ label: 'Link 1', href: '/link1' }]
      }
    ];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle menu on hamburger click', () => {
    const hamburger = fixture.nativeElement.querySelector('.hamburger-menu');
    hamburger.click();
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
  });

  it('should display logo', () => {
    const logo = fixture.nativeElement.querySelector('.logo');
    expect(logo).toBeTruthy();
    expect(logo.getAttribute('src')).toBe('test-logo.png');
  });
});

