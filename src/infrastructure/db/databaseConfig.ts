export type DatabaseConfig = { kind: "folder"; dir: string } | { kind: "postgres"; url: string };

/** Hosting (8 Nov 2026): a local folder by default, or the online Postgres in DATABASE_URL. */
export function databaseConfig(env: Record<string, string | undefined>): DatabaseConfig {
  const url = env.DATABASE_URL?.trim();
  if (url) {
    if (!/^postgres(ql)?:\/\//.test(url)) throw new Error("DATABASE_URL must start with postgres:// or postgresql://");
    return { kind: "postgres", url };
  }
  return { kind: "folder", dir: env.DATA_DIR ?? "./data/dev" };
}

/**
 * Neon gives a pooled address (host ends "-pooler") that refuses the search_path setting each project's
 * connection uses (bug found 15 Nov 2026). The same host without "-pooler" is the direct address, which accepts it.
 */
export function directUrl(url: string): string {
  return url.replace(/@([^/@?]*?)-pooler\./, "@$1.");
}
