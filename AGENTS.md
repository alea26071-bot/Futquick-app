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

- Scope pelada detail presentation styles under `.pelada-detail` and use existing font and theme tokens so other screens remain unchanged.
- Store regional game terminology on the authenticated profile; share creation labels through the authenticated layout provider and validate preference writes in an authenticated server function.
- Share supported sport IDs, labels and cover prompt subjects through the browser-safe modality catalog; persist the chosen sport in field_type so creation, recurring games and existing displays use the same identity.
- Resolve discovery sport filters from the modality catalog and combine selected categories with one field_type IN query so Other sports never conflict with football selections.
- Share profile statistics and biography presentation between personal and public profiles, with styles scoped to `.profile-page` so other screens keep their existing appearance.
- Share the Embla profile cover between personal and visitor profiles; persist ordered private-storage paths and refresh signed URLs so covers survive sessions without expiring links in profile data. Validate owner paths and the three-photo limit on the server and database.
- Upload cover selections as an ordered batch with one profile save; use separate cover/avatar compression settings so full-width photos retain detail without changing chat or game uploads.
- Authorize every administrative server handler through authenticated `has_role` checks before privileged access; never grant roles using client credentials or profile fields, preventing self-promotion.
- Share the seven-step registration UI between phone signup and authenticated onboarding; OAuth confirms identity without setting a replacement password, and profile completion requires region, radius and avatar before app access.
- Enforce conversation deadlines with restrictive RLS and a claimed server cleanup; remove media through Storage before transactional conversation deletion so failures remain retryable.
- Prune only inactive recurrence definitions above the retention target; retain individual games and mark their recurring origin so player history survives foreign-key detachment.

- Persist confirmed attendance separately from reservations, reuse star ratings, and store posture separately; authenticated RPCs enforce eligibility and immutable submissions while triggers alone update profile averages.
- Reuse user_follows for social lists through authenticated safe-column RPCs; accepted-participation triggers create deduplicated nearby follower notifications and a service-only push queue, dispatched by participation handlers and retried by the existing hourly reminder job.
- Native Android/iOS apps are a Capacitor shell loading the published SSR site (server.url); native features run only behind `isNativeApp()` so the browser experience and Web Push stay unchanged.
- Native push tokens live in `push_devices` and are sent through the Firebase Cloud Messaging connector from the same notification helpers as Web Push, so each device receives one channel.
- AdMob stays disabled unless the public enable flag is set and uses only Google test units until real IDs are configured.
