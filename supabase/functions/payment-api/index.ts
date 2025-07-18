// Payment API Edge Function
// Handles payment creation and retrieval - Original API Compatible
import '../shared/deno-types.ts';
import '../shared/deno-stdlib.d.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../shared/cors.ts';
import { PaymentService } from '../shared/payment-service.ts';
import type { PaymentRequest } from '../shared/types.ts';

const paymentService = new PaymentService();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Route based on HTTP method and path - Original API Format
    if (req.method === 'POST' && path === '/') {
      // POST /api/payment - Create payment
      const paymentData: PaymentRequest = await req.json();
      return await handleCreatePayment(paymentData);
    } else if (req.method === 'GET' && path.startsWith('/')) {
      // GET /api/payment/:id or /api/payment/external-id/:id
      const pathParts = path.split('/').filter((p) => p);

      if (pathParts.length === 1) {
        // GET /api/payment/:id
        return await handleGetPayment(pathParts[0]);
      } else if (pathParts.length === 2 && pathParts[0] === 'external-id') {
        // GET /api/payment/external-id/:id
        return await handleGetPaymentByExternalId(pathParts[1]);
      }
    }

    // Invalid endpoint
    return new Response(
      JSON.stringify({
        error: 'Not found',
        message: 'Invalid endpoint or method',
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[PaymentAPI] Error processing request:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleCreatePayment(paymentData: PaymentRequest): Promise<Response> {
  try {
    const paymentResponse = await paymentService.createPayment(paymentData);

    return new Response(JSON.stringify(paymentResponse), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PaymentAPI] Error creating payment:', error);

    return new Response(
      JSON.stringify({
        error: 'Payment creation failed',
        message: error instanceof Error ? error.message : 'Failed to create payment',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleGetPayment(paymentId: string): Promise<Response> {
  try {
    const paymentResponse = await paymentService.getPaymentById(paymentId);

    return new Response(JSON.stringify(paymentResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PaymentAPI] Error getting payment:', error);

    const statusCode = error instanceof Error && error.message === 'Payment not found' ? 404 : 500;

    return new Response(
      JSON.stringify({
        error: statusCode === 404 ? 'Payment not found' : 'Payment retrieval failed',
        message: error instanceof Error ? error.message : 'Failed to retrieve payment',
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleGetPaymentByExternalId(externalId: string): Promise<Response> {
  try {
    const paymentResponse = await paymentService.getPaymentByExternalId(externalId);

    return new Response(JSON.stringify(paymentResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[PaymentAPI] Error getting payment by external ID:', error);

    const statusCode = error instanceof Error && error.message === 'Payment not found' ? 404 : 500;

    return new Response(
      JSON.stringify({
        error: statusCode === 404 ? 'Payment not found' : 'Payment retrieval failed',
        message: error instanceof Error ? error.message : 'Failed to retrieve payment',
        details: {
          externalId: externalId,
          code: statusCode === 404 ? 'EXTERNAL_ID_NOT_FOUND' : 'INTERNAL_ERROR',
        },
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
