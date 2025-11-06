import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CostCalculationService, CostLogEntry, FeatureCost, UserDailyCost } from '../../services/cost-calculation.service';
import { CostSummaryService } from '../../services/cost-summary.service';

@Component({
  selector: 'app-cost-summary',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cost-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CostSummaryComponent implements OnInit {
  private costCalcService = inject(CostCalculationService);
  private costSummaryService = inject(CostSummaryService);
  private cdr = inject(ChangeDetectorRef);

  activeTab = signal<'overview' | 'topUsers'>('overview');
  
  loading = signal(true);
  error = signal<string | null>(null);
  
  // Overview data
  totalCost = signal(0);
  featureCosts = signal<FeatureCost[]>([]);
  averageCostPerUser = signal(0);
  totalUsers = signal(0);
  
  // Top users data
  topUserDailyCosts = signal<UserDailyCost[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.cdr.markForCheck();

    try {
      const entries = await this.costSummaryService.fetchAllCostLogs();
      
      // Calculate overview metrics
      const overview = this.costCalcService.calculateFeatureCosts(entries);
      this.totalCost.set(overview.totalCost);
      this.featureCosts.set(overview.featureCosts);
      this.averageCostPerUser.set(overview.averageCostPerUser);
      this.totalUsers.set(overview.totalUsers);

      // Calculate top user daily costs
      const topUsers = this.costCalcService.calculateTopUserDailyCosts(entries);
      this.topUserDailyCosts.set(topUsers);

      this.loading.set(false);
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Failed to load cost data:', err);
      this.error.set('Failed to load cost data. Please try again later.');
      this.loading.set(false);
      this.cdr.markForCheck();
    }
  }

  formatCurrency(amount: number): string {
    return this.costCalcService.formatCurrency(amount);
  }

  formatNumber(num: number): string {
    return this.costCalcService.formatNumber(num);
  }

  formatFeatureName(feature: string): string {
    return feature.replace(/_/g, ' ');
  }

  setTab(tab: 'overview' | 'topUsers'): void {
    this.activeTab.set(tab);
  }
}

