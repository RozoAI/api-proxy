import { getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { solanaUSDC } from "./token";

const USDC_MINT = new PublicKey(solanaUSDC.token);

export interface GetSolanaPaymentOptionsInput {
  pubKey: string;
  usdRequired?: number;
}

export async function getSolanaPaymentOptions({
  pubKey,
  usdRequired,
}: GetSolanaPaymentOptionsInput) {
  // Handle empty or undefined usdRequired
  const normalizedUsdRequired = usdRequired || 0;

  try {
    // Derive ATA
    const ata = await getAssociatedTokenAddress(
      USDC_MINT,
      new PublicKey(pubKey)
    );

    const response = await fetch(
      `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "getTokenAccountBalance",
          params: [
            ata.toString(),
            {
              commitment: "confirmed",
            },
          ],
          id: 1,
        }),
      }
    );

    const body = (await response.json()) as any;

    // Handle RPC errors
    if (body.error) {
      console.log("RPC Error:", body.error);
      // If account doesn't exist, balance is 0
      if (
        body.error.code === -32602 ||
        body.error.message?.includes("could not find account")
      ) {
        return createPaymentOption(0, normalizedUsdRequired);
      }
      throw new Error(`RPC Error: ${body.error.message}`);
    }

    const balanceData = body.result?.value;
    if (!balanceData) {
      return createPaymentOption(0, normalizedUsdRequired);
    }

    // Convert balance from token units to decimal
    const balanceValue =
      Number.parseFloat(balanceData.amount) /
      Math.pow(10, balanceData.decimals);

    return createPaymentOption(balanceValue, normalizedUsdRequired);
  } catch (error) {
    console.error("Error fetching Solana payment options:", error);
    return createPaymentOption(0, normalizedUsdRequired);
  }
}

function createPaymentOption(balanceValue: number, usdRequired: number) {
  const decimals = solanaUSDC.decimals;
  const usdPrice = 1; // 1 USD = 1 USDC
  const balanceUsd = balanceValue * usdPrice;

  // Calculate amounts in token units
  const requiredTokenAmount = Math.ceil(usdRequired * Math.pow(10, decimals));
  const minimumTokenAmount = Math.ceil(0.1 * Math.pow(10, decimals)); // 10 cents minimum

  // Check if balance is sufficient
  const isBalanceSufficient = balanceUsd >= usdRequired;
  const disabledReason = isBalanceSufficient
    ? undefined
    : `Balance too low: $${balanceUsd.toFixed(2)}`;

  const tokenMetadata = {
    chainId: solanaUSDC.chainId,
    token: solanaUSDC.token,
    symbol: solanaUSDC.symbol,
    usd: usdPrice,
    priceFromUsd: usdPrice,
    decimals: solanaUSDC.decimals,
    displayDecimals: 2,
    logoSourceURI: solanaUSDC.logoSourceURI,
    logoURI: solanaUSDC.logoURI,
    maxAcceptUsd: isBalanceSufficient ? 100000 : 30000,
    maxSendUsd: 0,
  };

  return [
    {
      required: {
        token: tokenMetadata,
        amount: requiredTokenAmount.toString(),
        usd: usdRequired,
      },
      balance: {
        token: tokenMetadata,
        amount: Math.floor(balanceValue * Math.pow(10, decimals)).toString(),
        usd: Number(balanceUsd.toFixed(2)),
      },
      minimumRequired: {
        token: tokenMetadata,
        amount: minimumTokenAmount.toString(),
        usd: 0.1,
      },
      fees: {
        token: tokenMetadata,
        amount: "0",
        usd: 0,
      },
      ...(disabledReason && { disabledReason }),
    },
  ];
}
