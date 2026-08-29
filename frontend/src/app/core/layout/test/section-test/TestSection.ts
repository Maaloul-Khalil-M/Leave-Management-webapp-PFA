import {Component} from '@angular/core';

import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-test-section',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <section class="section">
      <mat-card appearance="outlined">

        <mat-card-header>
          <mat-icon mat-card-avatar>info</mat-icon>

          <mat-card-title>Test Section</mat-card-title>
          <mat-card-subtitle>
            A simple Material Design section
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <p>
            This is some test content inside a Material card.
          </p>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-button>
            CANCEL
          </button>

          <button mat-flat-button>
            CONTINUE
          </button>
        </mat-card-actions>

      </mat-card>
    </section>
  `,

  styles: `
    .section {
      width: min(100% - 2rem, 1200px);
      margin: 0 auto 1.5rem;
    }

    mat-card {
      width: 100%;
    }
  `,
})
export class TestSection {
}

