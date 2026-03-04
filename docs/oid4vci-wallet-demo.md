# OID4VCI Wallet Pickup Demo Runbook

## Operator Checklist

1. Install dependencies: `npm install`.
2. Start issuer API: `npm run oid4vci`.
3. Start UI: `npm run dev`.
4. Confirm API is reachable at `${BASE_URL}/oid4vci/pickup-offer` (default `http://localhost:8787`).
5. Open the UI in a browser and navigate to the `Wallet Pickup` tab.

## Student Checklist

1. In the `Wallet Pickup` tab, click `Add to Wallet`.
2. In a wallet app, scan the QR code or open the deep link.
3. Approve credential pickup in the wallet.
4. If expired, click `Generate new QR` and repeat.

## Troubleshooting

### Expired Codes

- Symptom: Countdown reaches `0s` and wallet pickup fails.
- Action: Click `Generate new QR` to create a fresh pre-authorized code.

### Wrong Base URL

- Symptom: Wallet cannot call issuer metadata/token/credential endpoints.
- Action: Set `BASE_URL` to a wallet-reachable URL before running `npm run oid4vci`.
- Action: Restart the OID4VCI server after changing `.env`.

### Wallet Cannot Resolve Issuer

- Symptom: Wallet reports issuer metadata/JWKS lookup errors.
- Action: Verify `BASE_URL/.well-known/openid-credential-issuer` and `BASE_URL/.well-known/jwks.json` are reachable from the wallet device.
- Action: If testing on mobile, avoid `localhost`; use a LAN or tunnel URL.
