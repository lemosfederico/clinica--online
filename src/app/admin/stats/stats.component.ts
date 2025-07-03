// src/app/admin/stats/admin-stats.component.ts

import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule }                               from '@angular/common';
import { MatCardModule }                              from '@angular/material/card';
import { MatIconModule }                              from '@angular/material/icon';
import { MatButtonModule }                            from '@angular/material/button';
import { MatTableModule }                             from '@angular/material/table';    
import { SupabaseService }                            from '../../core/supabase.service';
import Chart                                         from 'chart.js/auto';
import { FormsModule } from '@angular/forms';
import { DownloadExcelDirective }   from 'src/app/shared/directives/download-excel.directive';
import { DownloadPdfDirective }     from 'src/app/shared/directives/download-pdf.directive';
import { HighlightDirective }       from 'src/app/shared/directives/highlight.directive'; 
import { CountByPipe }              from 'src/app/shared/pipes/count-by.pipe';            
import { DateTimeLocalPipe }        from 'src/app/shared/pipes/date-time-local.pipe';    
import { RangeFilterPipe }          from 'src/app/shared/pipes/range-filter.pipe';       
import { SortByPipe }               from 'src/app/shared/pipes/sort-by.pipe';
import { MatFormFieldModule }   from '@angular/material/form-field';
import { MatInputModule }       from '@angular/material/input';
import { MatDatepickerModule }  from '@angular/material/datepicker';
import { MatNativeDateModule }  from '@angular/material/core';

import { Location }               from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-admin-stats',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,            
    DownloadExcelDirective,
    DownloadPdfDirective,
    HighlightDirective,      
    CountByPipe,
    DateTimeLocalPipe,
    RangeFilterPipe,
    SortByPipe,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule
  ],
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss']
})
export class AdminStatsComponent implements OnInit {
  @ViewChild('loginsChart') loginsCtx!: ElementRef<HTMLCanvasElement>;
  @ViewChild('espChart')    espCtx!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('dayChart')    dayCtx!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('reqChart')    reqCtx!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('finChart')    finCtx!:    ElementRef<HTMLCanvasElement>;

  startRange: Date = new Date('2025-07-01');
  endRange:   Date = new Date('2025-07-16');

  loginLogs: any[] = [];
  turnos:     any[] = [];
  espNameMap = new Map<string,string>();

  constructor(
    private supa: SupabaseService,
    private location: Location
  ) {}

  async ngOnInit() {
    const { data: logs }   = await this.supa.from('login_logs').select('user_id,timestamp');
    const { data: turnos } = await this.supa.from('turnos')
      .select('fecha,especialidad,especialista_id,estado');
    this.loginLogs = logs  || [];
    this.turnos     = turnos || [];

    const espIds = Array.from(new Set(this.turnos.map(t => t.especialista_id)));
    if (espIds.length) {
      const { data: profs } = await this.supa
        .from('profiles')
        .select('user_id,nombre,apellido')
        .in('user_id', espIds);
      (profs||[]).forEach(p => {
        this.espNameMap.set(p.user_id, `${p.nombre} ${p.apellido}`);
      });
    }

    this.buildLoginsChart();
    this.buildTurnosByEsp();
    this.buildTurnosByDay();
    this.buildSolicitadosChart();
    this.buildFinalizadosChart();
  }


    getSortedTurnos(filtered: any[]): any[] {
    return filtered
      .slice()
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }

  private buildLoginsChart() {
    const counts = new Map<string,number>();
    this.loginLogs.forEach(l => {
      const day = new Date(l.timestamp).toLocaleDateString();
      counts.set(day, (counts.get(day)||0) + 1);
    });

    new Chart(this.loginsCtx.nativeElement, {
      type: 'bar',
      data: {
        labels: Array.from(counts.keys()),
        datasets: [{
          label: 'Ingresos',
          data: Array.from(counts.values())
        }]
      }
    });
  }


