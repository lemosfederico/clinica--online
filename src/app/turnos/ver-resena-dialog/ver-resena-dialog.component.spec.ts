import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerResenaDialogComponent } from './ver-resena-dialog.component';

describe('VerResenaDialogComponent', () => {
  let component: VerResenaDialogComponent;
  let fixture: ComponentFixture<VerResenaDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VerResenaDialogComponent]
    });
    fixture = TestBed.createComponent(VerResenaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
