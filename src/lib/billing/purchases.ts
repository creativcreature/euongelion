'use client'

import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import {
  LOG_LEVEL,
  Purchases,
  type PurchasesOffering,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor'
import { BILLING_PLANS } from './catalog'
import type { BillingPlan } from '@/types/billing'

let initialized = false

export async function detectBillingPlatform(): Promise<'ios' | 'web'> {
  if (!Capacitor.isNativePlatform()) return 'web'

  try {
    const info = await Device.getInfo()
    if (info.platform === 'ios') return 'ios'
  } catch {
    // no-op fallback below
  }

  return Capacitor.getPlatform() === 'ios' ? 'ios' : 'web'
}

export async function initializeIosPurchases(): Promise<void> {
  if (initialized) return

  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY
  if (!apiKey) {
    throw new Error('In-app purchases are not configured yet.')
  }

  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    throw new Error('In-app purchases are available on iOS app builds only.')
  }

  await Purchases.setLogLevel({ level: LOG_LEVEL.WARN })
  await Purchases.configure({ apiKey })
  initialized = true
}

function findPackageForPlan(
  offering: PurchasesOffering,
  plan: BillingPlan,
): PurchasesPackage | null {
  const packages = [
    offering.monthly,
    offering.annual,
    ...offering.availablePackages,
  ].filter(Boolean) as PurchasesPackage[]

  return (
    packages.find((pkg) => pkg.product.identifier === plan.iosProductId) ?? null
  )
}

export async function purchasePlanOnIos(planId: string): Promise<void> {
  await initializeIosPurchases()

  const plan = BILLING_PLANS.find((item) => item.id === planId)
  if (!plan) throw new Error('Unknown billing plan.')

  const { current } = await Purchases.getOfferings()
  if (!current) {
    throw new Error('No active App Store offering is available.')
  }

  const pkg = findPackageForPlan(current, plan)
  if (!pkg) {
    throw new Error('Selected App Store product is not available.')
  }

  await Purchases.purchasePackage({ aPackage: pkg })
}

export async function restoreIosPurchases(): Promise<void> {
  await initializeIosPurchases()
  await Purchases.restorePurchases()
}
