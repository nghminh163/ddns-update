import { getIPOfHostname, updateIp } from "./cloudflare";
import { parseBasicAuth } from "./utils";

export async function handleUpdate(request: Request): Promise<Response> {
    const url = new URL(request.url);

    const hostname = url.searchParams.get("hostname");
    const ip = url.searchParams.get("myip");
    if (!hostname || !ip) {
        return new Response("Bad Request", {
            status: 400
        });
    }
    const auth = await parseBasicAuth(request);

    if (!auth) {
        return new Response("Unauthorized", {
            status: 401
        });
    }
    const { zoneId, token } = auth;
    const currHostname = await getIPOfHostname(zoneId, hostname, token);
    if (!currHostname.success) {
        return new Response("Failed to get current hostname IP", {
            status: 500
        });
    }
    const currIp = currHostname.data?.ip;
    if (currIp === ip) {
        return Response.json({
            message: "IP is already up to date"
        });
    }
    const updateResult = await updateIp(zoneId, currHostname.data?.id ?? "", hostname, ip, token);
    if (!updateResult.success) {
        return new Response("Failed to update IP", {
            status: 500
        });
    }

    return Response.json({
        message: "Update successful"
    });
}