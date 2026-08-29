import {Component, inject, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatChipsModule} from '@angular/material/chips';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatBadgeModule} from '@angular/material/badge';
import {MatDividerModule} from '@angular/material/divider';
import {NgxEchartsDirective, provideEchartsCore} from 'ngx-echarts';

import {
  FullCalendarModule,
  type CalendarOptions,
} from '@fullcalendar/angular';
import themePlugin from '@fullcalendar/angular/themes/classic';
import dayGridPlugin from '@fullcalendar/angular/daygrid';
import timeGridPlugin from '@fullcalendar/angular/timegrid';
import listPlugin from '@fullcalendar/angular/list';
import interactionPlugin from '@fullcalendar/angular/interaction';

import type {EChartsOption} from 'echarts';

//import {AuthService} from '../../core/auth/auth.service';

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface DeptCapacity {
  dept: string;
  headcount: number;
  outToday: number;
  color: string;
}

interface TeamStatusRow {
  name: string;
  role: string;
  status: 'out' | 'partial' | 'in';
  detail: string;
  initials: string;
}

interface LeaveEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
  type: 'annual' | 'sick' | 'remote' | 'holiday';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-dashb-test',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    NgxEchartsDirective,
    FullCalendarModule,
  ],
  providers: [
    // Registering echarts core here keeps the bundle tree-shaken;
    // see echarts-setup.ts for the actual `use()` calls.
    provideEchartsCore({echarts: () => import('echarts')}),
  ],
  templateUrl: './dashb-test.html',
  styleUrl: './dashb-test.scss',
})
export class DashboardComponent {
//  protected readonly auth = inject(AuthService);

  // -- View state -----------------------------------------------------------

  protected readonly calendarView = signal<'dayGridMonth' | 'timeGridWeek' | 'listMonth'>(
    'dayGridMonth',
  );
  protected readonly selectedDept = signal<string | null>(null);
  protected readonly selectedEvent = signal<LeaveEvent | null>(null);

  // -- Static-ish domain data -------------------------------------------------

  private readonly deptColors: Record<string, string> = {
    Engineering: '#4F46E5',
    Sales: '#F59E0B',
    Support: '#10B981',
    HR: '#EC4899',
    Operations: '#0EA5E9',
  };

  protected readonly departments: DeptCapacity[] = [
    {
      dept: 'Engineering', headcount: 42, outToday: 6,
      color: this.deptColors['Engineering']
    },
    {dept: 'Sales', headcount: 18, outToday: 2, color: this.deptColors['Sales']},
    {dept: 'Support', headcount: 24, outToday: 5, color: this.deptColors['Support']},
    {dept: 'HR', headcount: 8, outToday: 1, color: this.deptColors['HR']},
    {
      dept: 'Operations', headcount: 15, outToday: 3, color: this.deptColors['Operations']
    },
  ];

  protected readonly teamStatus: TeamStatusRow[] = [
    {
      name: 'Mariem Trabelsi', role: 'Frontend Lead', status: 'out',
      detail: 'Annual leave · back Mon', initials: 'MT'
    },
    {
      name: 'Yassine Kort', role: 'Support Eng.', status: 'out',
      detail: 'Sick leave · back tomorrow', initials: 'YK'
    },
    {
      name: 'Amina Belhaj', role: 'Account Exec.', status: 'partial',
      detail: 'Remote, out from 2pm', initials: 'AB'
    },
    {
      name: 'Karim Sassi', role: 'Ops Manager', status: 'in', detail: 'In office',
      initials: 'KS'
    },
    {
      name: 'Nour Chaabane', role: 'HR Partner', status: 'in', detail: 'In office',
      initials: 'NC'
    },
    {
      name: 'Hedi Zouari', role: 'Backend Eng.', status: 'out',
      detail: 'Annual leave · back next week', initials: 'HZ'
    },
  ];

  private readonly rawEvents: LeaveEvent[] = [
    {
      id: 'e1', title: 'M. Trabelsi — annual leave', start: this.offsetDate(0),
      end: this.offsetDate(4), color: this.deptColors['Engineering'], type: 'annual'
    },
    {
      id: 'e2', title: 'Y. Kort — sick leave', start: this.offsetDate(-1),
      end: this.offsetDate(1), color: '#F04438', type: 'sick'
    },
    {
      id: 'e3', title: 'A. Belhaj — remote (PM)', start: this.offsetDate(0),
      color: this.deptColors['Sales'], type: 'remote'
    },
    {
      id: 'e4', title: 'Public holiday — Independence Day', start: this.offsetDate(9),
      color: '#94A3B8', type: 'holiday'
    },
    {
      id: 'e5', title: 'H. Zouari — annual leave', start: this.offsetDate(6),
      end: this.offsetDate(11), color: this.deptColors['Engineering'], type: 'annual'
    },
    {
      id: 'e6', title: 'Support team — offsite', start: this.offsetDate(13),
      end: this.offsetDate(14), color: this.deptColors['Support'], type: 'remote'
    },
    {
      id: 'e7', title: 'N. Chaabane — annual leave', start: this.offsetDate(16),
      end: this.offsetDate(19), color: this.deptColors['HR'], type: 'annual'
    },
    {
      id: 'e8', title: 'Ops — quarterly leave freeze ends', start: this.offsetDate(20),
      color: this.deptColors['Operations'], type: 'holiday'
    },
  ];

  // -- KPIs -------------------------------------------------------------------

  protected readonly totalHeadcount = computed(() =>
    this.departments.reduce((sum, d) => sum + d.headcount, 0),
  );
  protected readonly totalOutToday = computed(() =>
    this.departments.reduce((sum, d) => sum + d.outToday, 0),
  );
  protected readonly outPct = computed(() =>
    Math.round((this.totalOutToday() / this.totalHeadcount()) * 100),
  );
  protected readonly pendingApprovals = 7;
  protected readonly avgBalanceDays = 14.5;

