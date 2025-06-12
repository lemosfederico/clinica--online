import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PacienteRegisterComponent } from './paciente-register.component';

describe('PacienteRegisterComponent', () => {
  let component: PacienteRegisterComponent;
  let fixture: ComponentFixture<PacienteRegisterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PacienteRegisterComponent]
    });
    fixture = TestBed.createComponent(PacienteRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
