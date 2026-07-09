// Propagates the version from package.json into the Tauri sources so a single
// `npm version patch|minor|major` bumps everything in one commit (wired via the
// "version" lifecycle script in package.json). The release workflow refuses tags
// that don't match tauri.conf.json, so a missed sync fails fast in CI.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const version = JSON.parse(readFileSync("package.json", "utf8")).version;

const confPath = "src-tauri/tauri.conf.json";
const conf = JSON.parse(readFileSync(confPath, "utf8"));
conf.version = version;
writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");

const tomlPath = "src-tauri/Cargo.toml";
const toml = readFileSync(tomlPath, "utf8").replace(/^version = ".*"$/m, `version = "${version}"`);
writeFileSync(tomlPath, toml);

// Sync Cargo.lock's parchmint entry without a build.
execSync("cargo metadata --format-version 1 --manifest-path src-tauri/Cargo.toml", { stdio: "ignore" });

console.log(`Synced version ${version} to tauri.conf.json, Cargo.toml, Cargo.lock`);
