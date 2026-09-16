import {
  Component,
  input,
  effect,
  ElementRef,
  viewChild,
  OnDestroy,
  AfterViewInit
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import * as echarts from 'echarts';
import { LeaveUtilization } from '../../models';

@Component({
  selector: 'app-leave-utilization',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './leave-utilization.component.html',
  styleUrl: './leave-utilization.component.scss'
})
export class LeaveUtilizationComponent implements AfterViewInit, OnDestroy {
  readonly data = input<LeaveUtilization | null>(null);

  private readonly chartContainer = viewChild<ElementRef<HTMLDivElement>>('chart');
  private chartInstance: echarts.ECharts | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const d = this.data();
      if (d && this.chartInstance) {
        this.updateChart(d);
      }
    });
  }

  ngAfterViewInit(): void {
    const el = this.chartContainer()?.nativeElement;
    if (!el) return;

    this.chartInstance = echarts.init(el);
    const d = this.data();
    if (d) {
      this.updateChart(d);
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.chartInstance?.resize();
    });
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chartInstance?.dispose();
    this.chartInstance = null;
  }

  private updateChart(d: LeaveUtilization): void {
    if (!this.chartInstance) return;

    this.chartInstance.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} days ({d}%)'
      },
      series: [
        {
          type: 'pie',
          radius: ['55%', '75%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false
          },
          data: [
            { value: d.taken, name: 'Taken', itemStyle: { color: '#3b82f6' } },
            { value: d.planned, name: 'Planned', itemStyle: { color: '#f59e0b' } },
            { value: d.remaining, name: 'Remaining', itemStyle: { color: '#10b981' } }
          ]
        }
      ]
    });
  }
}
