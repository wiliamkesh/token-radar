# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/wiliamkesh/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/wiliamkesh/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token launch radar: the pre-token DeFi protocols most likely to launch a valuable token, ranked by an implied value that follows from the snapshot's own figures. Each category is priced from the market-cap-to-TVL ratio the snapshot's live-token protocols in that category actually trade at, so a lending protocol and a DEX are not scored on the same multiple. Wrapped, staked and bridged products of a token that already trades are left out, whatever their TVL. Every protocol gets a farm plan with the cost and time of each step, priced for the chain the position lives on.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=s7wbar8a&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
