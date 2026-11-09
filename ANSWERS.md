# Written assessment answers

These are reasoned draft responses aligned with this implementation. Personalize them to your own understanding and be prepared to defend the code and the trade-offs.

## 1. Server and Client Component boundary

I use Server Components for the CRM page shell and headings because they need no browser interaction and can keep server-only work out of the client bundle. The filterable table and detail drawer are Client Components because they use event handlers, URL hooks, TanStack Query and editable state. I place the client boundary around that interactive feature, passing serializable data/messages across it while retaining the server layout and unrelated static content.

## 2. Server fetching and TanStack Query hydration

I would still fetch on the server when initial HTML needs the data, a server-only credential is required, or prefetching can remove a client waterfall. I create a request-scoped QueryClient, prefetch with the same key/options as the client, then dehydrate into a HydrationBoundary. The client hydrates that result with a suitable nonzero staleTime to avoid immediately fetching again; credentials stay outside the serialized cache. For this mock, company fetching stays client-side to keep the implementation proportionate.

## 3. Version conflicts in the UI and cache

On 409 I explain that someone else changed the company and keep the user's draft separate from the query cache, with no automatic mutation retry. I mark the detail stale and invalidate affected lists, while an explicit reload fetches the latest record without resetting the draft. The user reviews preserved edits against the latest values and explicitly resubmits against that new baseline's version; an optimistic cache change would first need rollback, so this build avoids optimistic write UI.

## 4. URL state and query keys

The URL owns committed search, status, sort and page; one parser produces the normalized API parameters and query key. Refresh and browser Back/Forward therefore restore the same results, and a filter change resets the page in the same URL update. Search commits on Enter/Search, meaningful changes push history entries, and only unfinished input stays local; the drawer ID is separate URL state that does not change the list key.

## 5. Shared access tokens and expiry

In the real product I inject the hosted identity SDK's async token getter into the client, so requests obtain a current access token and attach the bearer header without individual components handling credentials. I deduplicate renewal, allow at most one retry after a genuinely unauthenticated response, and clear auth/cache and redirect to sign-in if renewal fails; I never blindly replay writes after uncertain network failures. Tokens must not enter URLs, logs, analytics, cache keys, source control or serialized page data; production storage follows the provider's guidance rather than defaulting to localStorage. Part 2 instead uses a tab-local demo token, revokes it on 401 and redirects without pretending there is a refresh endpoint.

## 6. Loading, errors, empty states and boundaries

I use loading.tsx for route loading and error.tsx for unexpected render failures, with Suspense around genuinely suspending subtrees and the useSearchParams client entry where prerendering requires it. Table and drawer queries have independent loading, retry and empty/not-found states: ordinary useQuery and mutation errors are handled explicitly rather than automatically by Suspense or a route error boundary. I keep the table mounted during filter refetches with previous data and an updating indicator, and avoid a boundary that blanks the whole screen whenever the drawer loads.

## 7. Dutch and English

I resolve one locale on the server, dynamically load only its dictionary through a server-only loader, and pass the needed messages/locale to client components. To retain the specified /companies path, this build uses a locale cookie rather than adding language-prefixed routes, then refreshes the server-rendered messages when toggled. Server/client formatting uses the same locale and timezone through Intl.DateTimeFormat and Intl.NumberFormat, so dates and counts agree without bundling both dictionaries into the initial client payload.

## 8. Measuring and improving a slow page

I reproduce a specific slow interaction in a production build, separating server/API latency, request waterfalls, JavaScript download/hydration and React rendering using browser traces and profiling. I check TTFB, LCP and INP alongside query timings, comparing cold/warm cache and representative network conditions; the mock's intentional delay is not evidence of a rendering defect. Two App Router features I would use are Server Components to reduce unnecessary client JavaScript and streaming through focused Suspense/loading.tsx boundaries so ready content can appear before slower regions; I verify the improvement against the same scenario.

## 9. Testing strategy

I unit test URL normalization, query identity and validation because these encode small deterministic contracts. I component-test filters through real controls and mocked HTTP, plus the complete 409 sequence: original version sent, draft retained, latest reload, explicit reviewed resubmission and cache refresh. E2E tests are best for actual routing/history, shared drawer links, auth redirects and focus trapping, which a simulated DOM cannot fully prove; this scoped submission prioritizes the required component/unit coverage and browser smoke checks.

## Supporting references

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [TanStack Query server rendering and hydration](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [Next.js native History API](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api)
- [TanStack Query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Next.js error handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [Next.js internationalization](https://nextjs.org/docs/app/guides/internationalization)
- [Auth0 token storage guidance](https://auth0.com/docs/secure/security-guidance/data-security/token-storage)

The architecture, conflict UX and testing priorities are engineering choices, not extra requirements imposed by these references.
