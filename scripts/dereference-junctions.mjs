// Windows-only postbuild fix.
//
// `next build` links traced packages into .next/node_modules as NTFS junctions,
// which Windows allows without elevation. @netlify/plugin-nextjs then copies
// that tree with fs.cp, which faithfully recreates each link - but as a real
// symlink, and creating one of those needs Administrator or Developer Mode.
// The deploy dies with `EPERM: operation not permitted, symlink`.
//
// Replacing the junctions with plain directories before the plugin runs gives
// it nothing to recreate. No-op on Linux/macOS, so CI builds are unaffected.
import { cp, lstat, readdir, readlink, rm, rename } from "node:fs/promises";
import { join } from "node:path";

if (process.platform !== "win32") process.exit(0);

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    const stats = await lstat(path).catch(() => null);
    if (!stats) continue;

    if (stats.isSymbolicLink()) {
      const target = await readlink(path).catch(() => null);
      if (!target) continue;
      const staging = `${path}.__real`;
      await cp(target, staging, { recursive: true, dereference: true });
      await rm(path, { recursive: true, force: true });
      await rename(staging, path);
      console.log(`dereferenced ${path}`);
      continue;
    }

    if (stats.isDirectory()) await walk(path);
  }
}

await walk(join(process.cwd(), ".next"));
