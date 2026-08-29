import {bootstrapApplication} from '@angular/platform-browser';
import {appConfig} from './app/app.config';
import {App} from './app/app';
import 'temporal-polyfill/global';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
