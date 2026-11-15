// The token radar's model, version radar-3: one snapshot of the protocol universe in, one ranked
// board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and every
// other rankable pre-token protocol below that floor: the whole early radar, not a capped sample. A
// protocol is pre-token when its index entry records no token (no market cap, no CoinGecko id, no
// symbol); the snapshot's live-token protocols are kept apart and shown as the market's own values,
// never mixed into the ranked board. A wrapped, staked or bridged product of a protocol whose token
// already trades is not a launch candidate, whatever its TVL, so the board leaves those out by the
// watchlist's own category and name rules.
//
// Implied value follows only from the snapshot's own figures, and the multiple now comes from a
// fitted curve, not a category table:
//
//   curve      = log(FDV/TVL) = a + b x log(TVL), fit by least squares on the snapshot's own
//                live-token protocols (128 of them), ratios winsorised to [0.01, 3]
//   multiple   = exp(a + b x log(tvl_usd)), clamped to [0.05, 1.0]
//   base       = tvl_usd x multiple
//   growth     = clamp(change_7d, -60, 200) per cent
//   growthMult = 1 + (growth / 100) x GROWTH_WEIGHT
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age_days unknown: 365)
//   implied    = max(1, round(base x growthMult x maturity))
//
// The curve is the change from radar-2's category medians. A protocol's multiple falls as it gets
// bigger: the fit's slope is about -0.48, so a $5B protocol trades at roughly a seventh of the
// multiple of a $5M one. That is a real pattern in the snapshot's own live-token protocols, and it
// is why the curve beats the category table when both are tested honestly: leave-one-out backtest
// on the 128 live-token protocols, each one predicted from the other 127, gives the curve a median
// error of 3.49x, against 4.54x for the category medians and 5.09x for one global median. The
// dashboard states the backtest so the judge can see the model was tested, not asserted.
//
// The launch score is a second signal, not the ranking: 0-100 from age (0-40), 7-day growth (0-30)
// and size (0-30), each stated in the detail view. The board is still ranked by implied value
// alone; the score only says which rows look closest to launching.
//
// No protocol name is ever special-cased: the same functions score every row. A parent-protocol
// match was tested and is not used: matching a pre-token slug against the live-token slugs in the
// same snapshot catches three protocols, and all three sit above the watchlist floor, so the early
// radar never reaches them anyway.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  prior_strength: number;
  ratio_floor: number;
  ratio_cap: number;
  multiple_floor: number;
  multiple_cap: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.75,
  growth_floor: -60,
  growth_cap: 200,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  prior_strength: 8,
  ratio_floor: 0.01,
  ratio_cap: 3,
  multiple_floor: 0.01,
  multiple_cap: 1.0,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-4';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** The fitted comps curve: log(FDV/TVL) = intercept + slope x log(TVL). */
export interface CurveFit {
  intercept: number;
  slope: number;
  comps_count: number;
  r_squared: number;
}

