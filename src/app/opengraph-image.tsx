import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Saldo Real — finanças locais e privadas";

export default async function Image() {
  const logoBuffer = await readFile(join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f6f3ec",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={240}
          height={240}
          alt=""
          style={{ borderRadius: 56 }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: "#1c1a13",
              lineHeight: 1.1,
            }}
          >
            Saldo Real
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#766f5b",
              marginTop: 12,
            }}
          >
            Finanças locais e privadas
          </div>
        </div>
      </div>
    ),
    size,
  );
}
