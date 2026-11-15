# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/wiliamkesh/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/wiliamkesh/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token launch radar: the pre-token DeFi protocols most likely to launch a valuable token, ranked by an implied value that follows from the snapshot's own figures. The multiple is a curve fit on the snapshot's live-token protocols — log(FDV/TVL) against log(TVL) — so a protocol's multiple falls as it gets bigger, which is what the live market actually does. The curve was tested leave-one-out on the snapshot's 128 live-token protocols (median error 3.49x, against 4.54x for category medians), and the dashboard states the test. Each row also carries a launch score (age, seven-day growth, size) as a second signal beside the ranking. Wrapped, staked and bridged products of a token that already trades are left out, whatever their TVL. Every protocol gets a farm plan with the cost and time of each step, priced for the chain the position lives on, with the risk of the position stated and a warning when gas is a large share of the capital.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=s7wbar8a&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