  private buildTurnosByEsp() {
    const m = new Map<string,number>();
    this.turnos.forEach(t=> m.set(t.especialidad,(m.get(t.especialidad)||0)+1) );
    new Chart(this.espCtx.nativeElement, {
      type:'pie',
      data:{ labels: Array.from(m.keys()), datasets:[{ data:Array.from(m.values()) }] }
    });
  }

  private buildTurnosByDay() {
    const counts = new Map<string,number>();
    this.turnos.forEach(t => {
      const iso = new Date(t.fecha).toISOString().split('T')[0];
      counts.set(iso, (counts.get(iso)||0) + 1);
    });

    let dayArr = Array.from(counts.entries()).map(([iso, cnt]) => ({
      date: new Date(iso),
      count: cnt
    }));

    dayArr = new SortByPipe().transform(dayArr, 'date', true)!
    
    new Chart(this.dayCtx.nativeElement, {
      type: 'line',
      data: {
        labels: dayArr.map(d => d.date.toLocaleDateString()),
        datasets: [{
          label: 'Turnos/día',
          data:  dayArr.map(d => d.count)
        }]
      }
    });
  }

  private buildSolicitadosChart() {
      const counts = new Map<string,number>();
      this.turnos.forEach(t => {
        if (t.estado !== 'Cancelado')
          counts.set(t.especialista_id, (counts.get(t.especialista_id)||0) + 1);
      });

      new Chart(this.reqCtx.nativeElement, {
        type: 'bar',
        data: {
          labels: Array.from(counts.keys())
                    .map(id => this.espNameMap.get(id) || id),
          datasets: [{
            label: 'Solicitados',
            data: Array.from(counts.values())
          }]
        }
      });
    }

   private buildFinalizadosChart() {
    const counts = new Map<string,number>();
    this.turnos
      .filter(t => t.estado === 'Realizado')
      .forEach(t =>
        counts.set(t.especialista_id, (counts.get(t.especialista_id)||0) + 1)
      );

    new Chart(this.finCtx.nativeElement, {
      type: 'bar',
      data: {
        labels: Array.from(counts.keys())
                  .map(id => this.espNameMap.get(id) || id),
        datasets: [{
          label: 'Finalizados',
          data: Array.from(counts.values())
        }]
      }
    });
  }


  getLoginLogs() { return this.loginLogs; }

  getByEspecialidadExcel() {
    const counts = new Map<string,number>();
    this.turnos.forEach(t => {
      counts.set(t.especialidad, (counts.get(t.especialidad)||0) + 1);
    });
  
    return Array.from(counts.entries())
      .map(([especialidad, cantidad]) => ({
        Especialidad: especialidad,
        Cantidad: cantidad
      }));
  }

  getByDiaExcel() {
    const counts = new Map<string,number>();
    this.turnos.forEach(t => {
      const d = new Date(t.fecha).toLocaleDateString();
      counts.set(d, (counts.get(d)||0) + 1);
    });
    return Array.from(counts.entries())
      .map(([Día, Cantidad]) => ({ Día, Cantidad }));
  }

  getSolicitadosExcel() {
    const m = new Map<string,number>();
    this.turnos.forEach(t => {
      if (t.estado !== 'Cancelado') {
        m.set(
          t.especialista_id,
          (m.get(t.especialista_id) || 0) + 1
        );
      }
    });
    return Array.from(m.entries()).map(([id, cantidad]) => ({
      Médico: this.espNameMap.get(id) ?? id,
      Solicitados: cantidad
    }));
  }

  getFinalizadosExcel() {
  const m = new Map<string,number>();
  this.turnos
    .filter(t => t.estado === 'Realizado')
    .forEach(t => {
      m.set(
        t.especialista_id,
        (m.get(t.especialista_id) || 0) + 1
      );
    });
  return Array.from(m.entries()).map(([id, cantidad]) => ({
    Médico: this.espNameMap.get(id) ?? id,
    Finalizados: cantidad
  }));
}
    goBack(): void {
  this.location.back();
  }
}

