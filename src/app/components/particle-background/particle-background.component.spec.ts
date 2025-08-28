import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticleBackgroundComponent } from './particle-background.component';

describe('ParticleBackgroundComponent', () => {
  let component: ParticleBackgroundComponent;
  let fixture: ComponentFixture<ParticleBackgroundComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ParticleBackgroundComponent]
    });
    fixture = TestBed.createComponent(ParticleBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
