import { verifyToken } from "./cloudflare";

export type BasicAuthInfo = {
  zoneId: string;
  token: string;
  id: string;
};

export async function parseBasicAuth(
  request: Request
): Promise<BasicAuthInfo | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Basic ")) return null;

  const base64 = authHeader.slice(6);

  try {
    const decoded = atob(base64);

    // split at first ":"
    const idx = decoded.indexOf(":");
    if (idx <= 0) return null;

    const zoneId = decoded.slice(0, idx).trim();
    const token = decoded.slice(idx + 1).trim();

    if (!zoneId || !token) return null;

    const vr = await verifyToken(token);

    if (!vr.success || !vr.data?.id) return null;

    return {
      zoneId,
      token,
      id: vr.data.id,
    };
  } catch {
    return null;
  }
}