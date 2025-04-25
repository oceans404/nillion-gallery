"use client"

import { SupabaseProvider as Provider, useSupabase as useSupabaseContext } from "@/contexts/supabase-context"

export const SupabaseProvider = Provider
export const useSupabase = useSupabaseContext
