import {Component} from '@angular/core';
import {HeaderComponent} from '../header/header.component';
import {Main} from '../main/main';

//import {Footer} from '../footer/footer';

@Component({
  selector: 'app-shell',
  imports: [
    HeaderComponent,
    Main,
  ],
  template: `
    <app-header/>
    <app-main/>
    <!-- <app-footer/> -->
  `,
  host: {
    class: 'flex flex-col h-dvh overflow-hidden',
  },
})
export class Shell {
}


