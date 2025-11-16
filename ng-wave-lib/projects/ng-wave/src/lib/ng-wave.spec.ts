import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgWave } from './ng-wave';

describe('NgWave', () => {
  let component: NgWave;
  let fixture: ComponentFixture<NgWave>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgWave]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgWave);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
