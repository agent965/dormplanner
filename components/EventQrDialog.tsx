"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatEventTime } from "@/lib/utils";

type Props = {
  url: string;
  title: string;
  startsAt: string; // ISO
};

export function EventQrDialog({ url, title, startsAt }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function print() {
    window.print();
  }

  return (
    <>
      {/* Print-only styles — scoped so only the QR card prints on paper */}
      <style jsx global>{`
        @media print {
          body > *:not(.qr-print-root) {
            display: none !important;
          }
          .qr-print-root {
            position: fixed !important;
            inset: 0 !important;
            background: white !important;
            z-index: 9999 !important;
            padding: 48px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .qr-print-root .qr-print-card {
            box-shadow: none !important;
            border: 2px solid #000 !important;
            background: white !important;
            max-width: 420px !important;
            width: 100% !important;
          }
          .qr-print-hide {
            display: none !important;
          }
        }
      `}</style>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border-2 border-[color:var(--husky-purple)] text-[color:var(--husky-purple)] hover:bg-[color:var(--husky-purple)] hover:text-white transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M14 14h3M14 17v4M17 20h4M20 14v3" />
        </svg>
        Share / QR
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 qr-print-root"
          role="dialog"
          aria-modal="true"
        >
          <div className="card qr-print-card w-full max-w-sm p-6 bg-[color:var(--surface)]">
            <div className="qr-print-hide flex items-baseline justify-between mb-3">
              <h2 className="display text-lg font-semibold">Share this event</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
              >
                ✕
              </button>
            </div>

            {/* Big QR + title + date — this is also what prints */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG
                  value={url}
                  size={224}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                />
              </div>
              <div>
                <h3 className="display text-base font-bold leading-tight">{title}</h3>
                <p className="text-xs text-[color:var(--muted)] mt-1">
                  {formatEventTime(new Date(startsAt))}
                </p>
                <p className="text-[10px] text-[color:var(--muted)] mt-1 break-all">
                  {url}
                </p>
              </div>
            </div>

            <div className="qr-print-hide flex items-center justify-end gap-2 mt-5">
              <button
                onClick={copyLink}
                className="text-sm px-3 py-1.5 rounded-full border border-[color:var(--border)] hover:border-[color:var(--husky-purple)]"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
              <button onClick={print} className="btn-primary text-sm">
                Print
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
