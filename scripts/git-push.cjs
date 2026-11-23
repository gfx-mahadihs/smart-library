/**
 * git-push.cjs
 * Push workspace to GitHub using isomorphic-git (no system git required).
 *
 * Usage:
 *   node scripts/git-push.cjs <github-username> <github-token> [commit-message]
 *
 * Example:
 *   node scripts/git-push.cjs tuhinnub ghp_xxxx "feat: custom favicon + responsive layout"
 */

const git = require("isomorphic-git");
const http = require("isomorphic-git/http/node");
const fs = require("node:fs");
const path = require("node:path");

const [
  ,
  ,
  username,
  token,
  commitMsg = "feat: interactive bookshelf display, category filtering, and book page reader",
  customRemote,
] = process.argv;

if (!username || !token) {
  console.error(
    "Usage: node scripts/git-push.cjs <github-username> <github-token> [commit-message] [remote-url]",
  );
  process.exit(1);
}

const dir = path.resolve(process.cwd());
const remoteUrl = customRemote || `https://github.com/${username}/prime-library-nexus.git`;
const branch = "main";
const author = { name: username, email: `${username}@users.noreply.github.com` };
const onAuth = () => ({ username, password: token });

async function run() {
  // 1. Init repo
  console.log("→ Initializing git repo in", dir);
  await git.init({ fs, dir, defaultBranch: branch });

  // 2. Set remote
  const remotes = await git.listRemotes({ fs, dir });
  if (remotes.find((r) => r.remote === "origin")) {
    await git.deleteRemote({ fs, dir, remote: "origin" });
  }
  await git.addRemote({ fs, dir, remote: "origin", url: remoteUrl });
  console.log("→ Remote set to", remoteUrl);

  // 3. Fetch remote history (so we don't orphan existing commits on GitHub)
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
      depth: 50,
    });
    console.log("  Remote history fetched OK.");

    // Set our local branch to track FETCH_HEAD so push is a fast-forward
    const fetchHead = await git.resolveRef({ fs, dir, ref: "FETCH_HEAD" });
    console.log("  Remote HEAD:", fetchHead);
    // Write it as the parent so our commit sits on top of remote history
    await git.writeRef({ fs, dir, ref: `refs/heads/${branch}`, value: fetchHead, force: true });
    console.log("  Local branch set to remote HEAD.");
  } catch (e) {
    console.warn("  Fetch failed (repo may be empty or first push):", e.message);
  }

  // 4. Stage all files (respects .gitignore automatically)
  console.log("→ Staging all files…");
  await git.add({ fs, dir, filepath: "." });

  const statusMatrix = await git.statusMatrix({ fs, dir });
  const changed = statusMatrix.filter(
    ([, head, work, stage]) => !(head === 1 && work === 1 && stage === 1), // unchanged = 1,1,1
  );
  console.log(`  ${changed.length} file(s) changed/staged.`);

  // 5. Commit
  console.log("→ Creating commit:", commitMsg);
  const sha = await git.commit({ fs, dir, message: commitMsg, author });
  console.log("  Commit SHA:", sha);

  // 6. Push
  console.log(`→ Pushing to origin/${branch}…`);
  const result = await git.push({
    fs,
    http,
    dir,
    remote: "origin",
    ref: branch,
    onAuth,
    force: false,
  });

  console.log("Push result:", JSON.stringify(result, null, 2));

  if (result.ok) {
    console.log("\n✅ Push succeeded!");
    console.log("   " + remoteUrl);
  } else {
    console.error("\n❌ Push had errors:", result.errors);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error:", err.message || err);
  process.exit(1);
});
