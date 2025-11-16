import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CacheManagementService, CacheStats } from '../../services/cache-management.service';

@Component({
  selector: 'app-cache-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cache-settings.component.html',
  styleUrl: './cache-settings.component.css'
})
export class CacheSettingsComponent implements OnInit {
  private cacheService = inject(CacheManagementService);

  stats = signal<CacheStats | null>(null);
  loading = signal<boolean>(false);
  message = signal<{ type: 'success' | 'error', text: string } | null>(null);
  showConfirmDialog = signal<boolean>(false);

  async ngOnInit() {
    await this.loadStats();
  }

  async loadStats() {
    this.loading.set(true);
    try {
      const stats = await this.cacheService.getCacheStats();
      this.stats.set(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      this.showMessage('error', 'Failed to load cache statistics');
    } finally {
      this.loading.set(false);
    }
  }

  confirmClearCache() {
    this.showConfirmDialog.set(true);
  }

  cancelClear() {
    this.showConfirmDialog.set(false);
  }

  async clearCache() {
    this.showConfirmDialog.set(false);
    this.loading.set(true);

    try {
      await this.cacheService.clearAllCaches();
      await this.loadStats();
      this.showMessage('success', 'Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      this.showMessage('error', 'Failed to clear cache');
    } finally {
      this.loading.set(false);
    }
  }

  private showMessage(type: 'success' | 'error', text: string) {
    this.message.set({ type, text });
    setTimeout(() => this.message.set(null), 5000);
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}
