# Verification

## Completed checks

- Nine commerce and backend unit tests passed; rerun before the GitHub push on 3 October 2026.
- Five Playwright browser tests passed during implementation, covering the storefront, preview authentication behavior, cart variants, persistence, search, studio editing and mobile layout.
- Nine Firebase emulator integration and security tests passed during implementation.
- Flutter analysis and the Flutter test passed; the Windows release was built successfully.
- Live pre-launch checks confirmed four sample products, disabled checkout, Gemini catalogue answers, newsletter subscription, protected administrator access and rejection of requests missing App Check.

## Activation and manual checks

- Products, prices, descriptions, stock and generated clothing images are samples. Review and replace them before accepting sales.
- Paystack is intentionally inactive. Payment end-to-end verification requires configuring a Paystack test key first.
- Google sign-in and phone SMS sign-in need manual completion with the owner's account and phone.
- Windows notifications require the application to remain open and alerts to be enabled. Delivery of native notifications has not been visually verified.
- Private environment files, credentials, local test artifacts and Windows binaries are excluded from Git. Build instructions are in README.md.
