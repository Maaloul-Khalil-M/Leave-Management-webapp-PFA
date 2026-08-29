import {Component} from '@angular/core';
import {MatToolbarModule} from '@angular/material/toolbar';

@Component({
  selector: 'app-footer',
  imports: [
    MatToolbarModule,
  ],
  template: `
    <mat-toolbar class="footer">
      <span>Platana</span>

      <span class="footer__spacer"></span>

      <span>© {{ year }}</span>

      <span class="footer__separator">•</span>

      <span>v1.0.0</span>

      <span class="footer__separator">•</span>

      <span>All rights reserved.</span>
    </mat-toolbar>
  `,

  host: {
    class: 'shrink-0',
  },

  styles: `
    .footer {
      min-height: 56px;
      padding-inline: 1rem;
      font-size: 0.8rem;
      opacity: 0.8;
    }

    .footer__spacer {
      flex: 1;
    }

    .footer__separator {
      margin-inline: 0.75rem;
      opacity: 0.5;
    }
  `,
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
