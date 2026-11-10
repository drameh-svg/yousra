# Test Monday, November 9; present Monday, November 16

## First local test

1. Run `npm run dev` and create two test accounts.
2. Complete onboarding with different swipes and questionnaire answers.
3. Confirm that a short-sleeve reference is excluded for a confident long-sleeve-only profile. Unknown fabric coverage should appear below confident matches.
4. Like and dislike pieces. Refresh. Check that Likes stays synchronized and dislikes disappear from For You.
5. Make a private collection. Sign into the other account and confirm it cannot see it.
6. Open a card's direct shop link and a detail-page link. Confirm sample clicks appear only in sample counts.

## Monday's live acceptance test

1. Configure Supabase, Google, Serper and Gemini. Keep paid billing off.
2. Sign up with email, verify the email, then sign in. Separately test Google sign-in.
3. Search for three concrete queries, including a price limit. Confirm initial results appear before analysis completes.
4. Inspect at least ten results manually: correct sale garment, original retailer URL, real image, price/currency, modesty, and shipping evidence. Check that unknown facts are not presented as confirmed.
5. Verify the image analysis field says `vision+description` on successfully analyzed products. If retailer/image retrieval or provider quotas fail, the UI must label them uncertain.
6. Test the same query twice to verify cached results avoid repeated provider usage.
7. Follow one real outbound link. In Supabase, check the event timestamp, user ID, store, product, placement, and non-demo flag.
8. Have your friend connect her frontend using `docs/API.md`; keep the API on the same origin.

## Refinement through the week

- Replace private reference photos with owned/licensed onboarding photos and check the 15 photos load reliably on phones.
- Test with a few US shoppers, observe search relevance, and collect examples of incorrect coverage judgments.
- Tune the attribute confidence threshold and taste weights based on those examples.
- Expand extraction only where necessary; do not add fragile retailer-specific workarounds without evidence that they improve users' results.
- Confirm real signup, email confirmation, Google callback and session refresh on the actual deployed domain.
- Add password reset/account deletion before a broader public rollout. These are not included in the first test UI.
- Apply for affiliate programs after core discovery works. Verify approved links before enabling a retailer rule.
- For the presentation, show real users, unique clickers, outbound clicks by retailer, and actual feedback. Distinguish test/demo activity and avoid claiming click counts are purchases.

## Intentionally deferred

Photo search, outfits/wardrobe styling, resale, tailoring, other countries, shared collections, affiliate conversion ingestion, and a trained collaborative model. Trending-search aggregation, password reset and account deletion also remain follow-up work. Broad web coverage remains dependent on the search index and retailer accessibility.
