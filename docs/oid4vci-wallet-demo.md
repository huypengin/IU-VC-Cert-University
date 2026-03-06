# OID4VCI Wallet Pickup Demo Runbook

## Operator Checklist

1. Install dependencies: `npm install`.
2. Start issuer API:
   - Local mode: `npm run oid4vci`
   - Public tunnel mode: `npm run oid4vci:tunnel`
3. Start UI in a separate terminal: `npm run dev`.
4. Confirm API is reachable at `${BASE_URL}/oid4vci/pickup-offer` (default `http://localhost:8787`).
5. Open the UI in a browser and navigate to the `Wallet Pickup` tab.

UI request target precedence:
1. `OID4VCI_BASE_URL` (recommended explicit setting)
2. `BASE_URL`
3. `http://localhost:8787` (default)

`oid4vci:tunnel` behavior:
- Requires `NGROK_DOMAIN`
- Sets issuer `BASE_URL` from `NGROK_DOMAIN`
- Starts both issuer API and ngrok tunnel in one command
- Keeps UI startup separate (`npm run dev`)
- QR/deep-link now use `credential_offer_uri` (by-reference), which is more interoperable with mobile wallets than embedding full offer JSON in QR.

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
- Action: If the UI runs on a different host/port than the issuer API, set `OID4VCI_BASE_URL` for the UI pickup call target.
- Action: Prefer `npm run oid4vci:tunnel` with `NGROK_DOMAIN` for stable public URLs.

### Wallet Cannot Resolve Issuer

- Symptom: Wallet reports issuer metadata/JWKS lookup errors.
- Action: Verify `BASE_URL/.well-known/openid-credential-issuer` and `BASE_URL/.well-known/jwks.json` are reachable from the wallet device.
- Action: If testing on mobile, avoid `localhost`; use a LAN or tunnel URL.
