import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

import {
  HrAnalyticsService,
  HrAnalyticsResponse,
  WorkforceMemberRoster,
} from '../../../core/services/hr-analytics.service';
import { LeaveTypeCode } from '../../../core/services/leave-request.service';
import { LeaveRateStatus } from '../../../core/services/manager-analytics.service';
import { HeaderComponent } from '../../../core/layout/header/header.component';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-hr-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    NgxEchartsDirective,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    StatusBadgeComponent,
  ],
  templateUrl: './hr-analytics.component.html',
  styleUrl: './hr-analytics.component.scss',
})
export class HrAnalyticsComponent implements OnInit {
  private readonly hrAnalyticsService = inject(HrAnalyticsService);

  readonly analyticsData = signal<HrAnalyticsResponse | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Selected Scope: 'ALL' or departmentId
  readonly selectedDepartmentId = signal<string>('ALL');
  readonly selectedTabIndex = signal<number>(0);

  // Search filter for roster
  readonly rosterSearchQuery = signal<string>('');

  // Chart Options
  readonly donutOptions = signal<EChartsOption>({});
  readonly barOptions = signal<EChartsOption>({});
  readonly heatmapOptions = signal<EChartsOption>({});

  // Filtered Roster
  readonly filteredRoster = computed<WorkforceMemberRoster[]>(() => {
    const data = this.analyticsData();
    if (!data) return [];
    const q = this.rosterSearchQuery().trim().toLowerCase();
    if (!q) return data.workforceRoster;

    return data.workforceRoster.filter((m) => {
      const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
      const email = (m.email || '').toLowerCase();
      const num = (m.employeeNumber || '').toLowerCase();
      const dept = (m.departmentLabel || '').toLowerCase();
      return name.includes(q) || email.includes(q) || num.includes(q) || dept.includes(q);
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(deptId?: string): void {
    const targetDept = deptId !== undefined ? deptId : this.selectedDepartmentId();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.hrAnalyticsService.getAnalytics(targetDept).subscribe({
      next: (res) => {
        this.analyticsData.set(res);
        this.loading.set(false);
        this.buildChartOptions(res);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to load organization analytics.'
        );
      },
    });
  }

  onDepartmentTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    const data = this.analyticsData();
    if (!data) return;

    if (index === 0) {
      this.selectedDepartmentId.set('ALL');
      this.loadData('ALL');
    } else {
      const dept = data.availableDepartments[index - 1];
      if (dept) {
        this.selectedDepartmentId.set(dept.departmentId);
        this.loadData(dept.departmentId);
      }
    }
  }

  selectDepartmentFromTable(deptId: string): void {
    const data = this.analyticsData();
    if (!data) return;
    const idx = data.availableDepartments.findIndex((d) => d.departmentId === deptId);
    if (idx >= 0) {
      this.onDepartmentTabChange(idx + 1);
    }
  }

  private buildChartOptions(data: HrAnalyticsResponse): void {
    // 1. Donut Chart: Leave Days by Type
    const donutData = (data.leaveTypeStats || []).map((t) => ({
      name: t.label,
      value: t.totalDays,
      requestCount: t.requestCount,
    }));

    const typeColors: Record<string, string> = {
      'Paid Annual': '#3B82F6',
      'Sick Leave': '#EF4444',
      'Unpaid Leave': '#F59E0B',
      Maternity: '#EC4899',
    };

    this.donutOptions.set({
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `<div style="font-size: 11px; line-height: 1.4;">
            <span style="font-weight: 600;">${params.name}</span><br/>
            Total Days: <b>${params.value}d</b> (${params.percent}%)
          </div>`;
        },
      },
      legend: {
        orient: 'vertical',
        right: 4,
        top: 'center',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 11, color: '#64748B' },
      },
      series: [
        {
          name: 'Leave Days',
          type: 'pie',
          radius: ['48%', '70%'],
          center: ['34%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 5,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false },
          data: donutData.map((d) => ({
            ...d,
            itemStyle: { color: typeColors[d.name] || '#6366F1' },
          })),
        },
      ],
    });

    // 2. Bar Chart: Approvals & Pipeline Decisions
    const categories = (data.typeStatusBreakdowns || []).map((b) => b.label);
    const approvedSeries = (data.typeStatusBreakdowns || []).map((b) => b.approvedCount);
    const rejectedSeries = (data.typeStatusBreakdowns || []).map((b) => b.rejectedCount);
    const pendingSeries = (data.typeStatusBreakdowns || []).map((b) => b.pendingCount - b.stalePendingCount);
    const staleSeries = (data.typeStatusBreakdowns || []).map((b) => b.stalePendingCount);

    this.barOptions.set({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { fontSize: 11 },
      },
      legend: {
        data: ['Approved', 'Rejected', 'Pending', 'Stale (>3d)'],
        bottom: 0,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 10, color: '#64748B' },
      },
      grid: {
        left: '2%',
        right: '4%',
        bottom: '16%',
        top: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#64748B', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#F1F5F9' } },
        axisLabel: { color: '#94A3B8', fontSize: 10 },
      },
      series: [
        {
          name: 'Approved',
          type: 'bar',
          itemStyle: { color: '#10B981', borderRadius: [3, 3, 0, 0] },
          data: approvedSeries,
        },
        {
          name: 'Rejected',
          type: 'bar',
          itemStyle: { color: '#94A3B8', borderRadius: [3, 3, 0, 0] },
          data: rejectedSeries,
        },
        {
          name: 'Pending',
          type: 'bar',
          itemStyle: { color: '#F59E0B', borderRadius: [3, 3, 0, 0] },
          data: pendingSeries,
        },
        {
          name: 'Stale (>3d)',
          type: 'bar',
          itemStyle: { color: '#EF4444', borderRadius: [3, 3, 0, 0] },
          data: staleSeries,
        },
      ],
    });

    // 3. Calendar Heatmap
    const namesByDate = new Map<string, string[]>();
    const heatmapValues: [string, number][] = (data.heatmapData || []).map((d) => {
      namesByDate.set(d.date, d.absentEmployeeNames || []);
      return [d.date, d.absentCount];
    });

    const maxAbsences = Math.max(4, Math.ceil((data.presenceKpi?.totalMembers || 5) * 0.4));
    const yearString =
      data.heatmapData && data.heatmapData.length > 0
        ? data.heatmapData[0].date.substring(0, 4)
        : new Date().getFullYear().toString();

    this.heatmapOptions.set({
      tooltip: {
        formatter: (params: any) => {
          const val = params.value;
          const date = val[0];
          const count = val[1];
          const namesList = namesByDate.get(date) || [];
          const names = namesList.length ? namesList.join(', ') : 'None';
          return `<div style="font-size: 11px; line-height: 1.4;">
            <div style="font-weight: 700; color: #0F172A;">${date}</div>
            <div style="color: #64748B;">Absent across scope: <b>${count}</b></div>
            ${
              count > 0
                ? `<div style="color: #E11D48; font-weight: 500;">${names}</div>`
                : `<div style="color: #059669; font-weight: 500;">Full Team Attendance</div>`
            }
          </div>`;
        },
      },
      visualMap: {
        min: 0,
        max: maxAbsences,
        type: 'piecewise',
        orient: 'horizontal',
        right: 0,
        top: 0,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 10, color: '#64748B' },
        pieces: [
          { value: 0, label: 'Full (0)', color: '#F1F5F9' },
          { value: 1, label: '1 Away', color: '#FEF08A' },
          { value: 2, label: '2 Away', color: '#FDBA74' },
          { min: 3, label: '3+ (Risk)', color: '#F87171' },
        ],
      },
      calendar: {
        top: 32,
        bottom: 8,
        left: 24,
        right: 14,
        cellSize: ['auto', 13],
        range: yearString,
        itemStyle: {
          borderWidth: 1,
          borderColor: '#E2E8F0',
        },
        dayLabel: {
          firstDay: 1,
          nameMap: 'en',
          color: '#94A3B8',
          fontSize: 9,
        },
        monthLabel: {
          nameMap: 'en',
          color: '#475569',
          fontSize: 10,
        },
        yearLabel: { show: false },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: heatmapValues,
        },
      ],
    });
  }

  getLeaveRateBadge(status: LeaveRateStatus | undefined): {
    category: 'active' | 'approved' | 'pending' | 'rejected' | 'neutral';
    label: string;
  } {
    switch (status) {
      case 'ALL_PRESENT':
        return { category: 'active', label: 'All Present' };
      case 'LOW':
        return { category: 'approved', label: 'Low Rate' };
      case 'MODERATE':
        return { category: 'pending', label: 'Moderate' };
      case 'HIGH':
        return { category: 'pending', label: 'High Staffing Risk' };
      case 'VERY_HIGH':
        return { category: 'rejected', label: 'Critical Understaffing' };
      default:
        return { category: 'neutral', label: 'Normal' };
    }
  }

  formatType(code: LeaveTypeCode): string {
    switch (code) {
      case 'PAID_ANNUAL':
        return 'Paid Annual';
      case 'SICK':
        return 'Sick Leave';
      case 'UNPAID':
        return 'Unpaid Leave';
      case 'MATERNITY':
        return 'Maternity';
      default:
        return code;
    }
  }
}
