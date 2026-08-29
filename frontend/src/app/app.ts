import {Component} from '@angular/core';
import {Shell} from './core/layout/shell/shell';

@Component({
  selector: 'app-root',
  imports: [Shell],
  template: `
    <app-shell/>
  `,
  host: {
    class: 'block h-dvh',
  },
})
export class App {
}
