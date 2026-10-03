# MuanoLuxe

A responsive React storefront, a separate management studio at `/admin`, Firebase backend, and a Flutter Windows companion app. The original site is preserved in `archive/original-index.html`.

## Run locally

Use Node 22 LTS and Flutter with the Windows C++ build tools.

```powershell
npm ci
npm run dev -- --port 5186 --strictPort
```

Open `http://127.0.0.1:5186` for the store and `/admin` for the studio. Development defaults to an explicitly labelled, local preview; it never claims to authenticate, save live changes, subscribe, charge, or place an order.

`npm run build` creates the production website using `.env.production`. `npm run build:preview` builds the local preview. Production Firebase configuration is a public client identifier; all secret credentials are confined to Secret Manager. Do not copy the local credential text files into `public/`, hosting output, or version control.

## Included

- Responsive clothing catalog with categories, audience filters, search, price sorting, every available colour swatch, optional per-colour images, stock by colour and size, product details and care notes.
- Persistent bag and wishlist, quantity limits, Google and phone sign-in, delivery details, order history, and Paystack hosted checkout integration.
- Server-authoritative pricing, atomic inventory reservations, idempotent order creation, signed and verified Paystack webhooks, and scheduled reservation expiry.
- Secure studio with administrator claims, product creation/editing, image uploads, draft/published availability, inventory editing with revision checks, order fulfilment, subscriber CSV export, editable storefront content and policies.
- Live order, payment and subscription notifications in Firestore. Opt-in browser alerts and native Windows notifications work **while the studio remains open**. This is not a background push service when the app is closed.
- Gemini shopping assistant using the current catalog and policies; a server-held key, App Check, per-hour rate limits, bounded prompts, and graceful failures. Gemini free-tier availability and limits depend on the supplied key; no paid model tier is selected by this app.
- Original AI-generated campaign and product imagery in `public/images`. Catalog data, fabric descriptions, prices and quantities are **samples**. Initial server import keeps them in drafts, and checkout remains off until reviewed.

## Firebase project

Project: `muanoluxe`. Region for the new database, storage and functions: `europe-west1`. The default database has deletion protection. Authentication uses the existing Google, phone and email providers. `muanoluxe@gmail.com` is the designated administrator; sign in with Google to verify ownership and receive the claim.

Production App Check uses a score-based reCAPTCHA Enterprise key restricted to `muanoluxe.web.app` and `muanoluxe.firebaseapp.com`. Add an approved custom domain to Firebase Auth and reCAPTCHA before switching domains. Never disable App Check for deployment or add localhost to the production reCAPTCHA key. Use the Firebase emulators or a separately registered debug provider for development.

The admin role cannot be granted from the storefront. With an authorized application-default credential, `npm run admin:grant -- USER_UID` grants a claim to an existing Firebase user. The setup scripts use the existing Firebase CLI login and are scoped to this project.

### Windows app

The Flutter app embeds the same management studio with Microsoft Edge WebView2, adds native Windows notifications, and supports a self-contained preview. This avoids relying on the native Firebase Windows SDK, which Firebase describes as intended for local development rather than production.

```powershell
# Standalone preview with bundled site assets:
npm run build:windows
# Connected app after the storefront is hosted:
powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1 -StoreUrl https://muanoluxe.web.app/admin
```

Distribute the **entire** release folder or ZIP, not the executable alone. WebView2 Runtime must be installed. The app is not code-signed. The native window offers an “Open in your browser” button for Google sign-in; Google blocks embedded-browser OAuth. In-app administrators can use staff email/password. Use “Set or reset staff password” on the login screen first if a password has not been configured. Close the app only when you no longer need live alerts.

### Enable Paystack later

Payments are deliberately inactive at the owner’s request. `functions/payment-config.json` contains `"enabled": false`. No Paystack secret has been supplied.

1. Create a Paystack South African merchant account and complete its activation requirements.
2. Save a **test** secret using `firebase functions:secrets:set PAYSTACK_SECRET_KEY --project muanoluxe`. Do not put it in a `VITE_` variable.
3. Set `"enabled": true` in `functions/payment-config.json`, then deploy functions. This binds the secret only to the payment functions.
4. Set the Paystack webhook URL to `https://europe-west1-muanoluxe.cloudfunctions.net/paystackWebhook`. The return URL is generated from `STORE_ORIGIN` and does not prove payment success.
5. Review products, colour photography, sizes, stock, prices, delivery charges and store policies. Publish only verified products and enable checkout in Store settings.
6. Test success, declined/cancelled payment, duplicate callbacks, low stock, late payment, and refund procedures before switching to a live secret.

Reservations expire after 30 minutes and are reconciled every 10 minutes. A late payment after stock has been released is placed in `paid_stock_review`, with an administrator notification, instead of silently fulfilling unavailable inventory. Resolve those cases and refunds in Paystack. The studio intentionally cannot mark an unpaid order as paid. Payment-specific end-to-end tests require a Paystack test key and are not claimed as completed while payments are disabled.

### Deployment

```powershell
npm ci --prefix functions
npm test
npm run test:browser
npm run test:rules
npm run build
npx firebase deploy --project muanoluxe
```

Only `dist/` is hosted. Firestore and Storage client writes are denied except authorized administrator image uploads. All business mutations go through Cloud Functions. Documents in `rateLimits` expire through Firestore TTL. Notifications do not disclose subscriber email addresses. Newsletter signup requires consent; authenticated verified-email unsubscribe is available in the account panel, with the support email for anyone unable to sign in.

Production environment inputs: `VITE_FIREBASE_ENABLED=true`, `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`, `VITE_FUNCTIONS_REGION=europe-west1`. Backend inputs: `STORE_ORIGIN`, `GEMINI_MODEL`, the payment feature configuration, and Secret Manager `GEMINI_API_KEY`; `PAYSTACK_SECRET_KEY` only when enabled.

## Validation

- `npm test`: commerce and server input/stock validation.
- `npm run test:browser`: desktop/mobile storefront, variant bag, persistence, wishlist, search, authentication preview behavior, subscription preview behavior, studio editing and assistant.
- `npm run test:rules`: Firebase emulator permission tests for public, customer and administrator access.
- `flutter analyze` and `flutter test` in `admin_windows`.
- `npm run build` and `flutter build windows --release`.

See `VERIFICATION.md` for actual run results and remaining activation checks. Visual checks are saved under `artifacts/`. Generated-image prompts and provenance are in `ASSETS.md`.

## References

[Firebase Flutter platform support](https://firebase.google.com/docs/flutter/setup), [Firebase App Check](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [Paystack checkout](https://paystack.com/docs/payments/accept-payments/), [Paystack webhook validation](https://paystack.com/docs/payments/webhooks/), [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash).
