import { getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { solanaSOL, solanaUSDC } from "./token";

const USDC_MINT = new PublicKey(solanaUSDC.token);

export interface GetSolanaPaymentOptionsInput {
  pubKey: string;
  usdRequired?: number;
}

async function getSolPrice(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const data = (await response.json()) as { solana?: { usd?: number } };
    return data.solana?.usd || 150; // Fallback to 150 if API fails
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    return 150; // Fallback price
  }
}

async function getSolBalance(pubKey: string): Promise<number> {
  try {
    const response = await fetch(
      `https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "getBalance",
          params: [
            pubKey,
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
      console.log("SOL Balance RPC Error:", body.error);
      return 0;
    }

    const balanceValue = body.result?.value || 0;
    // Convert from lamports to SOL (1 SOL = 10^9 lamports)
    return balanceValue / Math.pow(10, 9);
  } catch (error) {
    console.error("Error fetching SOL balance:", error);
    return 0;
  }
}

async function getUSDCBalance(pubKey: string): Promise<number> {
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
      console.log("USDC Balance RPC Error:", body.error);
      // If account doesn't exist, balance is 0
      if (
        body.error.code === -32602 ||
        body.error.message?.includes("could not find account")
      ) {
        return 0;
      }
      return 0;
    }

    const balanceData = body.result?.value;
    if (!balanceData) {
      return 0;
    }

    // Convert balance from token units to decimal
    return (
      Number.parseFloat(balanceData.amount) / Math.pow(10, balanceData.decimals)
    );
  } catch (error) {
    console.error("Error fetching USDC balance:", error);
    return 0;
  }
}

export async function getSolanaPaymentOptions({
  pubKey,
  usdRequired,
}: GetSolanaPaymentOptionsInput) {
  // Handle empty or undefined usdRequired
  const normalizedUsdRequired = usdRequired || 0;

  try {
    // Fetch balances and SOL price in parallel
    const [solBalance, usdcBalance, solPrice] = await Promise.all([
      getSolBalance(pubKey),
      getUSDCBalance(pubKey),
      getSolPrice(),
    ]);

    // Create payment options for both tokens
    const usdcOptions = createPaymentOption(
      usdcBalance,
      normalizedUsdRequired,
      solanaUSDC,
      1 // USDC price is always 1
    );
    const solOptions = createPaymentOption(
      solBalance,
      normalizedUsdRequired,
      solanaSOL,
      solPrice
    );

    // Return combined options
    return [...usdcOptions, ...solOptions];
  } catch (error) {
    console.error("Error fetching Solana payment options:", error);
    // Return default options with 0 balance
    const usdcOptions = createPaymentOption(
      0,
      normalizedUsdRequired,
      solanaUSDC,
      1
    );
    const solOptions = createPaymentOption(
      0,
      normalizedUsdRequired,
      solanaSOL,
      150
    );
    return [...usdcOptions, ...solOptions];
  }
}

function createPaymentOption(
  balanceValue: number,
  usdRequired: number,
  tokenConfig: typeof solanaUSDC | typeof solanaSOL,
  usdPrice: number
) {
  const decimals = tokenConfig.decimals;
  const balanceUsd = balanceValue * usdPrice;

  // Calculate amounts in token units
  const requiredTokenAmount = Math.ceil(
    (usdRequired / usdPrice) * Math.pow(10, decimals)
  );
  const minimumTokenAmount = Math.ceil(
    (0.1 / usdPrice) * Math.pow(10, decimals)
  ); // 10 cents minimum

  // Check if balance is sufficient
  const isBalanceSufficient = balanceUsd >= usdRequired;
  const disabledReason = isBalanceSufficient
    ? undefined
    : `Balance too low: $${balanceUsd.toFixed(2)}`;

  const tokenMetadata = {
    chainId: tokenConfig.chainId,
    token: tokenConfig.token,
    symbol: tokenConfig.symbol,
    usd: usdPrice,
    priceFromUsd: 1 / usdPrice,
    decimals: tokenConfig.decimals,
    displayDecimals: tokenConfig.symbol === "USDC" ? 2 : 4,
    logoSourceURI: tokenConfig.logoSourceURI,
    logoURI: tokenConfig.logoURI,
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
