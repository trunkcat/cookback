import { Application } from "@oak/oak";
import { networkInterfaces } from "node:os";
import { env } from "./env.js";
import { router } from "./routes/index.js";
import { cors } from "./utilities.js";

const app = new Application();

app.use(cors);

app.use(async (ctx, next) => {
	try {
		console.log("\n" + ctx.request.method, ctx.request.url.pathname);
		await next();
	} catch (error) {
		console.error(error);

		ctx.response.status = 500;
		ctx.response.headers.set("Content-Type", "application/json");
		ctx.response.body = { ok: false, message: "Internal Server Error" };
	}
});

app.use(router.routes());
app.use(router.allowedMethods());

const port = env.PORT;
if (port <= 0) throw new Error("Port must be a natural number");

const hostname = env.HOSTNAME;

if (hostname == null || hostname.length == 0 || hostname === "0.0.0.0") {
	const interfaces = networkInterfaces();
	const boundAddresses = Object.values(interfaces)
		.filter((addresses) => addresses != null)
		.flatMap((addresses) => {
			return addresses
				.filter((address) => !address.internal && address.family === "IPv4")
				.map((address) => address.address);
		});
	console.log(
		"Cook backend is now running in the following addresses:\n\n" +
			`-> Local:   http://localhost:${port}\n` +
			boundAddresses
				.map((addr) => `-> Network: http://${addr}:${port}`)
				.join("\n"),
	);
} else {
	console.log(
		`Starting app at specified http://${hostname ?? "localhost"}:${port}`,
	);
}

app.listen({ port, hostname: hostname ?? "0.0.0.0" });
