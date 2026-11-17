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
- Share profile statistics and biography presentation between personal and public profiles, with styles scoped to `.profile-page` so other screens keep their existing appearance.
- Authorize every administrative server handler through authenticated `has_role` checks before privileged access; never grant roles using client credentials or profile fields, preventing self-promotion.
