import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancelarTurnoDialogComponent } from './cancelar-turno-dialog.component';

describe('CancelarTurnoDialogComponent', () => {
  let component: CancelarTurnoDialogComponent;
  let fixture: ComponentFixture<CancelarTurnoDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CancelarTurnoDialogComponent]
    });
    fixture = TestBed.createComponent(CancelarTurnoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
