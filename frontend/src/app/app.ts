import {Component} from '@angular/core';
import {Shell} from './core/layout/shell/shell';
import {HomeComponent} from './core/auth/test/home/home.component';

@Component({
  selector: 'app-root',
  imports: [Shell, HomeComponent],
  template: `
    <app-home/>
    <!-- <app-shell/> -->

  `,
  host: {
    class: 'block h-dvh',
  },
})
export class App {
}
