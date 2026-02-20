export type ApiResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};
export async function verifyToken(token: string): Promise<ApiResult<{ id: string; status: string }>> {
    if (!token || typeof token !== "string") {
        return { success: false, error: "INVALID_TOKEN" };
    }

    try {
        const resp = await fetch(
            "https://api.cloudflare.com/client/v4/user/tokens/verify",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        if (!resp.ok) {
            return { success: false, error: `HTTP_${resp.status}` };
        }

        const data: any = await resp.json();

        if (data?.success !== true) {
            return { success: false, error: "CF_VERIFY_FAILED" };
        }

        const id = data?.result?.id;
        const status = data?.result?.status;

        if (!id || status !== "active") {
            return { success: false, error: "TOKEN_NOT_ACTIVE" };
        }

        return {
            success: true,
            data: { id, status },
        };
    } catch {
        return { success: false, error: "NETWORK_ERROR" };
    }
}

export async function getIPOfHostname(
    zoneId: string,
    hostname: string,
    token: string
): Promise<ApiResult<{ ip: string; id: string }>> {
    try {
        const resp = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=${hostname}&type=A`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            }
        );

        if (!resp.ok) {
            return { success: false, error: `HTTP_${resp.status}` };
        }

        const data: any = await resp.json();

        if (!data?.success) {
            return { success: false, error: "CF_API_FAILED" };
        }

        if (!Array.isArray(data?.result) || data.result.length === 0) {
            return { success: false, error: "NO_RECORD_FOUND" };
        }

        return {
            success: true,
            data: {
                ip: data.result[0].content,
                id: data.result[0].id,
            },
        };
    } catch {
        return { success: false, error: "NETWORK_ERROR" };
    }
}

export async function updateIp(
    zoneId: string,
    recordId: string,
    hostname: string,
    ip: string,
    token: string
): Promise<ApiResult<{ recordId: string; hostname: string; ip: string; ttl: number; proxied: boolean }>> {
    // basic validation
    if (!zoneId || !recordId || !hostname || !ip || !token) {
        return { success: false, error: "INVALID_INPUT" };
    }

    try {
        const resp = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: "A",
                    proxied: false,
                    name: hostname,
                    content: ip,
                    ttl: 120,
                }),
            }
        );

        if (!resp.ok) {
            return { success: false, error: `HTTP_${resp.status}` };
        }

        const data: any = await resp.json();

        if (data?.success !== true) {
            // cố gắng lấy error message từ Cloudflare (nếu có) để debug
            const cfMsg =
                Array.isArray(data?.errors) && data.errors.length > 0
                    ? data.errors[0]?.message || data.errors[0]?.code
                    : undefined;

            return { success: false, error: cfMsg ? `CF_${cfMsg}` : "CF_UPDATE_FAILED" };
        }

        // trả về vài field hữu ích
        const result = data?.result;
        return {
            success: true,
            data: {
                recordId: result?.id ?? recordId,
                hostname: result?.name ?? hostname,
                ip: result?.content ?? ip,
                ttl: result?.ttl ?? 120,
                proxied: result?.proxied ?? false,
            },
        };
    } catch {
        return { success: false, error: "NETWORK_ERROR" };
    }
}