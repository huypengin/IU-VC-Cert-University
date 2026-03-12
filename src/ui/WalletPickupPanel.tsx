import type { ChangeEventHandler } from "react";

import type { PickupOfferVm } from "./pickupApi.js";

export interface WalletPickupPanelProps {
  pickupBusy: boolean;
  pickupError: string | null;
  pickupOffer: PickupOfferVm | null;
  pickupQrSrc: string;
  pickupSecondsLeft: number;
  pickupExpiryState: string;
  canCreateOffer: boolean;
  selectedFilename: string | null;
  detectedSubjectId: string | null;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onCreatePickupOffer: () => void;
}

export function WalletPickupPanel(props: WalletPickupPanelProps) {
  const {
    pickupBusy,
    pickupError,
    pickupOffer,
    pickupQrSrc,
    pickupSecondsLeft,
    pickupExpiryState,
    canCreateOffer,
    selectedFilename,
    detectedSubjectId,
    onFileChange,
    onCreatePickupOffer,
  } = props;

  return (
    <div className="grid">
      <section className="card">
        <h2>Wallet Pickup</h2>
        <label>
          VC JSON file
          <input type="file" accept="application/json,.json" onChange={onFileChange} />
        </label>
        {selectedFilename && (
          <div className="result-info">Selected file: {selectedFilename}</div>
        )}
        {detectedSubjectId && (
          <div className="result-info">Detected subject DID: {detectedSubjectId}</div>
        )}
        <div className="pickup-actions">
          <button type="button" onClick={onCreatePickupOffer} disabled={!canCreateOffer || pickupBusy}>
            {pickupBusy ? "Generating..." : "Add to Wallet"}
          </button>
          {pickupOffer && (
            <button type="button" onClick={onCreatePickupOffer} disabled={!canCreateOffer || pickupBusy}>
              Generate new QR
            </button>
          )}
        </div>
        {pickupError && <pre className="error">{pickupError}</pre>}
        <p className="hint">
          Upload one VC JSON file, then generate an OID4VCI offer to open in a wallet or scan as a QR code.
        </p>
      </section>

      {pickupOffer && (
        <section className="card pickup-panel">
          <h2>Offer Ready</h2>
          <div className="pickup-actions">
            <a href={pickupOffer.offerUri} className="pickup-link-btn">
              Open Wallet Deep Link
            </a>
          </div>
          <div className="pickup-qr">
            <img src={pickupQrSrc} alt="OID4VCI offer QR code" width={240} height={240} />
          </div>
          <p className={`expiry-${pickupExpiryState}`}>Expires in: {pickupSecondsLeft}s</p>
          {pickupSecondsLeft === 0 && (
            <p className="hint">This offer has expired. Generate a new QR to continue.</p>
          )}
        </section>
      )}
    </div>
  );
}
