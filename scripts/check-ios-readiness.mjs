#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

function fail(message) {
  console.error(`\n[ios-readiness] ${message}\n`)
  process.exit(1)
}

function mustExist(rel) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) {
    fail(`Missing required file: ${rel}`)
  }
  return fs.readFileSync(abs, 'utf8')
}

const capacitorConfig = mustExist('capacitor.config.ts')
if (!capacitorConfig.includes("appId: 'app.euangelion.app'")) {
  fail('capacitor.config.ts missing required iOS appId')
}
if (!capacitorConfig.includes('https://euangelion.app')) {
  fail('capacitor.config.ts must target production https server URL')
}
if (!capacitorConfig.includes("webDir: 'public/ios-shell'")) {
  fail('capacitor.config.ts must use iOS shell webDir')
}

mustExist('public/ios-shell/index.html')
mustExist('ios/App/App/AppDelegate.swift')

const infoPlist = mustExist('ios/App/App/Info.plist')
if (!infoPlist.includes('<key>NSAppTransportSecurity</key>')) {
  fail('Info.plist must include NSAppTransportSecurity')
}
if (infoPlist.includes('NSAllowsArbitraryLoads</key>\n\t\t<true/>')) {
  fail('Info.plist cannot allow arbitrary HTTP loads for App Store build')
}

mustExist('ios/App/App/PrivacyInfo.xcprivacy')

mustExist('src/app/api/billing/config/route.ts')
const checkoutRoute = mustExist('src/app/api/billing/checkout/route.ts')
if (!checkoutRoute.includes('IOS_IAP_REQUIRED')) {
  fail('Billing checkout route must enforce iOS in-app purchase policy')
}
mustExist('src/app/api/billing/portal/route.ts')

const settingsPage = mustExist('src/app/settings/page.tsx')
if (!settingsPage.includes('purchasePlanOnIos')) {
  fail('Settings page must integrate iOS in-app purchase action')
}
if (!settingsPage.includes('/api/billing/checkout')) {
  fail('Settings page must integrate web checkout action')
}
if (!settingsPage.includes('/api/billing/portal')) {
  fail('Settings page must integrate billing management portal action')
}

console.log('[ios-readiness] OK')
