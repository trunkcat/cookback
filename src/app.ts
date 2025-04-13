import { Application } from "@oak/oak";
import { config } from "dotenv";
import { networkInterfaces } from "node:os";
import { router } from "./routes/index.js";

config({ path: ".env" });

const app = new Application();

app.use(async (ctx, next) => {
	ctx.response.headers.set("Access-Control-Allow-Origin", "*");
	ctx.response.headers.set("Access-Control-Allow-Credentials", "true");
	ctx.response.headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type,Authorization",
	);
	await next();
});

app.use(async (ctx, next) => {
	try {
		console.log(ctx.request.method, ctx.request.url.pathname);
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

const port = Number(process.env.PORT ?? 0);
if (isNaN(port)) throw new Error("Invalid PORT specified");

const hostname = process.env.HOSTNAME;

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
