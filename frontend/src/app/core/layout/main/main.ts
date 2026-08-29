import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {DashboardComponent} from '../test/dashb-test/dashb-test';

//import {TestSection} from '../section-test/TestSection';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterOutlet, DashboardComponent, DashboardComponent],
  template: `
    <main class="app-main">
      <app-dashb-test/>
      <router-outlet/>
    </main>
  `,
  host: {
    class: 'flex-1 min-h-0 overflow-y-auto',
  },
  styles: `
    .app-main {
      flex: 1 0 auto;
      padding-block: 0.5rem;
    }
  `,
})
export class Main {
}
