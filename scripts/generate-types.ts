import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Project, SyntaxKind } from "ts-morph";
import drizzleConfig from "../drizzle.config";

if (drizzleConfig.schema == null || drizzleConfig.schema.length === 0) {
	throw new Error("No schema files found in drizzle configuration");
}

const schemaFiles = typeof drizzleConfig.schema === "string" ?
	[drizzleConfig.schema] :
	drizzleConfig.schema;

console.log(`Preparing to read ${schemaFiles.length} schema files.`);

const project = new Project({
	tsConfigFilePath: "./tsconfig.json",
});

const constants = new Map<string, string>();
const types = new Map<string, string>();

for (const schemaFile of schemaFiles) {
	console.log(`\nReading ${resolve(schemaFile)}`);
	const initialCount = {
		types: types.size,
		constants: constants.size,
	};

	const sourceFile = project.getSourceFile(schemaFile);
	if (sourceFile == null) {
		throw new Error("Could not find the schema file.");
	}
	for (const variable of sourceFile.getVariableDeclarations()) {
		if (!variable.isExported()) continue;
		const name = variable.getName();
		if (name.endsWith("Relations")) continue;
		const initializer = variable.getInitializerIfKind(
			SyntaxKind.CallExpression,
		);
		if (initializer == null) continue;
		const fn = initializer.getExpressionIfKind(SyntaxKind.Identifier);
		if (fn == null) continue;

		const variableType = variable.getType();
		let typeName = name[0].toUpperCase() + name.slice(1);
		if (types.has(typeName)) {
			let count = 2;
			while (types.has(typeName + count)) count++;
			typeName += count;
		}

		if (fn.getText() === "pgTable") {
			const selectType = variableType
				.getPropertyOrThrow("$inferSelect")
				.getTypeAtLocation(sourceFile);
			types.set(typeName, selectType.getText());

			const insertType = variableType
				.getPropertyOrThrow("$inferInsert")
				.getTypeAtLocation(sourceFile);
			types.set(typeName + "Insert", insertType.getText());
		} else if (fn.getText() == "pgEnum") {
			const values = variableType.getPropertyOrThrow("enumValues")
				.getTypeAtLocation(sourceFile)
				.getTupleElements()
				.map((value) => value.getText());
			types.set(typeName, values.join(" | "));

			const constantName = typeName.replace(/([A-Z])/g, "_$1")
				.slice(1)
				.toUpperCase();
			constants.set(constantName, `[${values.join(", ")}]`);
		}
	}

	console.log(`Created ${constants.size - initialCount.constants} constants`);
	console.log(`Created ${types.size - initialCount.types} types`);
}

console.log(`\nGenerated ${constants.size} constants in total`);
console.log(`Generated ${types.size} types in total`);

const generatedCode = "" +
	Array.from(constants.entries())
		.map(([name, value]) => `export const ${name} = ${value} as const;`)
		.join("\n\n") +
	"\n\n" +
	Array.from(types.entries())
		.map(([name, value]) => `export type ${name} = ${value};`)
		.join("\n\n");

const filepath = resolve("./src/database/schema-types.ts");

writeFileSync(filepath, generatedCode);

console.log("Output written to", filepath);
