import {Component} from '@angular/core';
import {Header} from '../header/header';
import {Main} from '../main/main';

//import {Footer} from '../footer/footer';

@Component({
  selector: 'app-shell',
  imports: [
    Header,
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


