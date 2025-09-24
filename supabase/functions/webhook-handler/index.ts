/// <reference lib="deno.ns" />

// Webhook Handler Edge Function
// Original API Compatible: Handles both Daimo and Aqua webhooks
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../shared/cors.ts';
import { PaymentDatabase } from '../shared/database.ts';
import type {
  AquaWebhookEvent,
  DaimoWebhookEvent,
  PaymentManagerWebhookEvent,
  PaymentStatus,
} from '../shared/types.ts';

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
    } else if (provider === 'payment-manager') {
      result = await handlePaymentManagerWebhook(webhookData as PaymentManagerWebhookEvent);
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
    if (!payment) {
      console.warn(`[WebhookHandler] No payment found for Daimo payment: ${externalId}`);
      return {
        success: false,
        message: 'Payment not found',
        paymentId: externalId,
      };
    }

    // Update payment status and transaction details
    await db.updatePaymentStatus(externalId, status, {
      source_address: webhookData.payment.source?.payerAddress,
      source_tx_hash: webhookData.txHash,
      provider_response: webhookData,
    });

    // If payment is completed, trigger withdrawal integration
    if (status === 'payment_completed') {
      console.log(
        `[WebhookHandler] Payment completed, triggering withdrawal integration for: ${payment.id}`
      );
      await triggerWithdrawalIntegration(payment.id);
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

async function handlePaymentManagerWebhook(webhookData: PaymentManagerWebhookEvent): Promise<any> {
  console.log(
    `[WebhookHandler] Processing Payment Manager webhook for payment: ${webhookData.payment.id}`
  );

  try {
    // Only process UPDATE events
    // if (webhookData.event !== 'UPDATE') {
    //   console.log('[WebhookHandler] Ignoring non-UPDATE event for payment-manager');
    //   return { success: true, ignored: true };
    // }

    // Determine external reference to locate the payment
    const externalRef = webhookData.payment.externalId || webhookData.payment.id;

    // Map Payment Manager status to our status
    const status = mapPaymentManagerStatusToPaymentStatus(webhookData.payment.status);

    // Find payment by external_id (matches provider payment id saved on creation)
    const existingPayment = await db.getPaymentByExternalId(externalRef);

    if (!existingPayment) {
      console.warn(
        `[WebhookHandler] No payment found for Payment Manager payment using ref: ${externalRef}`
      );
      return {
        success: false,
        message: 'Payment not found',
        paymentId: externalRef,
      };
    }

    // Update payment status and transaction details
    await db.updatePaymentStatus(externalRef, status, {
      provider: 'payment-manager',
      webhookData: webhookData,
    });

    // Get payment data to extract information for rozorewards API
    const payment = await db.getPaymentByExternalId(externalRef);
    if (payment && payment.original_request) {
      try {
        const originalRequest = payment.original_request;
        const metadata = originalRequest.metadata || {};
        const display = originalRequest.display || {};

        // Extract required fields
        const amountLocal = metadata.amount_local;
        const currencyLocal = metadata.currency_local;
        const priceCurrency = display.currency || 'USD';
        const priceAmount = display.paymentValue || originalRequest.amount || payment.amount;
        const orderId = payment.id;
        const merchantOrderId = payment.id; // Use payment.id as merchant_order_id since order_id doesn't exist

        // Get evm address from metadata
        const evmAddress = webhookData.payment.metadata?.from_address;

        // Extract handle from appId (format: "rozoRewards-zen")
        const appId = originalRequest.appId || '';
        const toHandle = appId.includes('-') ? appId.split('-')[1] : metadata.to_handle;

        if (payment.status === 'payment_completed') {

          /**
           * Dynamic callback URL
           */
          const isRewards = priceCurrency === 'USD' && appId.includes('rozoRewards') && toHandle;

          if (payment.callback_url || isRewards) {
            const txHash =
              'transaction_hash' in webhookData.payment.metadata
                ? webhookData.payment.metadata.transaction_hash
                : null;
            const chainId =
              'payinchainid' in webhookData.payment ? webhookData.payment.payinchainid : null;
            const tokenAddress =
              'payintokenaddress' in webhookData.payment
                ? webhookData.payment.payintokenaddress
                : null;

            // Extract merchantToken from metadata if provided
            const merchantToken = metadata.merchantToken || null;
            
            // Prepare Rozo App API payload
            let callbackUrl = payment.callback_url;
            let payload = {
              type: 'payment_completed',
              paymentId: orderId,
              metadata,
              merchantToken, // Include merchant token for verification
              payment: {
                externalId: externalRef,
                source: {
                  payerAddress: evmAddress,
                  txHash: txHash,
                  chainId: chainId,
                  amountUnits: priceAmount,
                  tokenSymbol: priceCurrency,
                  tokenAddress: tokenAddress,
                },
              },
            };
            if (isRewards) {
              callbackUrl = `${Deno.env.get('ROZOREWARD_API')}/rozorewards`;
              payload = {
                status: 'PAID',
                price_amount: parseFloat(priceAmount),
                price_currency: priceCurrency,
                amount_local: amountLocal,
                currency_local: currencyLocal,
                to_handle: toHandle,
                rozoreward_token: Deno.env.get('ROZOREWARD_TOKEN'),
                order_id: orderId,
                merchant_order_id: merchantOrderId,
                evm_address: evmAddress,
              };
            }

            console.log('[RozoApp-WebhookHandler] Sending to API:', {
              paymentId: externalRef,
              appId,
              payload,
            });

            // Make POST request to Rozo App API
            const response = await fetch(callbackUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              console.error('[RozoApp-WebhookHandler] Failed to send to API:', {
                status: response.status,
                statusText: response.statusText,
                paymentId: externalRef,
              });
            } else {
              const responseData = await response.json();
              console.log('[RozoApp-WebhookHandler] Successfully sent to API:', {
                paymentId: externalRef,
                response: responseData,
              });
            }
          }
        }
      } catch (error) {
        console.error('[WebhookHandler] Error sending to API:', {
          paymentId: externalRef,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Note: No withdrawal integration for Payment Manager as requested
    console.log(
      `[WebhookHandler] Payment Manager webhook processed successfully for payment: ${externalRef}`
    );

    return {
      success: true,
      message: 'Payment Manager webhook processed successfully',
      paymentId: externalRef,
      status: status,
      url: webhookData.url,
      processed_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[WebhookHandler] Error processing Payment Manager webhook:`, error);
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

function mapPaymentManagerStatusToPaymentStatus(paymentManagerStatus: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    payment_unpaid: 'payment_unpaid',
    payment_started: 'payment_started',
    payment_completed: 'payment_completed',
    payment_bounced: 'payment_bounced',
    payment_refunded: 'payment_refunded',
  };

  return statusMap[paymentManagerStatus] || 'payment_unpaid';
}

function isValidWebhookToken(provider: string | null, token: string): boolean {
  if (!provider || !token) return false;

  const expectedTokens: Record<string, string> = {
    daimo: Deno.env.get('DAIMO_WEBHOOK_TOKEN') || 'daimo-webhook-token',
    aqua: Deno.env.get('AQUA_WEBHOOK_TOKEN') || 'aqua-webhook-token',
    'payment-manager':
      Deno.env.get('PAYMENT_MANAGER_WEBHOOK_TOKEN') || 'payment-manager-webhook-token',
  };

  return expectedTokens[provider] === token;
}

async function triggerWithdrawalIntegration(paymentId: string): Promise<void> {
  // Check if withdrawal integration is enabled
  const withdrawalEnabled = Deno.env.get('WITHDRAWAL_INTEGRATION_ENABLED') === 'true';
  if (!withdrawalEnabled) {
    console.log(`[WebhookHandler] Withdrawal integration disabled for payment: ${paymentId}`);
    return;
  }

  try {
    // Import withdrawal integration dynamically to avoid circular dependencies
    const { WithdrawalIntegration } = await import('../shared/withdrawal-integration.ts');
    const withdrawalIntegration = new WithdrawalIntegration();

    // Get payment details
    const payment = await db.getPaymentById(paymentId);
    if (!payment) {
      console.error(`[WebhookHandler] Payment not found for withdrawal: ${paymentId}`);
      return;
    }

    // Trigger withdrawal
    await withdrawalIntegration.handlePaymentCompletion(payment);
  } catch (error) {
    console.error(`[WebhookHandler] Error triggering withdrawal integration:`, error);
    // Don't throw - we don't want to fail the webhook
  }
}
