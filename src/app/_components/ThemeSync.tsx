"use client";

import { useEffect } from "react";

// OSのライト/ダーク設定を Bootstrap の data-bs-theme に反映する。
export function ThemeSync() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.setAttribute(
        "data-bs-theme",
        mq.matches ? "dark" : "light",
      );
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return null;
}
