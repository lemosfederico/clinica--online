import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EspecialistaRegisterComponent } from './especialista-register.component';

describe('EspecialistaRegisterComponent', () => {
  let component: EspecialistaRegisterComponent;
  let fixture: ComponentFixture<EspecialistaRegisterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EspecialistaRegisterComponent]
    });
    fixture = TestBed.createComponent(EspecialistaRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
