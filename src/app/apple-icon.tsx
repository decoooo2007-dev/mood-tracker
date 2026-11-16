import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #070d1f 0%, #172554 45%, #0d9488 80%, #eab308 100%)",
          borderRadius: 38,
        }}
      >
        <div
          style={{
            width: 126,
            height: 126,
            borderRadius: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.14)",
            border: "2px solid rgba(255, 255, 255, 0.45)",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1,
              display: "flex",
            }}
          >
            M
          </div>
          <div
            style={{
              marginTop: 6,
              width: 34,
              height: 6,
              borderRadius: 999,
              background: "linear-gradient(90deg, #60A5FA, #14B8A6, #FACC15)",
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
