"use client";

import { useState } from "react";
import { Check } from "lucide-react";

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", padding: "60px 20px 80px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <h1 style={{
          fontFamily: "var(--font-serif,'Instrument Serif',Georgia,serif)",
          fontWeight: 400, fontSize: "clamp(28px,4vw,44px)", color: "#352D27", marginBottom: "10px",
        }}>
          Let&apos;s talk.
        </h1>
        <p style={{ fontSize: "14px", color: "#637180", lineHeight: 1.65, marginBottom: "32px" }}>
          Have feedback, a question, or a brand you&apos;d love to see on Yousra? Send us a message.
        </p>

        {sent ? (
          <div style={{ background: "#DCFCFF", borderRadius: "14px", padding: "28px 32px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
            <Check size={20} color="#352D27" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#352D27", marginBottom: "4px" }}>Message sent!</p>
              <p style={{ fontSize: "13px", color: "#637180" }}>We&apos;ll get back to you as soon as we can.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { id: "name", label: "Name", type: "text", placeholder: "Your name" },
              { id: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            ].map(({ id, label, type, placeholder }) => (
              <div key={id}>
                <label htmlFor={id} style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#637180", marginBottom: "6px" }}>{label}</label>
                <input id={id} type={type} placeholder={placeholder} required
                  style={{ width: "100%", height: "42px", padding: "0 14px", border: "1px solid rgba(53,45,39,0.15)", borderRadius: "10px", fontSize: "13px", color: "#352D27", background: "#fff", outline: "none" }} />
              </div>
            ))}
            <div>
              <label htmlFor="message" style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#637180", marginBottom: "6px" }}>Message</label>
              <textarea id="message" placeholder="What's on your mind?" required rows={5}
                style={{ width: "100%", padding: "12px 14px", border: "1px solid rgba(53,45,39,0.15)", borderRadius: "10px", fontSize: "13px", color: "#352D27", background: "#fff", outline: "none", resize: "vertical" }} />
            </div>
            <button type="submit"
              style={{ background: "#352D27", color: "#F5F5F5", border: "none", borderRadius: "12px", padding: "13px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              Send message →
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
