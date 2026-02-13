# iOS App Store Submission Readiness

## Implemented in repo

- Native iOS target via Capacitor (`ios/App/App.xcodeproj`).
- App shell entrypoint for iOS (`public/ios-shell/index.html`).
- Secure transport policy in `Info.plist` (`NSAppTransportSecurity`, no arbitrary HTTP loads).
- Privacy manifest scaffold (`ios/App/App/PrivacyInfo.xcprivacy`).
- Billing infrastructure:
  - iOS in-app purchase path (RevenueCat plugin) in settings UI.
  - Web Stripe checkout path for non-iOS builds.
  - Stripe billing management portal path from settings (after successful web checkout).
  - API guard that blocks web checkout for iOS (`IOS_IAP_REQUIRED`).
- Automated readiness gate:
  - `npm run verify:ios-readiness`

## App Review constraints enforced

- iOS digital subscription flow is not allowed to use web checkout.
- iOS app must use App Store IAP path.
- ATS is locked down (no arbitrary cleartext loads).
- Privacy manifest file exists in app target.

## Required before actual upload

1. Configure App Store Connect products matching:
   - `app.euangelion.premium.monthly`
   - `app.euangelion.premium.annual`
2. Set envs for production build:
   - `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_PREMIUM_MONTHLY`
   - `STRIPE_PRICE_PREMIUM_ANNUAL`
3. Open Xcode and set signing/team/bundle version:
   - `npm run ios:open`
4. Archive + validate in Xcode Organizer.

## Verification commands

- `npm run verify:ios-readiness`
- `npm run lint`
- `npm run type-check`
- `npm test`
