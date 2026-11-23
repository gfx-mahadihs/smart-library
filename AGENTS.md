<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- UI talks to library data only through `src/services` (LibraryService interface); swap the binding there to plug in the C++ core via HTTP. Why: keeps pages backend-agnostic.
- Reservation/cancel/mark-read go through security-definer SQL functions, never direct table writes from users. Why: server-side rule enforcement.
- Signed-in pages live under the `_authenticated` pathless layout (client-only). Why: session is in browser storage.
- Management pages share a nested administration layout; access comes from a database-validated capability RPC and every mutation is independently protected by RLS or an authorized RPC. Why: navigation guards cannot secure data endpoints.
- Only super-admin role-change RPCs may modify role membership; self-changes and removal of the last super admin are blocked under a transaction lock. Why: prevents escalation and administrator lockout.
- Audit privileged catalogue, circulation, rules, and role mutations with database triggers. Why: records changes regardless of the UI entry point.
- Book cover uploads and signed URL resolution go through LibraryService; store durable private-storage references, not expiring URLs. Why: admin-only upload policies protect writes while signed-in readers can view covers.

- Public catalogue reads use the publishable-key server function through LibraryService; public routes reuse catalogue/detail views and never load private member data while signed out. Why: supports SSR without bypassing RLS or changing the C++ adapter boundary.
- Both public catalogue entry routes share search validation and query-reset retries; search inputs read URL state directly. Why: prevents filter navigation from erasing search and retries from reloading a failed SSR page.
- Visitors resolve private book covers through a server function that verifies the exact stored reference through anonymous catalogue RLS before signing for five minutes; never grant anonymous storage reads. Why: blocks direct storage listing and signing of unpublished files while preserving public covers.

- New retention and engagement tables require RLS, authenticated least-privilege grants, and security-definer RPCs for renewals, waitlists, reviews, and staff waivers. Why: member-specific state and library rules must be enforced at the database boundary.
- Long-lived feature rules belong in numbered migrations and in LibraryService adapters, with C++ returning graceful fallbacks when an endpoint is unavailable. Why: keeps deployments reversible and prevents UI/backend drift.
- Public notice, review, recommendation, and catalogue surfaces are cache-safe while member mutations remain session-bound. Why: preserves SSR/public browsing and prevents anonymous data access.
