import esbuild from "esbuild";
import process from "process";
import { builtinModules } from "module";

const mode = process.argv[2] ?? "dev"; // dev | production | test

const common = {
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@electron/remote",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtinModules,
	],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: mode === "production" ? false : "inline",
	treeShaking: true,
};

if (mode === "test") {
	// 单独打包纯逻辑模块供 node 测试脚本使用
	await esbuild.build({
		entryPoints: ["src/rules.ts"],
		bundle: true,
		format: "esm",
		target: "es2020",
		outfile: ".test/rules.mjs",
		logLevel: "silent",
	});
	await esbuild.build({
		entryPoints: ["src/ingest.ts"],
		bundle: true,
		format: "esm",
		target: "es2020",
		outfile: ".test/ingest.mjs",
		external: ["obsidian"],
		logLevel: "silent",
	});
	await esbuild.build({
		entryPoints: ["src/diff.ts"],
		bundle: true,
		format: "esm",
		target: "es2020",
		outfile: ".test/diff.mjs",
		logLevel: "silent",
	});
	await esbuild.build({
		entryPoints: ["src/store.ts"],
		bundle: true,
		format: "esm",
		target: "es2020",
		outfile: ".test/store.mjs",
		logLevel: "silent",
	});
	await esbuild.build({
		entryPoints: ["src/dev.ts"],
		bundle: true,
		format: "esm",
		target: "es2020",
		outfile: ".test/dev.mjs",
		logLevel: "silent",
	});
	// test/integration.mjs loads the real plugin bundle, so build it here too (same
	// output as `production`, so a later install:vault can't ship a test build)
	await esbuild.build({
		...common,
		sourcemap: false,
		conditions: ["browser"],
		outfile: "main.js",
		logLevel: "silent",
	});
} else {
	const context = await esbuild.context({
		...common,
		outfile: "main.js",
		conditions: mode === "production" ? ["browser"] : undefined,
	});
	if (mode === "production") {
		await context.rebuild();
		context.dispose();
		process.exit(0);
	} else {
		await context.watch();
	}
}
