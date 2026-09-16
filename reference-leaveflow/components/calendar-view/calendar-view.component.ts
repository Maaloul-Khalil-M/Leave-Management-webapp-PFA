import { Component, input, computed, OnInit, OnDestroy, ElementRef, viewChild, effect } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { CalendarData } from '../../models';

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [MatCardModule, FullCalendarModule],
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
      //initialView: 'dayGridWeek',
      initialDate: '2024-11-01',
      headerToolbar: {
        left: 'prev',
        center: 'title',
        right: 'next'
      },

      height: 'auto',


      //height: '100%',
      //contentHeight: '100%',

      fixedWeekCount: false,
      events,
      dayCellClassNames: (arg) => {
        const highlight = data?.highlightDate;
        if (highlight && arg['dateStr'] === highlight) {
          return ['highlight-day'];
        }
        return [];
      }
    };
  });
}
