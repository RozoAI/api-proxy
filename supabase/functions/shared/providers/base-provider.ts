// Base Provider for Edge Functions
// Migrated from original Express.js architecture
import type { PaymentRequest, PaymentResponse, ProviderConfig, ProviderHealth } from '../types.ts';

export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract createPayment(paymentData: PaymentRequest): Promise<PaymentResponse>;
  abstract getPayment(paymentId: string): Promise<PaymentResponse>;
  abstract healthCheck(): Promise<ProviderHealth>;

  protected async makeRequest(
    url: string,
    options: any,
    timeout: number = this.config.timeout || 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  protected logRequest(method: string, url: string, data?: any): void {
    console.log(`[${this.config.name}] ${method} ${url}`, data ? JSON.stringify(data) : '');
  }

  protected logResponse(response: Response, data?: any): void {
    console.log(
      `[${this.config.name}] Response ${response.status}`,
      data ? JSON.stringify(data) : ''
    );
  }

  protected logError(error: Error, context?: string): void {
    console.error(`[${this.config.name}] Error${context ? ` in ${context}` : ''}:`, error.message);
  }

  getName(): string {
    return this.config.name;
  }

  isEnabled(): boolean {
    return this.config.enabled ?? true;
  }

  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  getTimeout(): number {
    return this.config.timeout || 30000;
  }
}
