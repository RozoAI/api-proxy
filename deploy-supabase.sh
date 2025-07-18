#!/bin/bash

# Supabase Deployment Script
# Deploys the Payment API Proxy to Supabase Edge Functions

set -e

echo "🚀 Deploying Payment API Proxy to Supabase..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Please login to Supabase first:"
    echo "   supabase login"
    exit 1
fi

echo "📦 Linking to Supabase project..."
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "Please enter your Supabase project reference ID:"
    read -r SUPABASE_PROJECT_REF
fi

supabase link --project-ref "$SUPABASE_PROJECT_REF"

echo "🗄️  Deploying database migrations..."
supabase db push

echo "⚙️  Setting up environment secrets..."
echo "Please set up the following secrets in your Supabase dashboard:"
echo ""
echo "Required secrets:"
echo "- DAIMO_API_KEY=your-daimo-api-key"
echo "- DAIMO_BASE_URL=https://pay.daimo.com"
echo "- AQUA_BASE_URL=https://api.aqua.network"
echo "- AQUA_API_TOKEN=your-aqua-api-token"
echo "- AQUA_WEBHOOK_TOKEN=your-aqua-webhook-token"
echo "- WITHDRAWAL_API_BASE_URL=https://jejdgfzaulaqllyibiyk.supabase.co"
echo "- WITHDRAWAL_API_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "- WITHDRAWAL_INTEGRATION_ENABLED=true"
echo ""
echo "You can set these via the dashboard or CLI:"
echo "supabase secrets set DAIMO_API_KEY=your-key"
echo ""

read -p "Press Enter after setting up secrets to continue..."

echo "🔧 Deploying Edge Functions..."

echo "  📡 Deploying payment-api function..."
supabase functions deploy payment-api

echo "  🪝 Deploying webhook-handler function..."
supabase functions deploy webhook-handler

echo "  ❤️  Deploying health-check function..."
supabase functions deploy health-check

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your API endpoints:"
echo "   Payment API: https://$SUPABASE_PROJECT_REF.supabase.co/functions/v1/payment-api"
echo "   Webhook Handler: https://$SUPABASE_PROJECT_REF.supabase.co/functions/v1/webhook-handler"
echo "   Health Check: https://$SUPABASE_PROJECT_REF.supabase.co/functions/v1/health-check"
echo ""
echo "🧪 Test your deployment:"
echo "   curl https://$SUPABASE_PROJECT_REF.supabase.co/functions/v1/health-check"
echo ""
echo "📚 Next steps:"
echo "   1. Test the health check endpoint"
echo "   2. Test payment creation"
echo "   3. Configure webhook URLs in your providers"
echo "   4. Monitor function logs: supabase functions logs --follow"
echo ""
echo "🎉 Happy payments processing!" 