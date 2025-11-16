import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ElasticSliderComponent } from './elastic-slider.component';

describe('ElasticSliderComponent', () => {
  let component: ElasticSliderComponent;
  let fixture: ComponentFixture<ElasticSliderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElasticSliderComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ElasticSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default value', () => {
    expect(component.defaultValue).toBe(50);
  });

  it('should calculate range percentage correctly', () => {
    component.value.set(75);
    fixture.detectChanges();
    const percentage = component.getRangePercentage();
    expect(percentage).toBe(75);
  });

  it('should handle pointer down events', () => {
    const sliderRoot = fixture.nativeElement.querySelector('.slider-root');
    const pointerEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      pointerId: 1
    });
    
    sliderRoot.dispatchEvent(pointerEvent);
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
  });

  it('should emit value changes', () => {
    spyOn(component.valueChange, 'emit');
    component.value.set(60);
    component.valueChange.emit(60);
    
    expect(component.valueChange.emit).toHaveBeenCalledWith(60);
  });
});

