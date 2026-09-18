import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  viewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { forkJoin } from 'rxjs';

import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

import {
  LeaveRequestService,
  LeaveRequestResponse,
  LeaveTypeCode,
} from '../../core/services/leave-request.service';
import {
  ManagerAnalyticsService,
  ManagerAnalyticsResponse,
  LeaveRateStatus,
} from '../../core/services/manager-analytics.service';
import { AuthService } from '../../core/auth/auth.service';
import { HeaderComponent } from '../../core/layout/header/header.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

import {
  ApprovalDecisionDialogComponent,
  ApprovalDecisionDialogData,
  ApprovalDecisionDialogResult,
} from './dialogs/approval-decision-dialog/approval-decision-dialog.component';
import {
  DocumentViewerDialogComponent,
  DocumentViewerDialogData,
} from './dialogs/document-viewer-dialog/document-viewer-dialog.component';

@Component({
  selector: 'app-manager-approvals',
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
    MatTableModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressBarModule,
    StatusBadgeComponent,
  ],
  templateUrl: './manager-approvals.component.html',
  styleUrl: './manager-approvals.component.scss',
})
export class ManagerApprovalsComponent implements OnInit, AfterViewInit {
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly analyticsService = inject(ManagerAnalyticsService);
  private readonly dialog = inject(MatDialog);
  readonly auth = inject(AuthService);

  // Tab State
  readonly selectedTabIndex = signal<number>(0);

  // Approvals Queue State
  readonly pendingRequests = signal<LeaveRequestResponse[]>([]);
  readonly loading = signal(false);
  readonly batchProcessing = signal(false);

  // Table Data Source & Selection
  readonly displayedColumns: string[] = [
    'select',
    'employee',
    'leaveType',
    'dates',
    'duration',
    'reason',
    'attachments',
    'actions',
  ];
  readonly dataSource = new MatTableDataSource<LeaveRequestResponse>([]);
  readonly selection = new SelectionModel<LeaveRequestResponse>(true, []);

  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  // Filters State
  readonly selectedTypeFilter = signal<string>('ALL');
  readonly searchQuery = signal<string>('');

  // Analytics State
  readonly analyticsData = signal<ManagerAnalyticsResponse | null>(null);
  readonly loadingAnalytics = signal(false);
  readonly selectedScope = signal<'team' | 'department'>('team');

  // Chart Options
  readonly donutOptions = signal<EChartsOption>({});
  readonly barOptions = signal<EChartsOption>({});
  readonly heatmapOptions = signal<EChartsOption>({});

  // Messages
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  constructor() {
    this.setupFilterPredicate();
  }

  ngOnInit(): void {
    this.loadPending();
    this.loadAnalytics();
  }

  ngAfterViewInit(): void {
    this.bindTableUtilities();
  }

  private bindTableUtilities(): void {
    const pag = this.paginator();
    const srt = this.sort();
    if (pag) {
      this.dataSource.paginator = pag;
    }
    if (srt) {
      this.dataSource.sort = srt;
      this.dataSource.sortingDataAccessor = (item, property) => {
        switch (property) {
          case 'employee':
            return this.getEmployeeName(item).toLowerCase();
          case 'leaveType':
            return item.leaveTypeCode;
          case 'dates':
            return item.startDate;
          case 'duration':
            return item.durationDays;
          case 'attachments':
            return item.supportingDocuments?.length || 0;
          default:
            return (item as any)[property] || '';
        }
      };
    }
  }

  private setupFilterPredicate(): void {
    this.dataSource.filterPredicate = (data: LeaveRequestResponse, filter: string) => {
      const parsed = JSON.parse(filter) as { type: string; query: string };
      // 1. Leave Type Filter
      if (parsed.type !== 'ALL' && data.leaveTypeCode !== parsed.type) {
        return false;
      }
      // 2. Search Query Filter (employee name, department, or reason)
      if (parsed.query) {
        const q = parsed.query.toLowerCase();
        const empName = this.getEmployeeName(data).toLowerCase();
        const dept = (data.employeeSnapshot?.departmentLabel || '').toLowerCase();
        const reason = (data.reason || '').toLowerCase();
        return empName.includes(q) || dept.includes(q) || reason.includes(q);
      }
      return true;
    };
  }

