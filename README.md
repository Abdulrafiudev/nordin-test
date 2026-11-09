# Companies assessment

A small Next.js 16 App Router feature for finding, creating and editing companies. List and drawer state are shareable through the URL. Version conflicts preserve the user's draft and require an explicit review before resubmission.

## Run locally

Use Node.js 22 or later and pnpm 12.9.1. This project was checked with Node.js 24.21.0. No environment variables, backend service or account are required.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000/companies](http://localhost:3000/companies). The fake sign-in accepts any non-empty token; the supplied `demo-session` value works. It is stored in the current tab's session storage. Sign in separately in another tab to try concurrent edits.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`typecheck` generates Next.js route types before running TypeScript, so it also works on a fresh checkout. `test` runs once rather than starting a watch process. The lockfile pins dependency resolutions. A project-local pnpm store keeps installation consistent in this workspace and is ignored by Git.

Next.js uses the supported Webpack bundler for both development and production. Turbopack's PostCSS worker tried to bind a local port that this execution environment disallowed; Webpack builds the same App Router application without that restriction.

## What to review

- `/companies`: name/domain search, status, name/creation-date sort, and 20 records per page. Submit search with Enter or the Search button. The URL owns committed filters, sorting and pagination; browser Back/Forward and refresh restore them.
- Click a company or activate its name with the keyboard. The same drawer handles details, editing and creation. For example, `/companies?company=company-001` opens a shared detail link. `?drawer=create` opens creation. Closing or Escape preserves list parameters and restores focus.
- Switch EN/NL. Feature labels, statuses, validation and conflict messages change; dates use the selected locale and UTC. The switch preserves the current draft and filters.
- Create a company, try a blank name, and edit an existing one. Server 422 field errors are shown without clearing the form.
- Initial loads, refetches, empty results, list errors, drawer errors and missing details have independent states. During refetch the mounted table retains previous rows and identifies them as updating. A failed filter request can display the most recent successful cached list with a previous-results notice.

### Reproduce a version conflict

1. Sign in in two tabs and open the same company in both, before either saves.
2. In tab A, change its status and save.
3. In tab B, change its name and save. A 409 warning appears; the typed name remains intact. Even a background detail refetch must not advance the version captured by the form.
4. Choose **Reload latest and keep my edits**. The name is preserved, untouched fields take their latest saved values, and the latest values are displayed for comparison.
5. Review, then choose **Save reviewed changes**. This starts a new edit baseline at the fetched version. Another concurrent edit produces another 409; nothing is silently retried or overwritten.

Conflicts use optimistic concurrency, not optimistic UI: a save waits for an authoritative response. No extra conflict simulator is included.

## API contract

All four operations require `Authorization: Bearer <non-empty token>`. Responses, including errors, have a random 300–800 ms delay and `Cache-Control: no-store`.

| Operation | Behavior |
| --- | --- |
| `GET /api/v1/companies?limit&offset&q&status&sort` | `{ items, total, limit, offset }`; search name/domain, filter status, sort before pagination. |
| `GET /api/v1/companies/{id}` | Company or 404. |
| `POST /api/v1/companies` | `{ name, domain?, status? }`; returns 201 and version 1. |
| `PATCH /api/v1/companies/{id}` | `{ if_version, name?, domain?, status? }`; increments version, rejects stale versions with 409, missing records with 404. |

Sorting accepts `name`, `-name`, `created_at`, `-created_at`, with a deterministic ID tie-breaker. Search is a case-insensitive substring match. Defaults are `limit=20`, `offset=0`, `sort=name`, `status=new` on creation and `domain=null`. Invalid query/body fields return 422; malformed JSON returns 400. Names are trimmed and whitespace-only names are rejected. Blank domains become null; omitted PATCH fields remain unchanged. There is no additional domain-format rule in the brief, so a DNS/URL constraint is deliberately not added.

The process starts with 40 deterministic companies. **All data is in memory:** creating and editing are temporary, a restart resets the seed, and different server processes do not share state. Run a single local `next start` process for review. The final version check and write are synchronous with no intervening await, making the check atomic only inside that process. This is not a distributed persistence guarantee.

## Decisions and trade-offs

**State has three owners.** Normalized URL parameters produce the API input and the list query key. TanStack Query owns remote lists, details, loading/error state and mutations. Each form owns its draft and captured baseline/version. Query results never continually reset a form. The search input's unfinished text is local; only submission commits it to the URL.

**Thin typed client with runtime validation.** Zod schemas define the exact company contract, inputs, list results and error payload. A shared transport obtains the current token at request time, carries abort signals and validates unknown responses. Query helpers keep keys and request functions together. This imitates the generated client expected in the real product; no OpenAPI generation is claimed.

**Cache behavior follows authoritative results.** Successful writes cancel stale reads, publish the returned detail and invalidate all list variants. Blindly editing every cached list row could break filters, ordering and page totals. On 409, the detail is marked stale without resetting the draft, lists are invalidated and the user explicitly reloads. Only fields edited relative to the old baseline are reapplied onto the latest record for review. There is no automatic conflict resolution.

**Fake auth is explicitly limited.** Session storage makes the demo survive refresh in its tab. It is JavaScript-readable and is not a production credential-storage recommendation. An unauthorized response revokes the session, blocks subsequent token reads, cancels/clears company caches and triggers the protected screen's redirect to sign-in. Parallel 401s share one revocation/redirect. A local-only return path is validated before navigation. Queries do not retry 4xx errors; network/5xx queries have one retry; mutations never retry automatically. The mock accepts any token and has no token-expiry or refresh endpoint.

**Small server/client boundary.** The server renders the shell's heading and loads only the selected dictionary. Interactive controls and query consumers are client components under a Suspense boundary. A boundary-local hydration snapshot keeps the initial auth-dependent markup consistent even if the shared auth provider is ready before the streamed page hydrates. `loading.tsx` handles route loading, `error.tsx` handles unexpected render failures, and query/mutation errors have explicit local states. Company fetching stays client-side for this brief rather than adding unnecessary server prefetching.

**Accessible native controls.** A semantic table uses labelled sort buttons and `aria-sort`. Company-name buttons make rows keyboard-operable. A native modal `dialog` styled as a drawer provides browser focus trapping and background inertness; Escape updates URL state. Fields have labels and associated errors. Status/alert regions announce updates, failures and conflicts. Focus returns to the opener or the company heading. Motion respects reduced-motion preferences.

**A small locale layer.** A cookie selects a server-only, dynamically imported EN or NL dictionary; only that dictionary is passed to client components. `router.refresh()` updates the messages without keying/remounting the feature. Dates use `Intl.DateTimeFormat` with `en-GB`/`nl-NL`, UTC; counts use `Intl.NumberFormat`.

## Verification

The automated suite includes 42 tests across five files:

- Unit checks for URL normalization, query identity, drawer/list separation and safe return URLs.
- Client checks for current bearer-token injection, 401 behavior, 422 payloads and malformed successful responses.
- Component checks using real TanStack Query hooks and MSW HTTP mocks for filtering/history/table identity, captured-version 409 recovery and reviewed resubmission, validation, shared missing-record links, auth/cache clearing, locale changes with a dirty draft and keyboard focus wrapping.
- A server-render/hydration regression check where auth becomes ready before the company page hydrates; Create must become enabled with no hydration mismatch.
- Route Handler contract checks for the 40-record seed, paging, search/status, all four sorts, invalid parameters, all four auth checks, creation defaults, malformed JSON, whitespace validation, missing records, concurrent writes and delay bounds.

Verified on 9 November 2026: `pnpm lint`, `pnpm typecheck`, all 42 tests and `pnpm build` pass. Tests mock HTTP rather than replacing `useQuery`.

Production browser checks covered demo sign-in/out and return URLs, search and empty results, pagination, Back and refresh restoration, shared drawer refresh, creation and name validation, two-tab version conflict/reload/review/save, NL/EN changes with an open draft, forward/reverse focus wrapping, Escape and focus restoration. The final production console check showed no new errors or warnings after the hydration fix. HTTP 401/422 cases and response validation are also covered by automated tests. A [directory screenshot](output/screenshots/companies-directory.jpg) and [conflict review screenshot](output/screenshots/conflict-review.jpg) are retained as review evidence.

## Scope and what I would do with more time

The implementation deliberately omits delete/bulk actions, dashboard extras, real identity/refresh, durable storage, organization switching and a schema-generation pipeline. It does not preserve drafts after deliberate drawer close, navigation away or refresh. Locale changes and conflict recovery within an open drawer do preserve them. There is no complex domain validation, automatic field-conflict resolution or automated E2E suite.

For a production product I would use persistent storage with a transactional version predicate, the hosted identity SDK and appropriate token/session handling, an actual OpenAPI-generated client, API-enforced organization isolation and permissions, and browser automation for shared links, focus, authentication and two-tab conflicts. These belong to the production context, not this assessment's mock backend.

The assessment allows AI assistance. This implementation and its written-answer drafts were prepared with it; the candidate should review and be able to explain every submitted line.

## Written answers and planning references

[ANSWERS.md](ANSWERS.md) contains all nine Part 1 responses. Adapt first-person wording to your own understanding before submission.

The [PRD](output/pdf/companies-prd.pdf), [implementation plan](output/pdf/companies-implementation-plan.pdf) and [written-answer preparation PDF](output/pdf/assessment-written-answers.pdf) are retained as planning references. They describe proposed work and are not test reports. The implementation notes and checks above describe the actual code.

This folder is a Git repository with incremental commits. No remote repository or live deployment is configured; the assessment requires sharing a public or private repository with the reviewer, which still needs an account/destination.
