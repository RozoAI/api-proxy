// Health Check Edge Function
// System health monitoring for all services
import '../shared/deno-types.ts';
import '../shared/deno-stdlib.d.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../shared/cors.ts';
import { PaymentDatabase } from '../shared/database.ts';
import { WithdrawalIntegration } from '../shared/withdrawal-integration.ts';

const db = new PaymentDatabase();
const withdrawalIntegration = new WithdrawalIntegration();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: 'Only GET requests are supported',
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check database health
    const dbHealthy = await checkDatabaseHealth();

    // Check withdrawal integration health
    const withdrawalHealth = await withdrawalIntegration.healthCheck();

    // Check provider health
    const providerHealth = await checkProviderHealth();

    const overallHealthy =
      dbHealthy &&
      (withdrawalHealth.status === 'healthy' || withdrawalHealth.status === 'disabled') &&
      (providerHealth.daimo === 'healthy' || providerHealth.aqua === 'healthy');

    const healthStatus = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: performance.now() / 1000, // Approximate uptime in seconds
      database: dbHealthy ? 'connected' : 'disconnected',
      withdrawal_integration: withdrawalHealth,
      providers: providerHealth,
      environment: {
        deno_version: Deno.version.deno,
        typescript_version: Deno.version.typescript,
      },
      supported_conversions: withdrawalIntegration.getSupportedConversions(),
    };

    return new Response(JSON.stringify(healthStatus, null, 2), {
      status: overallHealthy ? 200 : 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[HealthCheck] Error checking health:', error);

    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Try to get a payment count to test database connectivity
    const _payments = await db.getPaymentsByStatus('payment_completed', undefined);
    return true; // If we can query, database is healthy
  } catch (error) {
    console.error('[HealthCheck] Database health check failed:', error);
    return false;
  }
}

async function checkProviderHealth(): Promise<{ daimo: string; aqua: string }> {
  const results = { daimo: 'unknown', aqua: 'unknown' };

  // Check Daimo provider
  try {
    const daimoUrl = Deno.env.get('DAIMO_BASE_URL') || 'https://pay.daimo.com';
    const daimoKey = Deno.env.get('DAIMO_API_KEY');

    if (daimoKey) {
      const response = await fetch(`${daimoUrl}/health`, {
        headers: { 'Api-Key': daimoKey },
        signal: AbortSignal.timeout(5000),
      });
      results.daimo = response.ok ? 'healthy' : 'unhealthy';
    } else {
      results.daimo = 'not_configured';
    }
  } catch (error) {
    console.error('[HealthCheck] Daimo health check failed:', error);
    results.daimo = 'unhealthy';
  }

  // Check Aqua provider
  try {
    const aquaUrl = Deno.env.get('AQUA_BASE_URL') || 'https://api.aqua.network';
    const aquaToken = Deno.env.get('AQUA_API_TOKEN');

    if (aquaToken) {
      const response = await fetch(`${aquaUrl}/health`, {
        headers: { Authorization: `Bearer ${aquaToken}` },
        signal: AbortSignal.timeout(5000),
      });
      results.aqua = response.ok ? 'healthy' : 'unhealthy';
    } else {
      results.aqua = 'not_configured';
    }
  } catch (error) {
    console.error('[HealthCheck] Aqua health check failed:', error);
    results.aqua = 'unhealthy';
  }

  return results;
}
