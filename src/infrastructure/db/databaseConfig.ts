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
