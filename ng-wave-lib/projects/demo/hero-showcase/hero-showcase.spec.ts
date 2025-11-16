import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeroShowcase } from './hero-showcase';

describe('HeroShowcase', () => {
  let component: HeroShowcase;
  let fixture: ComponentFixture<HeroShowcase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroShowcase]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeroShowcase);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
