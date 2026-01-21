'use client'

import { supabase } from '@/lib/supabase'
import type { Pathway, Category } from '@/lib/soul-audit-questions'

export interface SoulAuditResult {
  id: string
  user_id: string
  pathway: Pathway
  scores: Record<Pathway, number>
  breakdown: Record<Category, Pathway>
  responses: Record<string, Pathway>
  created_at: string
}

export async function saveSoulAuditResult(
  pathway: Pathway,
  scores: Record<Pathway, number>,
  breakdown: Record<Category, Pathway>,
  responses: Record<string, Pathway>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Store in localStorage for anonymous users
      const anonResult = {
        pathway,
        scores,
        breakdown,
        responses,
        created_at: new Date().toISOString(),
      }
      localStorage.setItem('soul_audit_result', JSON.stringify(anonResult))
      return { success: true }
    }

    const { error } = await supabase
      .from('soul_audit_responses')
      .insert({
        user_id: user.id,
        pathway,
        scores,
        breakdown,
        responses,
      })

    if (error) {
      console.error('Failed to save Soul Audit result:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to save Soul Audit result:', error)
    return { success: false, error: 'Unknown error' }
  }
}

export async function getLatestSoulAuditResult(): Promise<SoulAuditResult | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Check localStorage for anonymous users
      const stored = localStorage.getItem('soul_audit_result')
      if (stored) {
        return JSON.parse(stored) as SoulAuditResult
      }
      return null
    }

    const { data, error } = await supabase
      .from('soul_audit_responses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data as SoulAuditResult
  } catch (error) {
    console.error('Failed to get Soul Audit result:', error)
    return null
  }
}

export async function getAllSoulAuditResults(): Promise<SoulAuditResult[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('soul_audit_responses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data as SoulAuditResult[]
  } catch (error) {
    console.error('Failed to get Soul Audit results:', error)
    return []
  }
}
