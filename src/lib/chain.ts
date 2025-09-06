import { Network } from "alchemy-sdk";
import { Address } from "viem";
import { Token } from "./token";

export type Chain = {
  type: "evm" | "solana";
  chainId: number;
  name: string;
  cctpDomain: number | null;
  alchemyNetwork: Network;
};

export const base: Chain = {
  type: "evm",
  chainId: 8453,
  name: "Base",
  cctpDomain: 6,
  alchemyNetwork: Network.BASE_MAINNET,
};

export const polygon: Chain = {
  type: "evm",
  chainId: 137,
  name: "Polygon",
  cctpDomain: 7,
  alchemyNetwork: Network.MATIC_MAINNET,
};

export const arbitrum: Chain = {
  type: "evm",
  chainId: 42161,
  name: "Arbitrum",
  cctpDomain: 3,
  alchemyNetwork: Network.ARB_MAINNET,
};

export const solana: Chain = {
  type: "solana",
  chainId: 501,
  name: "Solana",
  cctpDomain: 5,
  alchemyNetwork: Network.SOLANA_MAINNET,
};

export const supportedChains: Chain[] = [base, polygon, arbitrum, solana];

export function token({
  chainId,
  token,
  name,
  symbol,
  decimals,
  fiatISO,
  logoURI,
  alchemyNetwork,
}: {
  chainId: number;
  token: Address | string;
  name: string;
  symbol: string;
  decimals: number;
  fiatISO?: string;
  logoURI: string;
  alchemyNetwork: Network;
}): Token {
  return {
    chainId,
    token,
    name,
    symbol,
    decimals,
    fiatISO,
    logoURI,
    logoSourceURI: logoURI,
    alchemyNetwork,
  };
}
