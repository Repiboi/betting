# Orbit Arcade v3 — 14 interactive casino-style games (demo credits)

This is the upgraded version of the user's original HTML/CSS/JS betting-app project. It is **entirely front-end and virtual-credit only**. There are no real-money bets, accounts, purchases, cashouts, or payout processing.

## Start the app

1. Extract the ZIP.
2. Open the `betting-main` folder.
3. Double-click `index.html` in Chrome, Edge, Safari, or Firefox. Alternatively, use VS Code Live Server.

No Node.js, npm, backend, database, or API key is needed. The interface works offline; optional Google Fonts require internet access.

## What changed in v3

- **14 playable games** (7 existing plus 7 new); all game cards launch an interactive game.
- **Aviator-style Sky Rush** with a growing multiplier, animated airplane, timed crash and manual cashout. This is an original, unlicensed simulation; it is not affiliated with any real Aviator casino game.
- **Plinko, Hi–Lo, Keno Picks, Prize Wheel, Limbo, Scratch Cards.**
- **Sticky header** that stays visible as the central page scrolls on desktop and mobile.
- **No fixed 250-credit stake cap**. Stake amounts may exceed 250 CR, as long as the amount is a positive whole number the player's demo wallet contains. The player's *available balance* is the binding maximum. Existing default-250 settings from v2 are automatically removed.
- Optional self-selected per-round limits: open **Play limits**, uncheck **No fixed stake limit**, and enter your desired personal limit. Default is unlimited; you can turn it back on at any time.
- A **MAX** quick-stake button and customizable **free demo credit top-up** in the wallet.
- Existing credit balances, statistics and recent activity remain stored with the same browser-local key (`orbit-arcade-demo-v2`). Unfinished Blackjack, Mines and Sky Rush rounds are stored in browser local storage so refreshes do not reset or duplicate a stake.
- Responsive layouts and keyboard-accessible controls.

## Games and payout rules

All payouts below include the original stake unless otherwise specified. Payouts are based on browser-generated pseudorandom outcomes and are **not audited or provably fair**.

| Game | How it works | Payout |
| --- | --- | --- |
| Lucky Number | Pick 1 of 5 numbers | 4.5× on a match |
| Coin Flip | Predict heads or tails | 1.9× on a match |
| Dice Roll | Pick low (1–3) or high (4–6) | 1.9× on a match |
| Lucky Slots | Spin 3 symbols from 6 | 1.25× for exactly 2 matches; 12× for all 3 |
| Roulette | Bet on red, black or green zero | 2× on red/black, 36× on green |
| Blackjack | Play against dealer, hit/stand | 2× win; 2.5× natural blackjack; 1× tie |
| Mines | Find safe tiles on 3×3 grid with 2 mines | Increasing risk-based payout on cashout |
| **Sky Rush** | Start flight, cash out before random crash | Current multiplier at the cashout moment |
| **Plinko** | 8 equal-chance left/right bounces | 0.4×–9× depending on landing slot |
| **Hi–Lo** | Predict if next rank is higher/lower | Dynamic multiplier based on odds; equal rank returns stake |
| **Keno Picks** | Pick 3 from 15; 4 numbers drawn | 4× for 2 matches; 35× for 3 matches |
| **Prize Wheel** | Random 1 of 12 equal-chance sectors | 0×–4× by sector |
| **Limbo** | Target 1.5×, 2×, 3×, 5×, or 10× | The chosen multiplier if the result meets target |
| **Scratch Cards** | Reveal 3 of 7 symbols | 1.2× for 2 equal, 15× for 3 equal |

### Sky Rush flight rules

The game picks a hidden crash multiplier at takeoff and increases the displayed multiplier with real elapsed time. **You must cash out before the crash**. A loss is settled automatically once the flight reaches its crash point. If you switch tabs or refresh, the flight continues in elapsed time; you cannot retroactively cash out. You may get a 1.00× push by cashing out immediately. This simulated model does not attempt to replicate a licensed game's precise pay table.

### Wallet and technical limits

There is *no preset per-bet ceiling*, but you cannot wager more demo credits than your current wallet balance. The wallet and payouts have a large technical ceiling to keep JavaScript numbers reliable. Use the **Demo wallet → Custom free demo top-up** field to test larger virtual stakes. Credits have **no cash value**.

## Testing performed

The app was exercised in Chromium using an isolated in-memory page at **1440, 390 and 320 px** widths. Checks covered 14 game cards, stakes above 250 CR, all 7 new games, Sky Rush start/cashout, sticky topbar while scrolling, mobile overflow and JavaScript exceptions. Separate checks covered custom top-ups, 5,000 CR stakes and optional personal-limit toggles.

## Hosting

This is still a static website. Publish `index.html`, `style.css` and `script.js` together to Netlify or GitHub Pages. Uploads, user accounts, and real-money deposits are *not* supported.

**Not suitable for real-money gambling.** All outcomes and balances run in the browser and can be altered by visitors. A real-money product needs licensed, regulated backend systems, server-authoritative wallets, age checks, antifraud controls, legal review, verified randomness and payment compliance.
