import type { NextConfig } from 'next';
import { resolveYardConfig, toProjectRelative, YARD_CONFIG_MODULE } from './config/resolve-yard-config.mjs';

// The yard config JSON chosen for this build; see config/resolve-yard-config.mjs.
const YARD_CONFIG_FILE = resolveYardConfig();

interface WebpackConfig {
  readonly resolve: { readonly alias: Readonly<Record<string, string | false | string[]>> };
  readonly plugins: ReadonlyArray<unknown>;
}

interface WebpackApi {
  readonly NormalModuleReplacementPlugin: new (pattern: RegExp, replacement: string) => unknown;
}

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // better-sqlite3 is a native addon; keep it out of the server bundle.
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    resolveAlias: { [YARD_CONFIG_MODULE]: toProjectRelative(YARD_CONFIG_FILE) },
  },
  webpack: (config: WebpackConfig, { webpack }: { webpack: WebpackApi }) => ({
    ...config,
    resolve: { ...config.resolve, alias: { ...config.resolve.alias, [YARD_CONFIG_MODULE]: YARD_CONFIG_FILE } },
    // tsconfig `paths` (pointing at the example, for typing) resolve before aliases in
    // webpack, so also rewrite the request itself before resolution starts.
    plugins: [
      ...config.plugins,
      new webpack.NormalModuleReplacementPlugin(new RegExp(`^${YARD_CONFIG_MODULE}$`), YARD_CONFIG_FILE),
    ],
  }),
  async headers() {
    return [{ source: '/:path*', headers: [...SECURITY_HEADERS] }];
  },
};

export default nextConfig;