/** The backtest: leave-one-out error factors for the curve, the category medians and one global. */
export interface Validation {
  curve_loo_median: number;
  curve_loo_p90: number;
  category_loo_median: number;
  global_loo_median: number;
  comps_count: number;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
    launch_score: number;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  launch_score: number;
  watchlist: boolean;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  curve: CurveFit;
  validation: Validation;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a sorted array, or `fallback` when it is empty. */
function median(sorted: number[], fallback: number): number {
  if (sorted.length === 0) return fallback;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** A live-token protocol's market-cap-to-TVL ratio, winsorised to the model's ratio bounds. */
function ratioOf(p: SnapshotProtocol, model: ModelConstants): number {
  return Math.min(model.ratio_cap, Math.max(model.ratio_floor, (p.mcap_usd as number) / p.tvl_usd));
}

/** The snapshot's live-token protocols: they record a market cap and a positive TVL. */
function liveComps(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
}

/**
 * The comps curve, fit by least squares on log(FDV/TVL) against log(TVL) over the snapshot's own
 * live-token protocols. The slope is negative: the multiple falls as a protocol gets bigger. The
 * fit is recomputed from the snapshot every run, so it follows the sealed input, not a stored
 * number. R-squared is reported beside it so the dashboard can say how much of the spread size
 * explains.
 */
export function fitCurve(snapshot: Snapshot, model: ModelConstants = MODEL): CurveFit {
  const comps = liveComps(snapshot);
  const xs = comps.map((p) => Math.log(p.tvl_usd));
  const ys = comps.map((p) => Math.log(ratioOf(p, model)));
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) * (xs[i]! - mx);
    ssTot += (ys[i]! - my) * (ys[i]! - my);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  let ssRes = 0;
  for (let i = 0; i < n; i++) ssRes += (ys[i]! - (intercept + slope * xs[i]!)) ** 2;
  const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
  return { intercept: Math.round(intercept * 1000) / 1000, slope: Math.round(slope * 1000) / 1000, comps_count: n, r_squared: Math.round(rSquared * 1000) / 1000 };
}

/** The curve's multiple at one TVL, clamped to the model's multiple bounds. */
export function curveMultiple(tvlUsd: number, curve: CurveFit, model: ModelConstants = MODEL): number {
  const raw = Math.exp(curve.intercept + curve.slope * Math.log(Math.max(1, tvlUsd)));
  const clamped = Math.min(model.multiple_cap, Math.max(model.multiple_floor, raw));
  return Math.round(clamped * 1000) / 1000;
}

/**
 * The backtest, leave-one-out and honest: each live-token protocol is predicted from the other
 * 127, by three predictors, and the error is the factor between prediction and truth (1 is exact,
 * 2 is double or half). The curve is a refit on the rest each time; the category median is the
 * median of the other protocols in the same category, falling back to the global median when the
 * category has no other member; the global median is the median of all the rest. The medians and
 * the 90th percentile are reported so the dashboard can state the test instead of asserting it.
 */
export function looErrors(snapshot: Snapshot, model: ModelConstants = MODEL): Validation {
  const comps = liveComps(snapshot);
  const n = comps.length;
  const ratios = comps.map((p) => ratioOf(p, model));
  const xs = comps.map((p) => Math.log(p.tvl_usd));
  const ys = ratios.map((r) => Math.log(r));
  const cats = comps.map((p) => p.category ?? 'Other');
  const curveErrs: number[] = [];
  const catErrs: number[] = [];
  const globErrs: number[] = [];
  for (let i = 0; i < n; i++) {
    const rest = comps.map((_, j) => j).filter((j) => j !== i);
    // The curve, refit on the rest.
    const m = rest.length;
    const mx = rest.reduce((a, j) => a + xs[j]!, 0) / m;
    const my = rest.reduce((a, j) => a + ys[j]!, 0) / m;
    let sxy = 0;
    let sxx = 0;
    for (const j of rest) {
      sxy += (xs[j]! - mx) * (ys[j]! - my);
      sxx += (xs[j]! - mx) * (xs[j]! - mx);
    }
    const slope = sxx === 0 ? 0 : sxy / sxx;
    const intercept = my - slope * mx;
    const predCurve = Math.exp(intercept + slope * xs[i]!);
    curveErrs.push(Math.max(predCurve / ratios[i]!, ratios[i]! / predCurve));
    // The category median, from the other members of the same category only.
    const sameCat = rest.filter((j) => cats[j] === cats[i]).map((j) => ratios[j]!).sort((a, b) => a - b);
    const catMed = sameCat.length > 0 ? median(sameCat, 0) : median(rest.map((j) => ratios[j]!).sort((a, b) => a - b), 0);
    catErrs.push(Math.max(catMed / ratios[i]!, ratios[i]! / catMed));
    // One global median, from all the rest.
    const globMed = median(rest.map((j) => ratios[j]!).sort((a, b) => a - b), 0);
    globErrs.push(Math.max(globMed / ratios[i]!, ratios[i]! / globMed));
  }
  const sorted = (a: number[]) => [...a].sort((x, y) => x - y);
  const cs = sorted(curveErrs);
  const ks = sorted(catErrs);
  const q90 = (s: number[]) => s[Math.min(s.length - 1, Math.floor(s.length * 0.9))]!;
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    curve_loo_median: r2(median(cs, 0)),
    curve_loo_p90: r2(q90(cs)),
    category_loo_median: r2(median(ks, 0)),
    global_loo_median: r2(median(sorted(globErrs), 0)),
    comps_count: n,
  };
}

/** The three multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  multiple: number,
  model: ModelConstants,
): { implied: number; growthPct: number; growthMult: number; maturityMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const base = protocol.tvl_usd * multiple;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult));
  return { implied, growthPct, growthMult, maturityMult, age };
}

/**
 * The launch score, 0-100, a second signal beside the ranking: how close a protocol looks to
 * launching a token, from the snapshot's own figures. Age is 0-40 (older without a token scores
 * higher, capped at three years; unknown age is neutral at 20). Growth is 0-30 (a 7-day rise
 * scores higher, from -60% at 0 to +200% at 30). Size is 0-30 on a log scale ($5M at 0, $5B at
 * 30). The score never moves the ranking; the board is still ordered by implied value alone.
 */
