import { ImageResponse } from "next/og";

export const alt = "T.STORE - Official E-Commerce Store";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0d0f12",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, #1a1f26 2%, transparent 0%), radial-gradient(circle at 75px 75px, #14181f 2%, transparent 0%)",
          backgroundSize: "100px 100px",
          padding: "60px 80px",
          color: "#f8fafc",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Glow Effects */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0) 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Top Header / Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.5)",
              }}
            >
              <span style={{ fontSize: "28px", fontWeight: 900, color: "#0d0f12" }}>
                T
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "32px",
                  fontWeight: 900,
                  letterSpacing: "-1px",
                  background: "linear-gradient(to right, #ffffff, #94a3b8)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                T.STORE
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#10b981",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Official E-Commerce Platform
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 20px",
              borderRadius: "9999px",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            <span>⚡ Terpercaya & Bergaransi 100%</span>
          </div>
        </div>

        {/* Main Content / Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "950px" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              color: "#ffffff",
              margin: 0,
            }}
          >
            Pusat Belanja Gadget, Laptop & Elektronik Terlengkap
          </h1>
          <p
            style={{
              fontSize: "24px",
              lineHeight: 1.4,
              color: "#94a3b8",
              margin: 0,
            }}
          >
            Dapatkan produk original berkualitas tinggi dengan promo bebas ongkir, potongan harga spesial, dan garansi resmi platform.
          </p>
        </div>

        {/* Bottom Feature Badges & Domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid #1e293b",
            paddingTop: "28px",
          }}
        >
          <div style={{ display: "flex", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                backgroundColor: "#161b22",
                border: "1px solid #334155",
                fontSize: "15px",
                fontWeight: 600,
                color: "#e2e8f0",
              }}
            >
              <span>🚚 Gratis Ongkir</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                backgroundColor: "#161b22",
                border: "1px solid #334155",
                fontSize: "15px",
                fontWeight: 600,
                color: "#e2e8f0",
              }}
            >
              <span>🛡️ 100% Original</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "10px",
                backgroundColor: "#161b22",
                border: "1px solid #334155",
                fontSize: "15px",
                fontWeight: 600,
                color: "#e2e8f0",
              }}
            >
              <span>💳 Pembayaran Instan & Aman</span>
            </div>
          </div>

          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "#64748b",
              fontFamily: "monospace",
            }}
          >
            ecommerce.taryana.my.id
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
