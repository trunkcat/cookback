import { config } from "dotenv";

config({ path: ".env" });

const PRIM_TYPES = ["number", "string"] as const;
type Prim = typeof PRIM_TYPES[number];
type Value = Prim | `${Prim}?`;
type EnvSchema = Record<string, Value>;
type PrimReturnType<T> = T extends "number" ? number :
	T extends "string" ? string :
	never;
type ValueReturnType<T> = T extends `${infer R}?` ?
	PrimReturnType<R> | undefined :
	PrimReturnType<T>;
type CleanRT<T extends EnvSchema> = {
	[K in keyof T]: T[K] extends Value ? ValueReturnType<T[K]> :
		null;
};

function isPrimType(type: string): type is Prim {
	return PRIM_TYPES.some((prim) => prim === type);
}

function clean<T extends Record<string, Value>>(values: T): CleanRT<T> {
	const result: Record<string, ValueReturnType<Value>> = {};
	for (const name in values) {
		const typeValue = values[name].split("?");
		const isOptional = typeValue.length > 1;
		const primType = typeValue[0];
		if (!isPrimType(primType)) {
			throw new Error("Invalid type: " + values[name]);
		}
		const value = process.env[name];
		if (value == null) {
			if (isOptional) {
				result[name] = undefined;
				continue;
			} else {
				throw new Error("Missing required environment variable: " + name);
			}
		}

		let resolved: string | number | null = null;
		switch (primType) {
			case "string":
				if (typeof value === "string") {
					resolved = value;
				}
				break;
			case "number": {
				const num = Number(value);
				if (!isNaN(num)) {
					resolved = num;
				}
				break;
			}
			default:
				throw new Error("Unexpected primitive type: " + primType);
		}
		if (resolved == null) {
			throw new Error(name + " is not of the type: " + primType);
		}
		result[name] = resolved;
	}
	return result as unknown as CleanRT<T>;
}

export const env = clean({
	DATABASE_URL: "string",
	HOSTNAME: "string?",
	PORT: "number",
	FRONTEND_ORIGIN: "string",
	SUPERMANAGER_USERNAME: "string",
	SUPERMANAGER_PASSWORD: "string",
	NODE_ENV: "string",
});
