"use server";

import { kv } from "@vercel/kv";
import { cookies } from "next/headers";

const KV_KEY_PREFIX = "view:";
const COOKIE_PREFIX = "v_";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 天，同一访客在此期间不重复计数

function safeCookieName(slug: string): string {
  return COOKIE_PREFIX + slug.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 64);
}

/**
 * 获取并可能增加访问量（同一访客在 COOKIE_MAX_AGE 内只加 1 次）。
 * 用于 ViewCounter 组件：展示当前访问量，并对新访客 +1。
 */
export async function getAndIncrementViewCount(slug: string): Promise<number> {
  const key = KV_KEY_PREFIX + slug;
  const cookieName = safeCookieName(slug);
  const cookieStore = await cookies();
  const viewed = cookieStore.get(cookieName);

  if (viewed?.value === "1") {
    const count = await kv.get<number>(key);
    return typeof count === "number" ? count : 0;
  }

  const count = await kv.incr(key);
  cookieStore.set(cookieName, "1", {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return count;
}
