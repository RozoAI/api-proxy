// App Configuration Service
// Manages different application configurations for payout addresses and tokens
import type { AppConfig } from './types.ts';

export class AppConfigService {
  private static instance: AppConfigService;
  private appConfigs: Map<string, AppConfig>;

  private constructor() {
    this.appConfigs = new Map();
    this.initializeAppConfigs();
  }

  public static getInstance(): AppConfigService {
    if (!AppConfigService.instance) {
      AppConfigService.instance = new AppConfigService();
    }
    return AppConfigService.instance;
  }

  private initializeAppConfigs(): void {
    // Initialize with the provided app configurations
    const configs: AppConfig[] = [
      {
        appId: 'rozoDemoStellar',
        name: 'Rozo Demo Stellar',
        payoutToken: 'XLM',
        payoutAddress: 'GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ',
        payoutChainId: '10001', // Stellar chain ID
        enabled: true,
        description: 'Demo app with Stellar payout',
      },
      {
        appId: 'rozopayStellar',
        name: 'Rozo Pay Stellar',
        payoutToken: 'USDC_BASE',
        payoutAddress: '0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897',
        payoutChainId: '8453', // Base chain ID
        enabled: true,
        description: 'Production app with USDC Base payout',
      },
      {
        appId: 'rozoInvoiceStellar',
        name: 'Rozo Invoice Stellar',
        payoutToken: 'XLM',
        payoutAddress: 'GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ',
        payoutChainId: '10001', // Stellar chain ID
        enabled: true,
        description: 'Invoice app with Stellar payout',
      },
      {
        appId: 'rozoInvoice',
        name: 'Rozo Invoice',
        payoutToken: 'XLM',
        payoutAddress: 'GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ',
        payoutChainId: '10001', // Stellar chain ID
        enabled: true,
        description: 'Invoice app with Stellar payout',
      },
      {
        appId: 'rozoDemo',
        name: 'Rozo Demo',
        payoutToken: 'XLM',
        payoutAddress: 'GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ',
        payoutChainId: '10001', // Stellar chain ID
        enabled: true,
        description: 'Demo app with Stellar payout',
      },
      {
        appId: 'rozoTestStellar',
        name: 'Rozo Test Stellar',
        payoutToken: 'XLM',
        payoutAddress: 'GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ',
        payoutChainId: '10001', // Stellar chain ID
        enabled: true,
        description: 'Test app with Stellar payout (default)',
      },
      {
        appId: 'rozoTest',
        name: 'Rozo Test',
        payoutToken: 'XLM',
        payoutAddress: 'GC6XX3QMCPFE6WTCG6QQKRKT47UB6C53RPN4RA47IISEUC5N5CRANSIJ',
        payoutChainId: '10001', // Stellar chain ID
        enabled: true,
        description: 'Test app with Stellar payout (default)',
      },
    ];

    // Add all configurations to the map
    configs.forEach((config) => {
      this.appConfigs.set(config.appId, config);
    });
  }

  public getAppConfig(appId: string): AppConfig | null {
    return this.appConfigs.get(appId) || null;
  }

  public getDefaultAppConfig(): AppConfig {
    // Return rozoTestStellar as default
    return (
      this.appConfigs.get('rozoTestStellar') ||
      this.appConfigs.get('rozoTest') ||
      this.appConfigs.values().next().value!
    );
  }

  public getAllAppConfigs(): AppConfig[] {
    return Array.from(this.appConfigs.values());
  }

  public isAppEnabled(appId: string): boolean {
    const config = this.getAppConfig(appId);
    return config?.enabled || false;
  }

  public getPayoutAddress(appId: string): string | null {
    const config = this.getAppConfig(appId);
    return config?.payoutAddress || null;
  }

  public getPayoutToken(appId: string): string | null {
    const config = this.getAppConfig(appId);
    return config?.payoutToken || null;
  }

  public getPayoutChainId(appId: string): string | null {
    const config = this.getAppConfig(appId);
    return config?.payoutChainId || null;
  }

  public validateAppId(appId: string): boolean {
    return this.appConfigs.has(appId);
  }

  public getSupportedTokens(appId: string): string[] {
    const config = this.getAppConfig(appId);
    if (!config) return [];

    // Return supported tokens based on app configuration
    switch (config.payoutToken) {
      case 'USDC_XLM':
        return ['XLM', 'USDC_XLM'];
      case 'XLM':
        return ['XLM', 'USDC_XLM'];
      case 'USDC_BASE':
        return ['XLM', 'USDC_XLM']; // Pay-in tokens for USDC Base payout
      case 'USDC_SOLANA':
        return ['XLM', 'USDC_XLM']; // Pay-in tokens for USDC Solana payout
      default:
        return ['XLM', 'USDC_XLM'];
    }
  }
}
