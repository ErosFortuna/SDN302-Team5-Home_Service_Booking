export interface ResolveApiBaseUrlOptions {
  isDev: boolean;
  apiUrl?: string | null;
  platform?: string;
}

export declare function isPrivateOrLocalHost(hostname: string): boolean;
export declare function isPlaceholderHost(hostname: string): boolean;
export declare function resolveApiBaseUrl(options: ResolveApiBaseUrlOptions): string;

