import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EncuestaDialogComponent } from './encuesta-dialog.component';

describe('EncuestaDialogComponent', () => {
  let component: EncuestaDialogComponent;
  let fixture: ComponentFixture<EncuestaDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EncuestaDialogComponent]
    });
    fixture = TestBed.createComponent(EncuestaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