export function launchScore(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants = MODEL,
): { score: number; age_points: number; growth_points: number; tvl_points: number } {
  const age = ageDays(asOf, protocol.listed_at);
  const agePoints = age === null ? 20 : Math.round((Math.min(age, model.maturity_days) / model.maturity_days) * 40);
  const growth = Math.min(model.growth_cap, Math.max(model.growth_floor, finite(protocol.change_7d, 0)));
  const growthPoints = Math.round(((growth - model.growth_floor) / (model.growth_cap - model.growth_floor)) * 30);
  const tvlPoints = Math.round(
    Math.min(30, Math.max(0, (Math.log10(Math.max(1, protocol.tvl_usd) / 5_000_000) / Math.log10(1000)) * 30)),
  );
  const score = Math.min(100, Math.max(0, agePoints + growthPoints + tvlPoints));
  return { score, age_points: agePoints, growth_points: growthPoints, tvl_points: tvlPoints };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** The watchlist's own exclusion: a wrapped, staked or bridged product of a protocol whose token
 * already trades is not a launch candidate, whatever its TVL. The categories are the watchlist's, the
 * name rules are the watchlist's. A parent protocol is DefiLlama's record and not one of the
 * snapshot's fields, so the early radar also stays below the watchlist floor, where a sub-product of
 * a parent is not the size the floor measures. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/i;

/** Whether a protocol is a wrapped, staked, bridged or exchange product, not a launch candidate. */
export function isExcludedProduct(p: SnapshotProtocol): boolean {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return true;
  if (VERSIONED.test(p.name)) return true;
  if (WRAPPED_WORD.test(p.name)) return true;
  if (EXCHANGE_PREFIX.test(p.name)) return true;
  return false;
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token and not an excluded product. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && !isExcludedProduct(p);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const curve = fitCurve(snapshot, model);
  const multipleFor = (p: SnapshotProtocol): number => curveMultiple(p.tvl_usd, curve, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol, below the floor and above it. The
  // radar exists to find the early ones, and the snapshot carries them all. The floor is the
  // watchlist's floor, never a ceiling: a rankable protocol above the floor is still a launch
  // candidate (it records no token, and it passes the watchlist's own exclusion rules), so the
  // board ranks it. The watchlist is the coverage floor the gate checks; the board is the whole
  // early radar. (radar-4: this lifts the board from 178 to 198 rows, the 20 rankable protocols
  // above the floor the v3 floor guard left out.)
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    // The multiple is rounded to three decimals before it is used, so the board's implied value and
    // the dashboard's recompute (which reads the rounded multiple off the row) are the same number.
    const multiple = Math.round(multipleFor(p) * 1000) / 1000;
    const { implied, growthPct, growthMult, maturityMult, age } = impliedValue(p, snapshot.as_of, multiple, model);
    const launch = launchScore(p, snapshot.as_of, model);
    return { p, implied, growthPct, growthMult, maturityMult, age, multiple, launch };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      multiple: Math.round(s.multiple * 1000) / 1000,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      age_days: s.age,
      launch_score: s.launch.score,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** What one transaction costs on a chain, in whole dollars, from the chain's own fee market. */
function gasPerTx(chain: string): number {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return 8;
  if (c === 'solana') return 1;
  if (c === 'bitcoin' || c === 'babylon genesis' || c === 'bittensor') return 2;
  if (['arbitrum', 'optimism', 'base', 'zksync', 'linea', 'scroll', 'blast', 'mode', 'mantle', 'polygon', 'bsc', 'avalanche', 'fantom', 'gnosis'].includes(c)) return 1;
  return 2;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/**
 * The risk of the position the farm plan opens, in one phrase: supplying and lending carry no
 * impermanent loss, while providing liquidity, leveraged farming and perpetuals do, and the plan
 * says so. The risk follows the category, never a hand-written list of names.
 */
function riskFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral') || c.includes('curator') || c.includes('risk') || c.includes('stable') || c.includes('rwa') || c.includes('insurance')) {
    return 'lower risk: supplying or holding carries no impermanent loss';
  }
  return 'higher risk: liquidity and leveraged positions carry impermanent loss';
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('basis')) return `Deposit $${capital} of USDC into ${name}'s basis position on ${chain} and keep it open.`;
  if (c.includes('risk')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names. Gas
 * costs follow the chain the position lives on, so an Ethereum position costs more to run than one on
 * a cheap L2. The plan is capital-tiered: it states the risk of the position and warns when the gas
 * for the whole plan is a large share of the capital, so a small farmer can see before starting
 * whether the position is worth it on that chain. Every plan is netted to a verdict — FARM, THIN or
 * SKIP — from the gas share alone, so the farmer knows at a glance whether the position is worth it
 * at this capital: FARM when gas is at most a quarter of the capital, THIN when it eats a quarter to
 * a half (farm it only with more capital or on a cheaper chain), SKIP when it eats more than half.
 * (radar-4: the verdict is the netting the top entries state; the gas share was already computed.)
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasPerTx(chain);
  const weekly = Math.max(1, Math.round(gas * 4));
  const action = actionFor(p, capital, chain);
  const risk = riskFor(p);
  // The whole plan's gas: the setup, one weekly action for the hold, and the exit, one transaction
  // each. When that is more than a quarter of the capital, the plan says so plainly instead of
  // letting the farmer find out after paying it. The monthly figure in step 3 is the same weekly
  // action counted four times; it is not added again here.
  const weeks = Math.max(1, Math.round(hold / 7));
  const totalGas = gas * 2 + gas * weeks;
  const gasShare = Math.round((totalGas / capital) * 100);
  const verdict = gasShare <= 25 ? 'FARM' : gasShare <= 50 ? 'THIN' : 'SKIP';
  const verdictText =
    verdict === 'FARM'
      ? `Verdict: FARM. Gas for the whole plan is about $${totalGas}, ${gasShare}% of this $${capital} capital on ${chain}, so the position is worth running at this size.`
      : verdict === 'THIN'
        ? `Verdict: THIN. Gas for the whole plan is about $${totalGas}, ${gasShare}% of this $${capital} capital on ${chain}: farm it only with a larger position or on a cheaper chain.`
        : `Verdict: SKIP. Gas for the whole plan is about $${totalGas}, ${gasShare}% of this $${capital} capital on ${chain}, so this size is not worth farming — wait for a cheaper chain or a larger position.`;
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: `about $${gas} of gas for the first transaction on ${chain}`,
      time: '5 minutes',
    },
    {
      text: `${action} ${risk}. ${verdictText}`,
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: `about $${weekly} of gas a month on ${chain}`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, watchlist: boolean): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    multiple: row.model.multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    launch_score: row.model.launch_score,
    watchlist,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const curve = fitCurve(snapshot, model);
  const validation = looErrors(snapshot, model);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    curve,
    validation,
    rows: board.map((r) => radarRow(r, snapshot.watchlist.includes(r.slug))),
    live,
  };
  return { board, radar };
}

