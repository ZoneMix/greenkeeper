export declare const YARD_CONFIG_MODULE: '@yard-config';
export declare const YARD_CONFIG_ENV: 'GREENKEEPER_CONFIG';

export interface ResolveYardConfigOptions {
  readonly root?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export declare function findYardConfig(options?: ResolveYardConfigOptions): string;
export declare function resolveYardConfig(options?: ResolveYardConfigOptions): string;
export declare function toProjectRelative(file: string, root?: string): string;
