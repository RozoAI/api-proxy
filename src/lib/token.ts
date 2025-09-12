import { Network } from "alchemy-sdk";
import { getAddress } from "viem";
import { arbitrum, base, bsc, polygon, solana, token } from "./chain";

export type Token = {
  /** Chain ID, eg 10 for OP Mainnet */
  chainId: number;
  /** Ethereum (capitalized) or Solana token address */
  token: `0x${string}` | string;
  /** Name, eg "Wrapped Bitcoin" */
  name?: string;
  /** Symbol, eg "WBTC" */
  symbol: string;
  /** Token decimals, eg 8 for WBTC */
  decimals: number;
  /** Fiat ISO code for stablecoins, eg "USD" or "EUR" */
  fiatISO?: string;
  /** Logo preview data URI. Generally SVG or 64x64 PNG. */
  logoURI: TokenLogo | string;
  /** Original source image URL. */
  logoSourceURI: string;
  /** Alchemy network, eg "ETH_MAINNET" */
  alchemyNetwork: Network;
};

export enum TokenLogo {
  USDC = "https://pay.daimo.com/coin-logos/usdc.png",
  USDT = "https://pay.daimo.com/coin-logos/usdt.png",
}

/* --------------------- Tokens Constants --------------------- */

//
// Base Mainnet
//

export const baseUSDC: Token = token({
  chainId: base.chainId,
  token: getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
  name: "USD Coin",
  symbol: "USDC",
  fiatISO: "USD",
  decimals: 6,
  logoURI: TokenLogo.USDC,
  alchemyNetwork: base.alchemyNetwork,
});
const baseTokens: Token[] = [baseUSDC];

//
// Polygon
//

export const polygonUSDC: Token = token({
  chainId: polygon.chainId,
  token: getAddress("0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
  alchemyNetwork: polygon.alchemyNetwork,
});

const polygonTokens: Token[] = [polygonUSDC];

//
// Arbitrum
//

export const arbitrumUSDC: Token = token({
  chainId: arbitrum.chainId,
  token: getAddress("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
  alchemyNetwork: arbitrum.alchemyNetwork,
});

const arbitrumTokens: Token[] = [arbitrumUSDC];

//
// Solana
//

export const solanaUSDC: Token = token({
  chainId: solana.chainId,
  token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
  alchemyNetwork: solana.alchemyNetwork,
});

export const solanaSOL: Token = token({
  chainId: solana.chainId,
  token: "11111111111111111111111111111112", // System Program (native SOL)
  decimals: 9,
  name: "Solana",
  symbol: "SOL",
  logoURI: "https://pay.daimo.com/coin-logos/sol.png",
  alchemyNetwork: solana.alchemyNetwork,
});

const solanaTokens: Token[] = [solanaUSDC, solanaSOL];

//
// BNB Smart Chain
//

export const bscUSDT: Token = token({
  chainId: bsc.chainId,
  token: getAddress("0x55d398326f99059fF775485246999027B3197955"),
  decimals: 18,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
  alchemyNetwork: bsc.alchemyNetwork,
});

const bscTokens: Token[] = [bscUSDT];

const knownTokensByChain = new Map<number, Token[]>([
  [base.chainId, baseTokens],
  [polygon.chainId, polygonTokens],
  [arbitrum.chainId, arbitrumTokens],
  [solana.chainId, solanaTokens],
  [bsc.chainId, bscTokens],
]);

export const knownTokensByAlchemyNetwork = new Map<Network, Token[]>([
  [base.alchemyNetwork, baseTokens],
  [polygon.alchemyNetwork, polygonTokens],
  [arbitrum.alchemyNetwork, arbitrumTokens],
  [solana.alchemyNetwork, solanaTokens],
  [bsc.alchemyNetwork, bscTokens],
]);

/**
 * Common tokens, included for convenience.
 *
 * Rozo Pay supports payment in many more tokens. In general, the goal for
 * Pay is to accept all tokens with DEX liquidity on any major chain.
 */
export const knownTokens: Token[] = Array.from(
  knownTokensByChain.values()
).flat();

export const knownAlchemyTokens: Token[] = Array.from(
  knownTokensByAlchemyNetwork.values()
).flat();