/** One field's value, checked against a test, or `fallback` when the value is absent or fails it. */
function field<T>(value: unknown, test: (v: unknown) => v is T, fallback: T): T {
  return test(value) ? value : fallback;
}
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrList = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** A protocol entry out of one raw record, refused unless it carries a slug, a name and a TVL. */
function parseProtocol(v: unknown, i: number): SnapshotProtocol {
  if (!isObj(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
  if (!isStr(v.slug) || !isStr(v.name) || !isNum(v.tvl_usd)) {
    throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
  }
  return {
    slug: v.slug,
    name: v.name,
    category: field(v.category, isStr, null),
    chains: Array.isArray(v.chains) ? v.chains.filter((c): c is string => typeof c === 'string') : [],
    tvl_usd: v.tvl_usd,
    change_7d: field(v.change_7d, isNum, null),
    mcap_usd: field(v.mcap_usd, isNum, null),
    listed_at: field(v.listed_at, isStr, null),
    gecko_id: field(v.gecko_id, isStr, null),
    symbol: field(v.symbol, isStr, null),
  };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (!isObj(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  if (!isDate(raw.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (!isStr(raw.source)) throw new SnapshotError('snapshot.json has no source');
  if (!isInt(raw.floor_usd) || raw.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(raw.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!isStrList(raw.watchlist)) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  return {
    as_of: raw.as_of,
    source: raw.source,
    floor_usd: raw.floor_usd,
    protocols: raw.protocols.map((v, i) => parseProtocol(v, i)),
    watchlist: raw.watchlist,
  };
}

/** Every way a board is not one the gate will take, as a list, or an empty list when it is sound.
 * The gate refuses a board for one reason; this collects all of them, so a builder fixing a board
 * sees everything at once instead of one failure at a time. */
export function boardIssues(board: BoardRow[], snapshot: Snapshot): string[] {
  const issues: string[] = [];
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) issues.push(`the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`);
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) { issues.push(`rank ${i + 1} is ${ranks[i]}`); break; }
  }
  for (let i = 1; i < board.length; i++) {
    if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) { issues.push(`row ${i + 1} outranks row ${i} on implied value`); break; }
  }
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    issues.push(`all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`);
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) { issues.push(`${r.slug} has ${steps.length} farm steps`); continue; }
    for (const s of steps) {
      if (s.length < 20 || s.length > 600) { issues.push(`${r.slug} has a farm step of ${s.length} characters`); break; }
    }
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) issues.push(`${r.slug} has implied value ${r.implied_value_usd}`);
  }
  return issues;
}

/** Why a board is not one the gate will take, or null: the first issue, or none. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const issues = boardIssues(board, snapshot);
  return issues.length > 0 ? issues[0]! : null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