  applyFilters(): void {
    this.dataSource.filter = JSON.stringify({
      type: this.selectedTypeFilter(),
      query: this.searchQuery().trim(),
    });
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  setTypeFilter(type: string): void {
    this.selectedTypeFilter.set(type);
    this.applyFilters();
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.applyFilters();
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    if (index === 1 && !this.analyticsData()) {
      this.loadAnalytics();
    }
  }

  loadPending(): void {
    this.loading.set(true);
    this.leaveRequestService.listPendingTeamRequests().subscribe({
      next: (res) => {
        const data = res.data || [];
        this.pendingRequests.set(data);
        this.dataSource.data = data;
        this.selection.clear();
        this.applyFilters();
        this.bindTableUtilities();
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to load team leave requests.'
        );
      },
    });
  }

  loadAnalytics(): void {
    this.loadingAnalytics.set(true);
    this.analyticsService.getAnalytics(this.selectedScope()).subscribe({
      next: (data) => {
        this.analyticsData.set(data);
        this.loadingAnalytics.set(false);
        this.buildChartOptions(data);
      },
      error: (err) => {
        this.loadingAnalytics.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to load team analytics.'
        );
      },
    });
  }

  setScope(scope: 'team' | 'department'): void {
    if (this.selectedScope() !== scope) {
      this.selectedScope.set(scope);
      this.loadAnalytics();
    }
  }

  // ─── Selection Helpers ─────────────────────────────────────────
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numRows > 0 && numSelected === numRows;
  }

  isIndeterminate(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.filteredData.length;
    return numSelected > 0 && numSelected < numRows;
  }

  toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.filteredData.forEach((row) => this.selection.select(row));
    }
  }

  clearSelection(): void {
    this.selection.clear();
  }

  // ─── Modal Decision Flows ─────────────────────────────────────
  openApproveDialog(request: LeaveRequestResponse): void {
    const dialogRef = this.dialog.open(ApprovalDecisionDialogComponent, {
      width: '520px',
      data: {
        action: 'approve',
        requests: [request],
      } as ApprovalDecisionDialogData,
    });

    dialogRef.afterClosed().subscribe((res: ApprovalDecisionDialogResult | undefined) => {
      if (res?.confirmed) {
        this.executeApprove(request.id, res.comment);
      }
    });
  }

  openRejectDialog(request: LeaveRequestResponse): void {
    const dialogRef = this.dialog.open(ApprovalDecisionDialogComponent, {
      width: '520px',
      data: {
        action: 'reject',
        requests: [request],
      } as ApprovalDecisionDialogData,
    });

    dialogRef.afterClosed().subscribe((res: ApprovalDecisionDialogResult | undefined) => {
      if (res?.confirmed && res.comment) {
        this.executeReject(request.id, res.comment);
      }
    });
  }

  openBatchApproveDialog(): void {
    const selected = this.selection.selected;
    if (selected.length === 0) return;

    const dialogRef = this.dialog.open(ApprovalDecisionDialogComponent, {
      width: '560px',
      data: {
        action: 'approve',
        requests: selected,
      } as ApprovalDecisionDialogData,
    });

    dialogRef.afterClosed().subscribe((res: ApprovalDecisionDialogResult | undefined) => {
      if (res?.confirmed) {
        this.executeBatchApprove(selected, res.comment);
      }
    });
  }

  openBatchRejectDialog(): void {
    const selected = this.selection.selected;
    if (selected.length === 0) return;

    const dialogRef = this.dialog.open(ApprovalDecisionDialogComponent, {
      width: '560px',
      data: {
        action: 'reject',
        requests: selected,
      } as ApprovalDecisionDialogData,
    });

    dialogRef.afterClosed().subscribe((res: ApprovalDecisionDialogResult | undefined) => {
      if (res?.confirmed && res.comment) {
        this.executeBatchReject(selected, res.comment);
      }
    });
  }

  openDocumentDialog(documentId: string, req: LeaveRequestResponse): void {
    this.dialog.open(DocumentViewerDialogComponent, {
      width: '760px',
      data: {
        documentId,
        employeeName: this.getEmployeeName(req),
      } as DocumentViewerDialogData,
    });
  }

  // ─── Execution Logic ──────────────────────────────────────────
  private executeApprove(id: string, comment?: string): void {
    this.batchProcessing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.leaveRequestService.approve(id, comment).subscribe({
      next: () => {
        this.batchProcessing.set(false);
        this.successMessage.set('Leave request approved successfully.');
        this.loadPending();
        this.loadAnalytics();
      },
      error: (err) => {
        this.batchProcessing.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to approve leave request.'
        );
      },
    });
  }

  private executeReject(id: string, comment: string): void {
    this.batchProcessing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.leaveRequestService.reject(id, comment).subscribe({
      next: () => {
        this.batchProcessing.set(false);
        this.successMessage.set('Leave request rejected.');
        this.loadPending();
        this.loadAnalytics();
      },
      error: (err) => {
        this.batchProcessing.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'Failed to reject leave request.'
        );
      },
    });
  }

  private executeBatchApprove(requests: LeaveRequestResponse[], comment?: string): void {
    this.batchProcessing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const calls = requests.map((req) => this.leaveRequestService.approve(req.id, comment));
    forkJoin(calls).subscribe({
      next: () => {
        this.batchProcessing.set(false);
        this.successMessage.set(`Successfully approved ${requests.length} leave requests.`);
        this.loadPending();
        this.loadAnalytics();
      },
      error: (err) => {
        this.batchProcessing.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'One or more requests could not be approved.'
        );
        this.loadPending();
        this.loadAnalytics();
      },
    });
  }

  private executeBatchReject(requests: LeaveRequestResponse[], comment: string): void {
    this.batchProcessing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const calls = requests.map((req) => this.leaveRequestService.reject(req.id, comment));
    forkJoin(calls).subscribe({
      next: () => {
        this.batchProcessing.set(false);
        this.successMessage.set(`Successfully rejected ${requests.length} leave requests.`);
        this.loadPending();
        this.loadAnalytics();
      },
      error: (err) => {
        this.batchProcessing.set(false);
        this.errorMessage.set(
          err?.error?.message || err?.error?.error?.message || 'One or more requests could not be rejected.'
        );
        this.loadPending();
        this.loadAnalytics();
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────
  getEmployeeName(req: LeaveRequestResponse): string {
    const snap = req.employeeSnapshot;
    if (snap && (snap.firstName || snap.lastName)) {
      return `${snap.firstName || ''} ${snap.lastName || ''}`.trim();
    }
    return req.employeeId;
  }

  getEmployeeInitials(req: LeaveRequestResponse): string {
    const snap = req.employeeSnapshot;
    const first = snap?.firstName?.charAt(0) || '';
    const last = snap?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'E';
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

  isStale(req: LeaveRequestResponse): boolean {
    if (!req.submittedAt) return false;
    const submittedTime = new Date(req.submittedAt).getTime();
    const diffDays = (Date.now() - submittedTime) / (1000 * 60 * 60 * 24);
    return diffDays >= 3;
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

  private buildChartOptions(data: ManagerAnalyticsResponse): void {
    // 1. Donut Chart: Leave by Type
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
            Days taken: <b>${params.value}d</b> (${params.percent}%)
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

    // 2. Bar Chart: Approvals & Pipeline
    const categories = (data.typeStatusBreakdowns || []).map((b) => b.label);
    const approvedSeries = (data.typeStatusBreakdowns || []).map((b) => b.approvedCount);
    const rejectedSeries = (data.typeStatusBreakdowns || []).map((b) => b.rejectedCount);
    const pendingSeries = (data.typeStatusBreakdowns || []).map(
      (b) => b.pendingCount - b.stalePendingCount
    );
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

    const maxAbsences = Math.max(3, data.teamSummary?.totalMembers || 4);
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
            <div style="color: #64748B;">Absent: <b>${count}</b></div>
            ${
              count > 0
                ? `<div style="color: #E11D48; font-weight: 500;">${names}</div>`
                : `<div style="color: #059669; font-weight: 500;">Full Team Present</div>`
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
}
