// Explicit, documented weighting: a review counts most, then a comment, then a save,
// then a like, then raw traffic. See docs/solution-social.md, docs/reviews.md and
// CriteriosStory.
//
// The four arguments are no longer raw counts — src/lib/solutions/public.ts
// computes them in SQL as decayed, verified-only sums before calling this:
// each signal's age applies an exponential half-life (recent interaction
// weighs more than old interaction, so one early push doesn't fix the order
// forever), only accounts with a verified email count, and a founder's own
// save/like/comment on their own ficha is excluded even though it stays
// visible. Views keep no such per-account filter (they're anonymous by
// design) but get diminishing returns via ln(1+x): 10,000 old views should
// not drown out 5 real comments. The *raw*, undecayed counts (likes, saves,
// comments, views) are computed separately and shown as-is everywhere a
// number is displayed — this function only ever feeds the sort order.
//
// `reviews` arrives already weighted: each public review adds its stars times the
// author's verification weight (reviewWeights in src/lib/reviews/model.ts), decayed
// like the rest. A five-star review from a company address weighs 7.5; a one-star
// review from a free mailbox weighs 1 — it never subtracts, so a competitor cannot
// sink a ficha by leaving low ratings, only fail to lift it.
export const solutionScore = (
  likes: number,
  saves: number,
  comments: number,
  views: number,
  reviews = 0,
) => likes + saves * 2 + comments * 3 + reviews + Math.log1p(views) * 0.1;

// Half-life in days for the exponential decay applied to likes/saves/comments
// and to each day's view count. A single constant, consumed by the SQL in
// public.ts (extract(epoch...)/86400 for account-linked signals, current_date
// arithmetic for daily view rows) so there is exactly one place to tune it.
export const rankingHalfLifeDays = 60;
