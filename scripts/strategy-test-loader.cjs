const path = require("node:path"),
  Module = require("node:module");
const web = Module.createRequire(path.resolve("apps/web/package.json"));
const esbuild = Module.createRequire(web.resolve("vite"))("esbuild");
const build = esbuild.buildSync({
  stdin: {
    contents: `export * from './packages/shared/src/three-strategies/index.ts'; export * from './packages/shared/src/three-strategies/fixtures.ts'; export * from './packages/shared/src/three-strategies/import.ts'; export * from './packages/shared/src/three-strategies/academy.ts'; export * from './packages/shared/src/gold-range-academy.ts'; export * from './packages/shared/src/academy-catalog.ts'; export {academy} from './workers/api-gateway/src/routes/academy.ts'; export {strategyReviews} from './workers/api-gateway/src/routes/strategyReviews.ts'; export {academyMedia} from './workers/api-gateway/src/routes/academyMedia.ts'; export {strategyHub,strategyHubPublic} from './workers/api-gateway/src/routes/strategyHub.ts';export {Hono} from 'hono';`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  nodePaths: [path.resolve("workers/api-gateway/node_modules")],
});
const m = new Module(path.resolve("scripts/strategy.bundle.cjs"), module);
m.filename = m.id;
m.paths = module.paths;
m._compile(build.outputFiles[0].text, m.filename);
module.exports = m.exports;
