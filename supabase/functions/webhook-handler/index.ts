// Webhook Handler Edge Function
// Original API Compatible: Handles both Daimo and Aqua webhooks
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../shared/cors.ts';
import { PaymentDatabase } from '../shared/database.ts';
import type { DaimoWebhookEvent, AquaWebhookEvent, PaymentStatus } from '../shared/types.ts';

const db = new PaymentDatabase();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
          message: 'Only POST requests are supported',
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');
    const token = url.searchParams.get('token');

    // Validate webhook token
    if (!token || !isValidWebhookToken(provider, token)) {
      console.warn(`[WebhookHandler] Invalid webhook token for provider: ${provider}`);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid webhook token',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const webhookData = await req.json();
    console.log(`[WebhookHandler] Received ${provider} webhook:`, JSON.stringify(webhookData));

    let result;

    if (provider === 'daimo') {
      result = await handleDaimoWebhook(webhookData as DaimoWebhookEvent);
    } else if (provider === 'aqua') {
      result = await handleAquaWebhook(webhookData as AquaWebhookEvent);
    } else {
      return new Response(
        JSON.stringify({
          error: 'Invalid provider',
          message: `Unsupported provider: ${provider}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[WebhookHandler] Error processing webhook:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to process webhook',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleDaimoWebhook(webhookData: DaimoWebhookEvent): Promise<any> {
  console.log(`[WebhookHandler] Processing Daimo webhook for payment: ${webhookData.paymentId}`);

  try {
    // Map Daimo webhook event types to our status
    const status = mapDaimoWebhookEventToStatus(webhookData.type);

    // Update payment status in database
    await db.updatePaymentStatus(webhookData.paymentId, status);

    // If payment is completed, trigger withdrawal integration
    if (status === 'payment_completed') {
      console.log(
        `[WebhookHandler] Payment completed, triggering withdrawal integration for: ${webhookData.paymentId}`
      );
      await triggerWithdrawalIntegration(webhookData.paymentId);
    }

    return {
      success: true,
      message: 'Daimo webhook processed successfully',
      paymentId: webhookData.paymentId,
      status: status,
      processed_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[WebhookHandler] Error processing Daimo webhook:`, error);
    throw error;
  }
}

async function handleAquaWebhook(webhookData: AquaWebhookEvent): Promise<any> {
  console.log(`[WebhookHandler] Processing Aqua webhook for invoice: ${webhookData.invoice_id}`);

  try {
    // Map Aqua status to our status
    const status = mapAquaStatusToPaymentStatus(webhookData.status);

    // Find payment by external_id (invoice_id) since Aqua uses invoice IDs
    const existingPayment = await db.getPaymentByExternalId(
      'aqua_invoice_' + webhookData.invoice_id
    );

    if (!existingPayment) {
      console.warn(`[WebhookHandler] No payment found for Aqua invoice: ${webhookData.invoice_id}`);
      return {
        success: false,
        message: 'Payment not found',
        invoice_id: webhookData.invoice_id,
      };
    }

    // Update payment status
    await db.updatePaymentStatus(existingPayment.id, status);

    // Update payment with transaction hash if provided
    if (webhookData.transaction_hash && status === 'payment_completed') {
      // You might want to update the provider_response with transaction details
      console.log(
        `[WebhookHandler] Transaction completed for ${webhookData.invoice_id}: ${webhookData.transaction_hash}`
      );
    }

    // If payment is completed, trigger withdrawal integration
    if (status === 'payment_completed') {
      console.log(
        `[WebhookHandler] Payment completed, triggering withdrawal integration for: ${existingPayment.id}`
      );
      await triggerWithdrawalIntegration(existingPayment.id);
    }

    return {
      success: true,
      message: 'Aqua webhook processed successfully',
      invoice_id: webhookData.invoice_id,
      payment_id: existingPayment.id,
      status: status,
      transaction_hash: webhookData.transaction_hash || null,
      processed_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[WebhookHandler] Error processing Aqua webhook:`, error);
    throw error;
  }
}

function mapDaimoWebhookEventToStatus(eventType: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    payment_started: 'payment_started',
    payment_completed: 'payment_completed',
    payment_bounced: 'payment_bounced',
    payment_refunded: 'payment_refunded',
  };

  return statusMap[eventType] || 'payment_unpaid';
}

function mapAquaStatusToPaymentStatus(aquaStatus: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    created: 'payment_unpaid',
    retry: 'payment_started',
    paid: 'payment_completed',
    failed: 'payment_bounced',
    deleted: 'payment_bounced',
  };

  return statusMap[aquaStatus] || 'payment_unpaid';
}

function isValidWebhookToken(provider: string | null, token: string): boolean {
  if (!provider || !token) return false;

  const expectedTokens: Record<string, string> = {
    daimo: Deno.env.get('DAIMO_WEBHOOK_TOKEN') || 'daimo-webhook-token',
    aqua: Deno.env.get('AQUA_WEBHOOK_TOKEN') || 'aqua-webhook-token',
  };

  return expectedTokens[provider] === token;
}

async function triggerWithdrawalIntegration(paymentId: string): Promise<void> {
  try {
    // Check if withdrawal integration is enabled
    const withdrawalApiUrl = Deno.env.get('WITHDRAWAL_API_BASE_URL');
    const withdrawalEnabled = Deno.env.get('WITHDRAWAL_INTEGRATION_ENABLED') === 'true';

    if (!withdrawalEnabled || !withdrawalApiUrl) {
      console.log(
        `[WebhookHandler] Withdrawal integration disabled or not configured for payment: ${paymentId}`
      );
      return;
    }

    // Get payment details
    const payment = await db.getPaymentById(paymentId);
    if (!payment) {
      console.error(`[WebhookHandler] Payment not found for withdrawal integration: ${paymentId}`);
      return;
    }

    // Only process withdrawals for specific currencies/tokens
    const supportedConversions = ['USDC', 'USDC_XLM', 'XLM']; // Based on original design
    const paymentCurrency = payment.original_request?.destination?.tokenSymbol || payment.currency;

    if (!supportedConversions.includes(paymentCurrency)) {
      console.log(
        `[WebhookHandler] Currency ${paymentCurrency} not supported for withdrawal, skipping: ${paymentId}`
      );
      return;
    }

    console.log('withdrawalApiUrl', withdrawalApiUrl);
    console.log('withdrawalApiToken', Deno.env.get('WITHDRAWAL_API_TOKEN'));

    // Trigger withdrawal integration
    const withdrawalResponse = await fetch(`${withdrawalApiUrl}/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('WITHDRAWAL_API_TOKEN') || ''}`,
      },
      body: JSON.stringify({
        amount: payment.amount,
        chain: payment.chain_id === '10001' ? 'base' : 'stellar',
        token: 'USDC',
      }),
    });

    if (!withdrawalResponse.ok) {
      throw new Error(`Withdrawal API error: ${withdrawalResponse.status}`);
    }

    if (!withdrawalResponse.ok) {
      const errorText = await withdrawalResponse.text();
      throw new Error(
        `Withdrawal API error ${withdrawalResponse.status}: ${errorText || 'Unknown error'}`
      );
    }

    const withdrawalText = await withdrawalResponse.text();
    const withdrawalResult = withdrawalText ? JSON.parse(withdrawalText) : {};
    console.log(
      `[WebhookHandler] Withdrawal integration triggered for ${paymentId}:`,
      withdrawalResult
    );

    // Optionally update payment with withdrawal ID
    if (withdrawalResult.withdraw_id) {
      // You might want to add a method to update withdraw_id in the database
      console.log(
        `[WebhookHandler] Withdrawal ID ${withdrawalResult.withdraw_id} created for payment ${paymentId}`
      );
    }
  } catch (error) {
    console.error(
      `[WebhookHandler] Failed to trigger withdrawal integration for ${paymentId}:`,
      error
    );
    // Don't throw - webhook processing should still succeed even if withdrawal fails
  }
}
