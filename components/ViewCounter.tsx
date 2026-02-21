"use client";

import { useEffect, useRef, useState } from "react";
import { getAndIncrementViewCount } from "@/app/actions/view";

interface ViewCounterProps {
  slug: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * 页面访问量计数器：从 Vercel KV 读取并展示当前访问量，
 * 对新访客（无 Cookie）会 +1。防抖：客户端用 ref 保证同一挂载周期只请求一次（应对 Strict Mode 双挂载）。
 */
export function ViewCounter({ slug, className, fallback = "—" }: ViewCounterProps) {
  const [count, setCount] = useState<number | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    getAndIncrementViewCount(slug).then(setCount);
  }, [slug]);

  if (count === null) {
    return <span className={className}>{fallback}</span>;
  }
  return <span className={className}>{count.toLocaleString()}</span>;
}
