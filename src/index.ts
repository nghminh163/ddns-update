import { handleUpdate } from "./update";

const routes: Record<string, (request?: Request) => Response | Promise<Response>> = {
	"/": () => new Response("Hello World!"),
	"/update": (request?: Request) => {
		if (!request) {
			return new Response("Bad Request", { status: 400 });
		}
		return handleUpdate(request);
	},
};

export default {
	async fetch(request: Request): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (routes[pathname]) {
			return routes[pathname](request);
		}

		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler;