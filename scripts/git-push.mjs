/**
 * git-push.mjs
 * Push workspace to GitHub using isomorphic-git (no system git required).
 *
 * Usage:
 *   node scripts/git-push.mjs <github-username> <github-token-or-password> [commit-message]
 *
 * Example:
 *   node scripts/git-push.mjs tuhinnub ghp_xxxxxxxxxxxx "feat: favicon + responsive layout"
 */

import git from "isomorphic-git";
import http from "isomorphic-git/http/node/index.cjs";
import fs from "node:fs";
import path from "node:path";

const [, , username, token, commitMsg = "feat: custom favicon + full responsive layout"] =
  process.argv;

if (!username || !token) {
  console.error(
    "Usage: node scripts/git-push.mjs <github-username> <github-token> [commit-message]",
  );
  process.exit(1);
}

const dir = path.resolve(process.cwd());
const remoteUrl = "https://github.com/tuhinnub/prime-library-nexus.git";
const branch = "main";

const author = { name: username, email: `${username}@users.noreply.github.com` };
const onAuth = () => ({ username, password: token });

async function run() {
  // 1. Init repo (safe to call even if already inited)
  console.log("→ Initializing git repo…");
  await git.init({ fs, dir, defaultBranch: branch });

  // 2. Set remote
  const remotes = await git.listRemotes({ fs, dir });
  if (remotes.find((r) => r.remote === "origin")) {
    await git.deleteRemote({ fs, dir, remote: "origin" });
  }
  await git.addRemote({ fs, dir, remote: "origin", url: remoteUrl });
  console.log("→ Remote set to", remoteUrl);

  // 3. Try to fetch existing history so we can fast-forward / merge
  console.log("→ Fetching remote history…");
  try {
    await git.fetch({
      fs,
      http,
      dir,
      remote: "origin",
      ref: branch,
      onAuth,
      singleBranch: true,
      depth: 1,
    });
    console.log("  Remote history fetched.");
  } catch (e) {
    console.warn("  Could not fetch (repo may be empty or unreachable):", e.message);
  }

  // 4. Stage all files
  console.log("→ Staging all files…");
  await git.add({ fs, dir, filepath: "." });
  const statusMatrix = await git.statusMatrix({ fs, dir });
  const staged = statusMatrix.filter(([, head, work, stage]) => stage !== head || work !== stage);
  console.log(`  ${staged.length} file(s) staged.`);

  // 5. Commit
  console.log("→ Creating commit…");
  const sha = await git.commit({ fs, dir, message: commitMsg, author });
  console.log("  Commit SHA:", sha);

  // 6. Push
  console.log(`→ Pushing to origin/${branch}…`);
  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: "origin",
    ref: branch,
    onAuth,
    force: false,
  });

  if (pushResult.ok) {
    console.log("✅ Push succeeded!");
    console.log(`   https://github.com/tuhinnub/prime-library-nexus`);
  } else {
    console.error("❌ Push errors:", pushResult.errors);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal:", err.message || err);
  process.exit(1);
});
