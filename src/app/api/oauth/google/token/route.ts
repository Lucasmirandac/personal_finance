import { NextResponse } from "next/server";
import {
  exchangeGoogleToken,
  GoogleOAuthError,
  parseGoogleTokenRequest,
} from "@/lib/cloud-sync/google-oauth-server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const tokenRequest = parseGoogleTokenRequest(body);
    const tokens = await exchangeGoogleToken(tokenRequest);
    return NextResponse.json(tokens);
  } catch (err) {
    if (err instanceof GoogleOAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
