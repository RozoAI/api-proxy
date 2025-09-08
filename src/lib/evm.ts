import {
  Network,
  TokenMetadataResponse,
  TokenPriceByAddressResult,
} from "alchemy-sdk";
import { formatUnits, getAddress, hexToBigInt } from "viem";
import { alchemy } from "../server";
import { knownAlchemyTokens, knownTokens, Token } from "./token";

interface TokenBalance {
  id: string;
  network: Network;
  address: string;
  tokenBalance: string;
  tokenMetadata?: TokenMetadataResponse;
  tokenPrices?: TokenPriceByAddressResult;
  tokenAddress?: string;
  symbol?: string;
  name: string;
  chainId: number;
  balance: number;
  decimals?: number;
  logoURI?: string;
}

export interface GetWalletPaymentOptionsInput {
  payerAddress: string;
  usdRequired?: number;
  destChainId: number;
}

export async function getEvmTokensBalance({
  payerAddress,
  usdRequired,
  destChainId,
}: GetWalletPaymentOptionsInput) {
  // Handle empty or undefined usdRequired
  const normalizedUsdRequired = usdRequired || 0;
  const tokenMap = new Map(knownTokens.map((token) => [token.token, token]));
  const response = await alchemy.portfolio.getTokensByWallet([
    {
      address: payerAddress,
      networks: knownAlchemyTokens.map((token) => token.alchemyNetwork),
    },
  ]);

  const processedTokens = (response.data.tokens as TokenBalance[])
    .map((item) => {
      if (!item.tokenAddress) return null;

      const tokenAddress = getAddress(item.tokenAddress);
      const knownToken = tokenMap.get(tokenAddress);

      if (!knownToken) return null;

      const balanceBigInt = hexToBigInt(item.tokenBalance as `0x${string}`);
      const decimals =
        item.tokenMetadata?.decimals ?? knownToken.decimals ?? 18;
      const formattedBalance = formatUnits(balanceBigInt, decimals);
      const balanceValue = Number.parseFloat(
        Number.parseFloat(formattedBalance).toFixed(
          knownToken.decimals === 18 ? 5 : 2
        )
      );

      return createEvmPaymentOption(
        balanceValue,
        normalizedUsdRequired,
        knownToken,
        decimals
      );
    })
    .filter(Boolean)
    .sort((a, b) => {
      const balanceA = a?.balance?.usd || 0;
      const balanceB = b?.balance?.usd || 0;
      return balanceB - balanceA;
    });

  return processedTokens;
}

function createEvmPaymentOption(
  balanceValue: number,
  usdRequired: number,
  knownToken: Token,
  decimals: number
) {
  // Assume 1 USD = 1 token for stablecoins (USDC), adjust as needed for other tokens
  const usdPrice = knownToken.fiatISO === "USD" ? 1 : 1; // This should be dynamic based on actual price feeds
  const balanceUsd = balanceValue * usdPrice;

  // Calculate required amount in token units
  const requiredTokenAmount = Math.ceil(
    (usdRequired / usdPrice) * Math.pow(10, decimals)
  );
  const requiredUsd = usdRequired;

  // Calculate minimum required (assume 10 cents minimum)
  const minimumUsd = 0.1;
  const minimumTokenAmount = Math.ceil(
    (minimumUsd / usdPrice) * Math.pow(10, decimals)
  );

  // Calculate fees (assume no fees for now)
  const feesUsd = 0;
  const feesTokenAmount = "0";

  // Check if balance is sufficient
  const isBalanceSufficient = balanceUsd >= requiredUsd;
  const disabledReason = isBalanceSufficient
    ? undefined
    : `Balance too low: $${balanceUsd.toFixed(2)}`;

  // Create the token metadata object
  const tokenMetadata = {
    chainId: knownToken.chainId,
    token: knownToken.token,
    symbol: knownToken.symbol,
    usd: usdPrice,
    priceFromUsd: usdPrice,
    decimals: knownToken.decimals,
    displayDecimals: knownToken.decimals === 18 ? 5 : 2,
    logoSourceURI: knownToken.logoSourceURI,
    logoURI: knownToken.logoURI,
    maxAcceptUsd: isBalanceSufficient ? 100000 : 30000, // Different limits based on balance
    maxSendUsd: 0,
  };

  return {
    required: {
      token: tokenMetadata,
      amount: requiredTokenAmount.toString(),
      usd: requiredUsd,
    },
    balance: {
      token: tokenMetadata,
      amount: Math.floor(balanceValue * Math.pow(10, decimals)).toString(),
      usd: balanceUsd,
    },
    minimumRequired: {
      token: tokenMetadata,
      amount: minimumTokenAmount.toString(),
      usd: minimumUsd,
    },
    fees: {
      token: tokenMetadata,
      amount: feesTokenAmount,
      usd: feesUsd,
    },
    ...(disabledReason && { disabledReason }),
  };
}
