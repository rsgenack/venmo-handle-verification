import { useState } from "react";

import { VenmoVerification } from "../VenmoVerification";
import "../venmo-verification.css";
import "./demo.css";

export function App() {
  const [verified, setVerified] = useState<string | null>(null);

  return (
    <main className="demo-shell">
      <section className="demo-intro">
        <a className="demo-repo" href="https://github.com/rsgenack/venmo-handle-verification">
          Reusable React component
        </a>
        <h1>Check the right @ before you save it.</h1>
        <p>
          No private API. No credentials. The person who owns the account checks
          the public Venmo profile and confirms the handle themselves.
        </p>
        <div className="demo-steps" aria-label="How it works">
          <span>Type</span>
          <span>Preview</span>
          <span>Confirm</span>
        </div>
      </section>

      <section className="demo-card" aria-label="Venmo verification demo">
        <div className="demo-card__topline">
          <span>Live demo</span>
          <span className="demo-status">{verified ? "Confirmed" : "Not yet confirmed"}</span>
        </div>
        <VenmoVerification
          defaultValue="Venmo"
          onVerified={(handle) => setVerified(handle)}
        />
        <p className="demo-result" aria-live="polite">
          {verified
            ? `Your app receives “${verified}” from onVerified.`
            : "Try @Venmo, venmo.com/Venmo, or your own handle."}
        </p>
      </section>
    </main>
  );
}
