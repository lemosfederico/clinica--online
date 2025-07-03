import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiPerfilPacienteComponent } from './historia-clinica';

describe('MiPerfilPacienteComponent', () => {
  let component: MiPerfilPacienteComponent;
  let fixture: ComponentFixture<MiPerfilPacienteComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MiPerfilPacienteComponent]
    });
    fixture = TestBed.createComponent(MiPerfilPacienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
