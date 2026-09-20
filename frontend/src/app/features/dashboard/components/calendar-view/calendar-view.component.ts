import { Component, input, computed, signal, viewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from 'fullcalendar';
import dayGridPlugin from 'fullcalendar/daygrid';
import { CalendarData } from '../../models';

interface TooltipEventData {
  title: string;
  type: string;
  status?: string;
  startDate: string;
  endDate?: string;
  days?: number;
  reason?: string;
  color?: string;
}

function getExclusiveEndDate(startDateStr: string, endDateStr?: string): string {
  const targetEnd = endDateStr || startDateStr;
  const parts = targetEnd.split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
  return d.toISOString().split('T')[0];
}

function getDateRangeArray(startDateStr: string, endDateStr?: string): string[] {
  const dates: string[] = [];
  const endStr = endDateStr || startDateStr;
  const startParts = startDateStr.split('-').map(Number);
  const endParts = endStr.split('-').map(Number);
  const cur = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
  const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));

  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    FullCalendarModule
  ],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss'
})
export class CalendarViewComponent {
  readonly calendarData = input<CalendarData | null>(null);
  readonly fullCalendarRef = viewChild<FullCalendarComponent>('fullCalendar');

  readonly activeMonthTitle = signal<string>('');

  // Rich floating tooltip state
  readonly hoveredEvent = signal<TooltipEventData | null>(null);
  readonly tooltipPos = signal<{ x: number; y: number } | null>(null);
  readonly tooltipPlacement = signal<'top' | 'bottom'>('top');

  readonly calendarOptions = computed<CalendarOptions>(() => {
    const data = this.calendarData();

    const approvedDateSet = new Set<string>();
    const pendingDateSet = new Set<string>();
    const holidayDateSet = new Set<string>();

    (data?.events ?? []).forEach((e) => {
      const dates = getDateRangeArray(e.start, e.end);
      dates.forEach((d) => {
        if (e.type === 'Holiday') {
          holidayDateSet.add(d);
        } else if (e.status === 'Approved') {
          approvedDateSet.add(d);
        } else if (e.status === 'Pending') {
          pendingDateSet.add(d);
        }
      });
    });

    const events: EventInput[] = (data?.events ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: getExclusiveEndDate(e.start, e.end),
      backgroundColor: e.color,
      borderColor: e.color,
      extendedProps: {
        rawType: e.type,
        color: e.color,
        status: e.status,
        days: e.days,
        rawStart: e.start,
        rawEnd: e.end || e.start
      }
    }));

    return {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      initialDate: data?.highlightDate || new Date().toISOString().split('T')[0],
      headerToolbar: false,
      height: 310,
      contentHeight: 270,
      fixedWeekCount: false,
      dayMaxEvents: 2,
      events,
      datesSet: (dateInfo) => {
        this.activeMonthTitle.set(dateInfo.view.title);
      },
      eventContent: (arg) => {
        const rawType = (arg.event.extendedProps?.['rawType'] as string) || 'Leave';
        const status = arg.event.extendedProps?.['status'] as string;
        const isPending = status === 'Pending';
        const isHoliday = rawType === 'Holiday';

        let iconName = 'beach_access';
        let statusClass = 'event-approved';
        if (isHoliday) {
          iconName = 'celebration';
          statusClass = 'event-holiday';
        } else if (isPending) {
          iconName = 'schedule';
          statusClass = 'event-pending';
        }

        const title = arg.event.title
          .replace(/ \((Approved|Pending|Rejected|Draft)\)/g, '')
          .replace(/"/g, '&quot;');

        return {
          html: `
            <div class="calendar-event-ribbon ${statusClass}">
              <span class="ribbon-icon material-icons">${iconName}</span>
              <span class="ribbon-text">${title}</span>
            </div>
          `
        };
      },
      eventMouseEnter: (info) => {
        const ev = info.event;
        const color = (ev.extendedProps?.['color'] as string) || (ev as any).backgroundColor || '#3b82f6';
        const rawTitle = ev.title.replace(/ \((Approved|Pending|Rejected|Draft)\)/g, '');

        const targetRect = info.el.getBoundingClientRect();
        const x = targetRect.left + targetRect.width / 2;
        const placeBelow = targetRect.top < 130;
        const y = placeBelow ? targetRect.bottom + 8 : targetRect.top - 8;

        this.tooltipPlacement.set(placeBelow ? 'bottom' : 'top');
        this.tooltipPos.set({ x, y });

        this.hoveredEvent.set({
          title: rawTitle,
          type: (ev.extendedProps?.['rawType'] as string) || 'Event',
          status: (ev.extendedProps?.['status'] as string) || (
            ev.title.includes('(Approved)')
              ? 'Approved'
              : ev.title.includes('(Pending)')
                ? 'Pending'
                : undefined
          ),
          startDate: (ev.extendedProps?.['rawStart'] as string) || ev.startStr,
          endDate: (ev.extendedProps?.['rawEnd'] as string) || (ev.extendedProps?.['rawStart'] as string) || ev.startStr,
          days: ev.extendedProps?.['days'] as number,
          reason: ev.extendedProps?.['reason'] as string,
          color
        });
      },
      eventMouseLeave: () => {
        this.hoveredEvent.set(null);
        this.tooltipPos.set(null);
      },
      eventClick: (info) => {
        info.jsEvent.preventDefault();
      },
      dayCellClassNames: (arg: any) => {
        const classes: string[] = [];
        const dateStr = arg['dateStr'];
        const highlight = data?.highlightDate;
        if (highlight && dateStr === highlight) {
          classes.push('highlight-day');
        }
        if (approvedDateSet.has(dateStr)) {
          classes.push('day-approved');
        }
        if (pendingDateSet.has(dateStr)) {
          classes.push('day-pending');
        }
        if (holidayDateSet.has(dateStr)) {
          classes.push('day-holiday');
        }
        return classes;
      }
    };
  });

  prev(): void {
    this.fullCalendarRef()?.getApi()?.prev();
  }

  next(): void {
    this.fullCalendarRef()?.getApi()?.next();
  }

  today(): void {
    this.fullCalendarRef()?.getApi()?.today();
  }
}
