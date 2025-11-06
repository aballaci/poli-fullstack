import { Injectable } from '@angular/core';

export interface CostLogEntry {
  logId: string;
  userId: string;
  feature: string;
  timestamp: string;
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  rawUsageMetadata: any;
  apiResponseStatus: string;
}

export interface FeatureCost {
  feature: string;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

export interface UserDailyCost {
  userId: string;
  date: string;
  feature: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

/**
 * Cost calculation service based on Gemini 2.5 Flash pricing
 * 
 * Pricing (Paid Tier, per 1M tokens in USD):
 * - Input price: $0.30 (text/image/video), $1.00 (audio)
 * - Output price (including thinking tokens): $2.50
 * - Context caching: $0.03 (text/image/video), $0.1 (audio), $1.00 / 1M tokens per hour (storage)
 * - Grounding with Google Search: 1,500 RPD free, then $35 / 1,000 grounded prompts
 * - Grounding with Google Maps: 1,500 RPD free, then $25 / 1,000 grounded prompts
 * 
 * For simplicity, we assume all features use text input/output pricing.
 */
@Injectable({ providedIn: 'root' })
export class CostCalculationService {
  // Pricing per 1M tokens (USD)
  private readonly INPUT_PRICE_PER_MILLION = 0.30; // $0.30 per 1M input tokens (text/image/video)
  private readonly OUTPUT_PRICE_PER_MILLION = 2.50; // $2.50 per 1M output tokens (including thinking tokens)

  /**
   * Calculate cost for a single log entry
   */
  calculateCost(entry: CostLogEntry): number {
    const inputCost = (entry.promptTokenCount / 1_000_000) * this.INPUT_PRICE_PER_MILLION;
    const outputCost = (entry.candidatesTokenCount / 1_000_000) * this.OUTPUT_PRICE_PER_MILLION;
    return inputCost + outputCost;
  }

  /**
   * Calculate total costs and costs per feature
   */
  calculateFeatureCosts(entries: CostLogEntry[]): {
    totalCost: number;
    featureCosts: FeatureCost[];
    averageCostPerUser: number;
    totalUsers: number;
  } {
    const featureMap = new Map<string, FeatureCost>();

    let totalCost = 0;
    const uniqueUsers = new Set<string>();

    for (const entry of entries) {
      const cost = this.calculateCost(entry);
      totalCost += cost;
      uniqueUsers.add(entry.userId);

      const existing = featureMap.get(entry.feature) || {
        feature: entry.feature,
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
      };

      existing.totalCost += cost;
      existing.inputTokens += entry.promptTokenCount;
      existing.outputTokens += entry.candidatesTokenCount;
      existing.requestCount += 1;

      featureMap.set(entry.feature, existing);
    }

    const featureCosts = Array.from(featureMap.values()).sort(
      (a, b) => b.totalCost - a.totalCost
    );

    const totalUsers = uniqueUsers.size;
    const averageCostPerUser = totalUsers > 0 ? totalCost / totalUsers : 0;

    return {
      totalCost,
      featureCosts,
      averageCostPerUser,
      totalUsers,
    };
  }

  /**
   * Calculate top 10 user costs per day, per feature
   */
  calculateTopUserDailyCosts(entries: CostLogEntry[]): UserDailyCost[] {
    const dailyMap = new Map<string, UserDailyCost>();

    for (const entry of entries) {
      const date = new Date(entry.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `${entry.userId}#${date}#${entry.feature}`;

      const existing = dailyMap.get(key) || {
        userId: entry.userId,
        date,
        feature: entry.feature,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
      };

      const cost = this.calculateCost(entry);
      existing.cost += cost;
      existing.inputTokens += entry.promptTokenCount;
      existing.outputTokens += entry.candidatesTokenCount;
      existing.requestCount += 1;

      dailyMap.set(key, existing);
    }

    const allDailyCosts = Array.from(dailyMap.values());
    
    // Sort by cost descending and take top 10
    return allDailyCosts
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  }

  /**
   * Format large numbers
   */
  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }
}

