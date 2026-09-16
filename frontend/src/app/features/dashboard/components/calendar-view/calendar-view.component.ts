import { Component, input, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from 'fullcalendar';
import dayGridPlugin from 'fullcalendar/daygrid';
import { CalendarData } from '../../models';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [MatCardModule, MatIconModule, FullCalendarModule],
  templateUrl: './calendar-view.component.html',
  styleUrl: './calendar-view.component.scss'
})
export class CalendarViewComponent {
  readonly calendarData = input<CalendarData | null>(null);

  readonly calendarOptions = computed<CalendarOptions>(() => {
    const data = this.calendarData();
    const events: EventInput[] = (data?.events ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: e.color,
      borderColor: e.color,
      display: 'background'
    }));

    return {
      plugins: [dayGridPlugin],
      initialView: 'dayGridMonth',
      initialDate: data?.highlightDate || new Date().toISOString().split('T')[0],
      headerToolbar: {
        left: 'prev',
        center: 'title',
        right: 'next'
      },
      height: 310,
      contentHeight: 270,
      fixedWeekCount: false,
      events,
      dayCellClassNames: (arg: any) => {
        const highlight = data?.highlightDate;
        if (highlight && arg['dateStr'] === highlight) {
          return ['highlight-day'];
        }
        return [];
      }
    };
  });
}
