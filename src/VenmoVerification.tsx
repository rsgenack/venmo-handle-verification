import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

const VENMO_HOSTS = new Set([
  "venmo.com",
  "www.venmo.com",
  "account.venmo.com",
]);

export function normalizeVenmoHandle(input: string): string {
  let candidate = input.trim();

  if (!candidate) {
    throw new Error("Enter a Venmo handle.");
  }

  const possibleUrl = /^https?:\/\//i.test(candidate)
    ? candidate
    : /^(?:www\.|account\.)?venmo\.com\//i.test(candidate)
      ? `https://${candidate}`
      : null;

  if (possibleUrl) {
    let url: URL;

    try {
      url = new URL(possibleUrl);
    } catch {
      throw new Error("That Venmo profile link is not valid.");
    }

    if (!VENMO_HOSTS.has(url.hostname.toLowerCase())) {
      throw new Error("Use a venmo.com profile link.");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    candidate = parts[0]?.toLowerCase() === "u" ? (parts[1] ?? "") : (parts[0] ?? "");
  }

  candidate = candidate.replace(/^@+/, "").replace(/\/+$/, "").trim();

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    throw new Error("That Venmo handle is not valid.");
  }

  if (!candidate) {
    throw new Error("Enter a Venmo handle.");
  }

  if (!/^[A-Za-z0-9._-]+$/.test(candidate)) {
    throw new Error("Use only letters, numbers, periods, underscores, or hyphens.");
  }

  return candidate;
}

export function venmoProfileUrl(handle: string): string {
  return `https://account.venmo.com/u/${encodeURIComponent(normalizeVenmoHandle(handle))}`;
}

export type VenmoVerificationProps = {
  defaultValue?: string;
  disabled?: boolean;
  inputName?: string;
  label?: string;
  onValueChange?: (value: string) => void;
  onVerified: (handle: string) => void;
};

export function VenmoVerification({
  defaultValue = "",
  disabled = false,
  inputName = "venmoHandle",
  label = "Your Venmo handle",
  onValueChange,
  onVerified,
}: VenmoVerificationProps) {
  const inputId = useId();
  const helpId = useId();
  const dialogTitleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [previewHandle, setPreviewHandle] = useState<string | null>(null);
  const [verifiedHandle, setVerifiedHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewHandle) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewHandle(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [previewHandle]);

  function updateValue(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setValue(nextValue);
    setVerifiedHandle(null);
    setError(null);
    onValueChange?.(nextValue);
  }

  function openPreview() {
    try {
      const normalized = normalizeVenmoHandle(value);
      setValue(normalized);
      setError(null);
      setPreviewHandle(normalized);
      onValueChange?.(normalized);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enter a valid Venmo handle.");
    }
  }

  function confirmHandle() {
    if (!previewHandle) return;

    setVerifiedHandle(previewHandle);
    setPreviewHandle(null);
    onVerified(previewHandle);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      openPreview();
    }
  }

  const modal = previewHandle
    ? createPortal(
        <div
          className="vv-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setPreviewHandle(null);
          }}
        >
          <section
            aria-labelledby={dialogTitleId}
            aria-modal="true"
            className="vv-modal"
            role="dialog"
          >
            <header className="vv-modal__header">
              <div>
                <p className="vv-modal__step">Check before saving</p>
                <h2 id={dialogTitleId}>Is this your Venmo?</h2>
              </div>
              <button
                aria-label="Close profile preview"
                className="vv-icon-button"
                onClick={() => setPreviewHandle(null)}
                ref={closeRef}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className="vv-browser">
              <div className="vv-browser__bar" aria-hidden="true">
                <span />
                <span />
                <span />
                <strong>venmo.com/{previewHandle}</strong>
              </div>
              <iframe
                className="vv-profile-frame"
                referrerPolicy="no-referrer"
                src={venmoProfileUrl(previewHandle)}
                title={`Venmo profile preview for @${previewHandle}`}
              />
            </div>

            <p className="vv-modal__fallback">
              Preview not loading?{" "}
              <a href={venmoProfileUrl(previewHandle)} rel="noreferrer" target="_blank">
                Open this profile in Venmo
              </a>
              .
            </p>

            <div className="vv-modal__actions">
              <button className="vv-button vv-button--quiet" onClick={() => setPreviewHandle(null)} type="button">
                Edit handle
              </button>
              <button className="vv-button vv-button--confirm" onClick={confirmHandle} type="button">
                Yes, this is my account
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="vv-root">
      <label className="vv-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="vv-field-row">
        <span className="vv-at" aria-hidden="true">@</span>
        <input
          aria-describedby={helpId}
          aria-invalid={Boolean(error)}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="vv-input"
          disabled={disabled}
          id={inputId}
          inputMode="text"
          name={inputName}
          onChange={updateValue}
          onKeyDown={handleInputKeyDown}
          placeholder="yourname"
          spellCheck={false}
          type="text"
          value={value.replace(/^@+/, "")}
        />
        <button
          className="vv-preview-button"
          disabled={disabled || !value.trim()}
          onClick={openPreview}
          ref={triggerRef}
          type="button"
        >
          Preview account
        </button>
      </div>
      <div className="vv-message" id={helpId}>
        {error ? (
          <span className="vv-error" role="alert">{error}</span>
        ) : verifiedHandle ? (
          <span className="vv-verified">Verified as @{verifiedHandle}</span>
        ) : (
          <span>We’ll open the public profile so you can confirm it yourself.</span>
        )}
      </div>
      {modal}
    </div>
  );
}
