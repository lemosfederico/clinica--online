import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriaClinicaFormComponent } from './historia-clinica-form.component';

describe('HostoriaClinicaFormComponent', () => {
  let component: HistoriaClinicaFormComponent;
  let fixture: ComponentFixture<HistoriaClinicaFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HistoriaClinicaFormComponent]
    });
    fixture = TestBed.createComponent(HistoriaClinicaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
