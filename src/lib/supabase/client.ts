"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "./env";
export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  return createBrowserClient<Database>(config.url, config.key);
}
