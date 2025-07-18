// Type declarations for Deno standard library modules
// This resolves TypeScript module resolution issues for Deno URL imports

declare module 'https://deno.land/std@0.177.0/http/server.ts' {
  export interface ServeInit {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    reusePort?: boolean;
    onError?: (error: Error) => Response | void;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export interface ServeHandler {
    (request: Request): Response | Promise<Response>;
  }

  export function serve(handler: ServeHandler, options?: ServeInit): Promise<void>;
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export interface SupabaseClient {
    from(table: string): any;
    auth: any;
    storage: any;
    rpc(fn: string, args?: any): any;
  }

  export function createClient(url: string, key: string, options?: any): SupabaseClient;
}

// Add other Deno std modules as needed
declare module 'https://deno.land/std@*/crypto/mod.ts' {
  export * from 'crypto';
}

declare module 'https://deno.land/std@*/encoding/base64.ts' {
  export function encode(data: Uint8Array): string;
  export function decode(data: string): Uint8Array;
}
