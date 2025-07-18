// Health Check Edge Function
// Original API Compatible: GET /health
import '../shared/deno-types.ts';
import '../shared/deno-stdlib.d.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../shared/cors.ts';
import { PaymentDatabase } from '../shared/database.ts';

const db = new PaymentDatabase();

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

    const startTime = performance.now();

    // Check database health
    const dbHealthy = await checkDatabaseHealth();

    // Check provider health
    const providerHealth = await checkProviderHealth();

    // Check withdrawal integration health
    const withdrawalHealth = await checkWithdrawalHealth();

    const responseTime = Math.round(performance.now() - startTime);
    const overallHealthy =
      dbHealthy &&
      providerHealth.daimo.healthy &&
      providerHealth.aqua.healthy &&
      withdrawalHealth.healthy;

    const healthStatus = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(performance.now() / 1000), // seconds since function start
      version: '1.0.0',
      environment: {
        deno_version: Deno.version.deno,
        typescript_version: Deno.version.typescript,
      },
      providers: {
        daimo: {
          status: providerHealth.daimo.healthy ? 'healthy' : 'unhealthy',
          responseTime: providerHealth.daimo.responseTime,
          lastCheck: new Date().toISOString(),
        },
        aqua: {
          status: providerHealth.aqua.healthy ? 'healthy' : 'unhealthy',
          responseTime: providerHealth.aqua.responseTime,
          lastCheck: new Date().toISOString(),
        },
      },
      database: {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        responseTime: responseTime,
        connectionPool: {
          active: 1, // Supabase manages connections
          idle: 0,
          total: 1,
        },
      },
      withdrawal_integration: {
        status: withdrawalHealth.healthy ? 'healthy' : 'unhealthy',
        enabled: withdrawalHealth.enabled,
        supportedConversions: ['USDC', 'USDC_XLM', 'XLM'], // Static list matching original implementation,
      },
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
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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

async function checkProviderHealth(): Promise<{
  daimo: { healthy: boolean; responseTime: number };
  aqua: { healthy: boolean; responseTime: number };
}> {
  const daimoUrl = Deno.env.get('DAIMO_BASE_URL') || 'https://pay.daimo.com';
  const daimoKey = Deno.env.get('DAIMO_API_KEY');

  // Check Daimo health
  let daimoHealthy = false;
  let daimoResponseTime = 0;

  try {
    const startTime = performance.now();
    const response = await fetch(`${daimoUrl}/health`, {
      method: 'GET',
      headers: daimoKey ? { 'Api-Key': daimoKey } : {},
    });
    daimoResponseTime = Math.round(performance.now() - startTime);
    daimoHealthy = response.ok;
  } catch (error) {
    console.error('[HealthCheck] Daimo health check failed:', error);
    daimoResponseTime = 30000; // Timeout value
  }

  // Check Aqua health
  const aquaUrl = Deno.env.get('AQUA_BASE_URL') || 'https://api.aqua.network';
  const aquaToken = Deno.env.get('AQUA_API_TOKEN');

  let aquaHealthy = false;
  let aquaResponseTime = 0;

  try {
    const startTime = performance.now();
    const response = await fetch(`${aquaUrl}/health`, {
      method: 'GET',
      headers: aquaToken ? { Authorization: `Bearer ${aquaToken}` } : {},
    });
    aquaResponseTime = Math.round(performance.now() - startTime);
    aquaHealthy = response.ok;
  } catch (error) {
    console.error('[HealthCheck] Aqua health check failed:', error);
    aquaResponseTime = 30000; // Timeout value
  }

  return {
    daimo: { healthy: daimoHealthy, responseTime: daimoResponseTime },
    aqua: { healthy: aquaHealthy, responseTime: aquaResponseTime },
  };
}

async function checkWithdrawalHealth(): Promise<{ healthy: boolean; enabled: boolean }> {
  try {
    const enabled = Deno.env.get('WITHDRAWAL_INTEGRATION_ENABLED') === 'true';
    if (!enabled) {
      return { healthy: true, enabled: false };
    }

    // If enabled, try a simple API connectivity test
    const apiUrl = Deno.env.get('WITHDRAWAL_API_URL');
    if (!apiUrl) {
      return { healthy: false, enabled: true };
    }

    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return { healthy: response.ok, enabled: true };
  } catch (error) {
    console.error('[HealthCheck] Withdrawal integration health check failed:', error);
    return { healthy: false, enabled: true };
  }
}
