import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MisTurnosEspecialistaComponent } from './mis-turnos.component';

describe('MisTurnosEspecialistaComponent', () => {
  let component: MisTurnosEspecialistaComponent;
  let fixture: ComponentFixture<MisTurnosEspecialistaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MisTurnosEspecialistaComponent]
    });
    fixture = TestBed.createComponent(MisTurnosEspecialistaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