  // -- ECharts: department bar (leave taken this quarter) ---------------------

  protected readonly deptBarOptions: EChartsOption = {
    tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}},
    grid: {left: 40, right: 16, top: 24, bottom: 50},
    legend: {data: ['Days taken', 'Days remaining'], bottom: 0},
    xAxis: {
      type: 'category',
      data: this.departments.map((d) => d.dept),
      axisLine: {lineStyle: {color: '#CBD5E1'}},
    },
    yAxis: {type: 'value', splitLine: {lineStyle: {color: '#EEF1F5'}}},
    series: [
      {
        name: 'Days taken',
        type: 'bar',
        stack: 'total',
        itemStyle: {color: '#4F46E5', borderRadius: [4, 4, 0, 0]},
        data: [62, 34, 71, 18, 40],
      },
      {
        name: 'Days remaining',
        type: 'bar',
        stack: 'total',
        itemStyle: {color: '#E0E7FF'},
        data: [148, 86, 105, 46, 100],
      },
    ],
  };

  // -- ECharts: leave trend over the year (line) -------------------------------

  protected readonly trendOptions: EChartsOption = {
    tooltip: {trigger: 'axis'},
    grid: {left: 40, right: 16, top: 24, bottom: 50},
    legend: {data: ['Annual', 'Sick', 'Remote'], bottom: 0},
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
    },
    yAxis: {type: 'value', splitLine: {lineStyle: {color: '#EEF1F5'}}},
    series: [
      {
        name: 'Annual',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {color: '#4F46E5'},
        areaStyle: {color: 'rgba(79,70,229,0.08)'},
        data: [20, 24, 18, 30, 42, 55, 61, 38],
      },
      {
        name: 'Sick',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {color: '#F04438'},
        data: [8, 6, 12, 7, 9, 11, 6, 8],
      },
      {
        name: 'Remote',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {color: '#10B981'},
        data: [14, 16, 20, 22, 19, 25, 29, 24],
      },
    ],
  };

  // -- ECharts: leave-type donut -----------------------------------------------

  protected readonly typeDonutOptions: EChartsOption = {
    tooltip: {trigger: 'item', formatter: '{b}: {c} days ({d}%)'},
    legend: {orient: 'vertical', right: 8, top: 'center', textStyle: {fontSize: 12}},
    series: [
      {
        type: 'pie',
        radius: ['58%', '80%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {borderColor: '#fff', borderWidth: 2},
        label: {show: false},
        data: [
          {value: 225, name: 'Annual', itemStyle: {color: '#4F46E5'}},
          {value: 58, name: 'Sick', itemStyle: {color: '#F04438'}},
          {value: 149, name: 'Remote', itemStyle: {color: '#10B981'}},
          {value: 32, name: 'Unpaid', itemStyle: {color: '#F59E0B'}},
        ],
      },
    ],
  };

  // -- Per-department capacity gauges (signature element) ----------------------
  gaugeOptionsFor(d: DeptCapacity): EChartsOption {
    const pct = Math.round((d.outToday / d.headcount) * 100);

    return {
      series: [
        // Hollow ring / border
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -270,
          radius: '92%',
          pointer: {show: false},
          progress: {show: false},

          axisLine: {
            lineStyle: {
              width: 8,
              color: [[1, '#D6D3CE']],
            },
          },

          splitLine: {show: false},
          axisTick: {show: false},
          axisLabel: {show: false},
          title: {show: false},
          detail: {show: false},
        },

        // Actual progress gauge
        {
          type: 'gauge',
          startAngle: 90,
          endAngle: -270,
          radius: '92%',
          pointer: {show: false},

          progress: {
            show: true,
            overlap: false,
            roundCap: true,
            clip: false,
            itemStyle: {color: d.color},
          },

          axisLine: {
            lineStyle: {
              width: 8,
              color: [[1, 'transparent']],
            },
          },

          splitLine: {show: false},
          axisTick: {show: false},
          axisLabel: {show: false},
          data: [{value: pct, name: d.dept}],
          title: {show: false},

          detail: {
            valueAnimation: true,
            fontSize: 16,
            fontWeight: 700,
            color: 'black',
            offsetCenter: [0, 0],
            formatter: () => `${pct}%`,
          },
        },
      ],
    };
  }

  // -- FullCalendar -------------------------------------------------------------

  protected readonly calendarOptions: CalendarOptions = {
    plugins: [themePlugin, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    colorScheme: 'light',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listMonth',
    },
    height: 'auto',
    firstDay: 1,
    dayMaxEvents: 3,
    weekNumbers: true,
    selectable: true,
    editable: false,
    nowIndicator: true,
    events: this.rawEvents,
    eventClick: (arg) => {
      const match = this.rawEvents.find((e) => e.id === arg.event.id) ?? null;
      this.selectedEvent.set(match);
    },
    dateClick: (arg) => {
      // Clicking an empty day clears the detail panel back to "no selection".
      this.selectedEvent.set(null);
      console.debug('date clicked', arg.dateStr);
    },
  };

  // -- Helpers -----------------------------------------------------------------

  protected statusLabel(status: TeamStatusRow['status']): string {
    switch (status) {
      case 'out':
        return 'Out today';
      case 'partial':
        return 'Partial day';
      case 'in':
        return 'In office';
    }
  }

  protected selectDept(dept: string): void {
    this.selectedDept.set(this.selectedDept() === dept ? null : dept);
  }

  private offsetDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
