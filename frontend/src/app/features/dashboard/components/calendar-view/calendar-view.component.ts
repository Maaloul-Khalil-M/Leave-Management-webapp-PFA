import { Component, input, computed, signal, viewChild, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from 'fullcalendar';
import dayGridPlugin from 'fullcalendar/daygrid';
import { CalendarData } from '../../models';
import {
  EventDetailDialogComponent,
  CalendarEventDialogData
} from './event-detail-dialog/event-detail-dialog.component';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    FullCalendarModule
  ],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss'
})
export class CalendarViewComponent {
  private readonly dialog = inject(MatDialog);

  readonly calendarData = input<CalendarData | null>(null);
  readonly fullCalendarRef = viewChild<FullCalendarComponent>('fullCalendar');

  readonly activeMonthTitle = signal<string>('');

  readonly calendarOptions = computed<CalendarOptions>(() => {
    const data = this.calendarData();
    const events: EventInput[] = (data?.events ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: e.color,
      borderColor: e.color,
      extendedProps: {
        rawType: e.type,
        color: e.color
      }
    }));

    return {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      initialDate: data?.highlightDate || new Date().toISOString().split('T')[0],
      headerToolbar: false,
      height: 290,
      contentHeight: 250,
      fixedWeekCount: false,
      dayMaxEvents: 3,
      events,
      datesSet: (dateInfo) => {
        this.activeMonthTitle.set(dateInfo.view.title);
      },
      eventContent: (arg) => {
        const color = (arg.event.extendedProps?.['color'] as string) || (arg.event as any).backgroundColor || '#3b82f6';
        const title = arg.event.title.replace(/"/g, '&quot;');
        return {
          html: `<span class="calendar-pip" style="background-color: ${color};" title="${title}"></span>`
        };
      },
      eventClick: (info) => {
        info.jsEvent.preventDefault();
        const ev = info.event;
        const color = (ev.extendedProps?.['color'] as string) || (ev as any).backgroundColor || '#3b82f6';
        const dialogData: CalendarEventDialogData = {
          title: ev.title,
          type: (ev.extendedProps?.['rawType'] as string) || 'Event',
          status: ev.title.includes('(Approved)')
            ? 'Approved'
            : ev.title.includes('(Pending)')
              ? 'Pending'
              : ev.title.includes('(Rejected)')
                ? 'Rejected'
                : ev.title.includes('(Draft)')
                  ? 'Draft'
                  : undefined,
          startDate: ev.startStr,
          endDate: ev.endStr || ev.startStr,
          color
        };

        this.dialog.open(EventDetailDialogComponent, {
          data: dialogData,
          width: '380px'
        });
      },
      dayCellClassNames: (arg: any) => {
        const highlight = data?.highlightDate;
        if (highlight && arg['dateStr'] === highlight) {
          return ['highlight-day'];
        }
        return [];
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
