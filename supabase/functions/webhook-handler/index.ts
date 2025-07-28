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
  const externalId = webhookData.payment.externalId || webhookData.paymentId;
  console.log(`[WebhookHandler] Processing Daimo webhook for payment: ${externalId}`);

  try {
    // Map Daimo webhook event types to our status
    const status = mapDaimoWebhookEventToStatus(webhookData.type);

    const payment = await db.getPaymentByExternalId(externalId);

    // Update payment status in database
    await db.updatePaymentStatus(externalId, status);

    // If payment is completed, save source transaction details and trigger withdrawal
    if (status === 'payment_completed' && webhookData.payment) {
      // Extract source transaction details from Daimo webhook
      const sourceAddress = webhookData.payment.source?.payerAddress;
      const sourceTxHash = webhookData.payment.source?.txHash;

      // Save source transaction details if available
      if (sourceAddress && sourceTxHash) {
        console.log(
          `[WebhookHandler] Saving source transaction details for payment: ${externalId}`
        );
        await db.updatePaymentSourceDetails(externalId, sourceAddress, sourceTxHash);
      }

      // Trigger withdrawal integration if not already completed
      if (payment && payment?.status !== 'payment_completed') {
        console.log(
          `[WebhookHandler] Payment completed, triggering withdrawal integration for: ${externalId}`
        );
        await triggerWithdrawalIntegration(externalId);
      }
    }

    return {
      success: true,
      message: 'Daimo webhook processed successfully',
      paymentId: externalId,
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
    await db.updatePaymentStatus('aqua_invoice_' + webhookData.invoice_id, status);

    // If payment is completed, save source transaction details and trigger withdrawal
    if (status === 'payment_completed') {
      // Extract source transaction details from Aqua webhook
      const sourceAddress = webhookData.from; // Payer's address
      const sourceTxHash = webhookData.transaction_hash; // Transaction hash

      // Save source transaction details if available
      if (sourceAddress && sourceTxHash) {
        console.log(
          `[WebhookHandler] Saving Aqua source transaction details for invoice: ${webhookData.invoice_id}`
        );
        await db.updatePaymentSourceDetails(
          'aqua_invoice_' + webhookData.invoice_id,
          sourceAddress,
          sourceTxHash
        );
      }

      // Trigger withdrawal integration
      console.log(
        `[WebhookHandler] Payment completed, triggering withdrawal integration for: ${existingPayment.id}`
      );

      if (existingPayment && existingPayment?.status !== 'payment_completed') {
        await triggerWithdrawalIntegration('aqua_invoice_' + webhookData.invoice_id);
      }
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
    const payment = await db.getPaymentByExternalId(paymentId);
    if (!payment) {
      console.error(`[WebhookHandler] Payment not found for withdrawal integration: ${paymentId}`);
      return;
    }

    // Check if this payment has USDC_XLM destination stored in metadata
    let withdrawalDestination: any = null;
    let isUSDCXLMWithdrawal = false;

    try {
      // Try to parse withdrawal destination from metadata
      const metadata = payment.metadata || {};
      if (metadata.withdrawal_destination) {
        withdrawalDestination = metadata.withdrawal_destination;
        isUSDCXLMWithdrawal =
          withdrawalDestination.isUSDCXLM === true ||
          withdrawalDestination.tokenSymbol === 'USDC_XLM';
      }
    } catch (error) {
      console.log(
        `[WebhookHandler] Could not parse withdrawal destination for ${paymentId}:`,
        error
      );
    }

    // Only process withdrawals for specific currencies/tokens or XLM conversions
    const supportedConversions = ['USDC', 'USDC_XLM', 'XLM']; // Based on original design
    const paymentCurrency = payment.original_request?.destination?.tokenSymbol || payment.currency;

    if (!supportedConversions.includes(paymentCurrency) && !isUSDCXLMWithdrawal) {
      console.log(
        `[WebhookHandler] Currency ${paymentCurrency} not supported for withdrawal, skipping: ${paymentId}`
      );
      return;
    }

    // Determine withdrawal details based on whether this is XLM conversion
    let withdrawalPayload: any;

    if (isUSDCXLMWithdrawal && withdrawalDestination) {
      console.log(
        `[WebhookHandler] Processing USDC_XLM withdrawal to Stellar address: ${withdrawalDestination.address}`
      );

      withdrawalPayload = {
        amount: payment.amount,
        to_address: withdrawalDestination.address, // Original Stellar address
        chain: 'stellar',
        token: 'USDC', // Convert back to XLM on Stellar
      };
    } else {
      // Regular withdrawal (non-XLM)
      withdrawalPayload = {
        amount: payment.amount,
        to_address: withdrawalDestination.address, // Original Stellar address
        chain: withdrawalDestination.chainId === '8453' ? 'base' : 'stellar',
        token: 'USDC',
      };
    }

    console.log('withdrawalApiUrl', withdrawalApiUrl);
    console.log('withdrawalApiToken', Deno.env.get('WITHDRAWAL_API_TOKEN'));
    console.log('withdrawalPayload', withdrawalPayload);

    // Trigger withdrawal integration
    const withdrawalResponse = await fetch(`${withdrawalApiUrl}/functions/v1/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('WITHDRAWAL_API_TOKEN') || ''}`,
      },
      body: JSON.stringify(withdrawalPayload),
    });

    if (!withdrawalResponse.ok) {
      console.log('withdrawalResponse', withdrawalResponse.statusText);
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

    // Save withdrawal transaction details if available
    if (withdrawalResult.success && withdrawalResult.data) {
      const withdrawId = withdrawalResult.data.withdraw_id;
      const transactionHash = withdrawalResult.data.transaction_hash;

      if (transactionHash) {
        console.log(
          `[WebhookHandler] Saving withdrawal transaction hash for payment ${paymentId}: ${transactionHash}`
        );
        await db.updatePaymentWithdrawalTxHash(paymentId, transactionHash, withdrawId);
      } else if (withdrawId) {
        // Save withdrawal ID even if transaction hash is not available yet
        console.log(
          `[WebhookHandler] Saving withdrawal ID for payment ${paymentId}: ${withdrawId}`
        );
        await db.updatePaymentWithWithdrawId(paymentId, withdrawId);
      }
    } else if (withdrawalResult.withdraw_id) {
      // Fallback for older response format
      console.log(
        `[WebhookHandler] Withdrawal ID ${withdrawalResult.withdraw_id} created for payment ${paymentId}`
      );
      await db.updatePaymentWithWithdrawId(paymentId, withdrawalResult.withdraw_id);
    }
  } catch (error) {
    console.error(
      `[WebhookHandler] Failed to trigger withdrawal integration for ${paymentId}:`,
      error
    );
    // Don't throw - webhook processing should still succeed even if withdrawal fails
  }
}
