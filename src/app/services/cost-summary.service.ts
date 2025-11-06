import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';
import { CostLogEntry } from './cost-calculation.service';

@Injectable({ providedIn: 'root' })
export class CostSummaryService {
  private client = generateClient();

  /**
   * Fetch all GeminiUsageLog entries (admin only)
   */
  async fetchAllCostLogs(): Promise<CostLogEntry[]> {
    const listUsageLogsQuery = /* GraphQL */ `
      query ListGeminiUsageLogs {
        listGeminiUsageLogs(limit: 10000) {
          items {
            logId
            userId
            feature
            timestamp
            promptTokenCount
            candidatesTokenCount
            totalTokenCount
            rawUsageMetadata
            apiResponseStatus
          }
        }
      }
    `;

    try {
      const response = await this.client.graphql({
        query: listUsageLogsQuery,
      });

      if ('subscribe' in response) {
        throw new Error('Unexpected subscription result for a GraphQL query.');
      }

      if (response.errors) {
        throw { errors: response.errors };
      }

      const items = (response as any).data?.listGeminiUsageLogs?.items || [];
      return items as CostLogEntry[];
    } catch (error) {
      console.error('Failed to fetch cost logs:', error);
      throw error;
    }
  }
}

