// Global Deno type declarations for Supabase Edge Functions
// This file provides type definitions for Deno globals used in Edge Functions

declare global {
  const Deno: {
    version: {
      deno: string;
      typescript: string;
      v8: string;
    };
    env: {
      get(key: string): string | undefined;
      toObject(): Record<string, string>;
    };
    args: string[];
    pid: number;
    ppid: number;
    noColor: boolean;
  };
}

export {};
