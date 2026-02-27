"use server";

import { createClient } from "redis";
import { cookies } from "next/headers";

const KV_KEY_PREFIX = "view:";
const COOKIE_PREFIX = "v_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天，同一访客在此期间不重复计数

function safeCookieName(slug: string): string {
  return COOKIE_PREFIX + slug.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64);
}

/**
 * 获取并可能增加访问量（同一访客在 COOKIE_MAX_AGE 内只加 1 次）。
 * 支持 REDIS_URL (Redis Cloud) 或 KV_REST_API_* (Upstash / @vercel/kv)。
 */
export async function getAndIncrementViewCount(slug: string): Promise<number> {
  const redisUrl = process.env.REDIS_URL;
  const hasKv = !!(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
  if (!redisUrl && !hasKv) return 0;

  try {
    const key = KV_KEY_PREFIX + slug;
    const cookieName = safeCookieName(slug);
    const cookieStore = await cookies();
    const viewed = cookieStore.get(cookieName);

    if (viewed?.value === "1") {
      const count = await readCount(key, redisUrl, Boolean(hasKv));
      return count;
    }

    const count = await incrementCount(key, redisUrl, Boolean(hasKv));
    cookieStore.set(cookieName, "1", {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return count;
  } catch {
    return 0;
  }
}

async function readCount(
  key: string,
  redisUrl: string | undefined,
  hasKv: boolean
): Promise<number> {
  if (redisUrl && redisUrl.startsWith("redis")) {
    const client = createClient({ url: redisUrl });
    try {
      await client.connect();
      const val = await client.get(key);
      return val ? parseInt(val, 10) : 0;
    } finally {
      await client.quit().catch(() => {});
    }
  }
  const { kv } = await import("@vercel/kv");
  const count = await kv.get<number>(key);
  return typeof count === "number" ? count : 0;
}

async function incrementCount(
  key: string,
  redisUrl: string | undefined,
  hasKv: boolean
): Promise<number> {
  if (redisUrl && redisUrl.startsWith("redis")) {
    const client = createClient({ url: redisUrl });
    try {
      await client.connect();
      return await client.incr(key);
    } finally {
      await client.quit().catch(() => {});
    }
  }
  const { kv } = await import("@vercel/kv");
  return await kv.incr(key);
}
