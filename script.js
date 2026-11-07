/* Orbit Arcade — browser-only casino demo. Virtual credits have no cash value.
   No payments, accounts, or server-side gambling features are implemented. */
(() => {
  'use strict';

  const STORAGE_KEY = 'orbit-arcade-demo-v2';
  const ROUNDS_KEY = 'orbit-arcade-unfinished-rounds-v2';
  const INITIAL_CREDITS = 1000;
  const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '💎', '⭐', '7️⃣'];
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const GAMES = [
    { id: 'number', title: 'Lucky Number', desc: 'Pick it. Hit it. Win it.', icon: '🎯', category: 'quick', badge: 'ORIGINAL', multiplier: '4.5×', instructions: 'Choose a number from 1 to 5. If the random result matches, your bet pays 4.5× including the stake.', extra: 'Each number has an equal 1-in-5 chance.' },
    { id: 'coin', title: 'Coin Flip', desc: 'Heads or tails?', icon: '🪙', category: 'quick', badge: 'QUICK PLAY', multiplier: '1.9×', instructions: 'Call heads or tails, then flip the coin. Match the result to receive 1.9× your stake.', extra: 'Both outcomes have equal chances.' },
    { id: 'dice', title: 'Dice Roll', desc: 'Take a chance on six.', icon: '🎲', category: 'quick', badge: 'FAN FAVORITE', multiplier: '1.9×', instructions: 'Pick low (1–3) or high (4–6). A roll in your chosen range pays 1.9× your stake.', extra: 'A standard six-sided die is simulated.' },
    { id: 'slots', title: 'Lucky Slots', desc: 'Spin for a match.', icon: '🎰', category: 'classic', badge: 'CLASSIC', multiplier: '12×', instructions: 'Spin three reels. Two identical symbols pay 1.25×, and three matching symbols pay 12× your stake.', extra: 'All six reel symbols have equal chances.' },
    { id: 'roulette', title: 'Roulette', desc: 'Let the wheel decide.', icon: '🎡', category: 'classic', badge: 'TABLE GAME', multiplier: '36×', instructions: 'Bet on red, black, or green. Red and black pay 2×; green (zero) pays 36× your stake.', extra: 'The wheel has 37 equally likely results: 18 red, 18 black, and one green zero.' },
    { id: 'blackjack', title: 'Blackjack', desc: 'Can you beat the dealer?', icon: '🃏', category: 'strategy', badge: 'CARD GAME', multiplier: '2.5×', instructions: 'Try to reach 21 without going over. Hit for another card or stand against the dealer. A natural blackjack pays 2.5×; an ordinary win pays 2×. A tie returns your stake.', extra: 'One standard shuffled deck per hand. Dealer stands on all 17s; no splits, doubles, or insurance.' },
    { id: 'mines', title: 'Mines', desc: 'Find gems, avoid traps.', icon: '💎', category: 'strategy', badge: 'NEW GAME', multiplier: 'Up to 33.12×', instructions: 'Reveal safe tiles on a 3×3 board with two hidden mines. Each safe gem increases the possible payout. Cash out before hitting a mine.', extra: 'The payout multiplier uses a 92% return factor against the probability of surviving the chosen number of tiles.' }
  ];

  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);
  const initialState = () => ({ balance: INITIAL_CREDITS, limit: 250, stats: { rounds: 0, wins: 0, losses: 0, pushes: 0, wagered: 0 }, history: [] });

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!stored || !Number.isFinite(stored.balance) || !stored.stats || !Array.isArray(stored.history)) return initialState();
      const clean = initialState();
      clean.balance = Math.max(0, Math.min(1e9, stored.balance));
      clean.limit = Number.isInteger(stored.limit) && stored.limit > 0 && stored.limit <= 1000000 ? stored.limit : 250;
      for (const k of Object.keys(clean.stats)) {
        clean.stats[k] = Number.isFinite(stored.stats[k]) ? Math.max(0, stored.stats[k]) : 0;
      }
      clean.history = stored.history.slice(0, 16).filter((h) => h && typeof h.game === 'string' && GAMES.some(g => g.id === h.game) && Number.isFinite(h.net) && Number.isFinite(h.stake));
      return clean;
    } catch (_) { return initialState(); }
  }
  let state = loadState();
  let selectedGame = 'number';
  let selectedFilter = 'all';
  let selectedChoices = { number: '3', coin: 'heads', dice: 'high', roulette: 'red' };
  let lastVisual = {};
  let lastOutcome = {};
  let blackjackRound = null;
  let minesRound = null;
  // Keep unfinished Blackjack and Mines hands recoverable after a refresh.
  try {
    const savedRounds = JSON.parse(localStorage.getItem(ROUNDS_KEY) || '{}');
    const bj = savedRounds.blackjack;
    if (bj && Number.isFinite(bj.stake) && bj.stake > 0 && Array.isArray(bj.deck) && Array.isArray(bj.player) && Array.isArray(bj.dealer) && bj.player.length >= 2 && bj.dealer.length >= 2 && bj.finished === false) blackjackRound = bj;
    const mines = savedRounds.mines;
    if (mines && Number.isFinite(mines.stake) && mines.stake > 0 && Array.isArray(mines.mines) && mines.mines.length === 2 && mines.mines.every(n => Number.isInteger(n) && n >= 0 && n < 9) && mines.mines[0] !== mines.mines[1] && Array.isArray(mines.revealed) && mines.revealed.every(n => Number.isInteger(n) && n >= 0 && n < 9) && mines.finished === false) minesRound = mines;
  } catch (_) { /* No existing rounds or storage unavailable. */ }
  let toastTimeout;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(ROUNDS_KEY, JSON.stringify({
        blackjack: blackjackRound && !blackjackRound.finished ? blackjackRound : null,
        mines: minesRound && !minesRound.finished ? minesRound : null
      }));
    } catch (_) { /* Private browsing can block storage. */ }
  }
  function amount(n) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function money(n) { return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function roundCredits(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function randomInt(max) {
    if (!Number.isInteger(max) || max < 1) throw new Error('Invalid random range');
    const cryptoAPI = globalThis.crypto;
    if (!cryptoAPI || typeof cryptoAPI.getRandomValues !== 'function') return Math.floor(Math.random() * max);
    const data = new Uint32Array(1);
    const range = 0x100000000;
    const ceiling = range - (range % max);
    do { cryptoAPI.getRandomValues(data); } while (data[0] >= ceiling);
    return data[0] % max;
  }
  function getGame(id) { return GAMES.find(g => g.id === id); }
  function notify(message) {
    const el = byId('toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('visible'), 2900);
  }

  function renderWallet() {
    byId('headerBalance').textContent = money(state.balance);
    byId('statBalance').textContent = amount(state.balance);
    byId('statRounds').textContent = amount(state.stats.rounds);
    byId('statWins').textContent = amount(state.stats.wins);
    byId('statWagered').textContent = amount(state.stats.wagered);
    byId('dialogBalance').innerHTML = `${money(state.balance)} <span>CR</span>`;
  }
  function renderHistory() {
    const container = byId('historyList');
    if (state.history.length === 0) {
      container.innerHTML = '<div class="empty-history"><span>✧</span>No rounds yet.<br>Pick a game to get started!</div>';
      return;
    }
    container.innerHTML = state.history.slice(0, 6).map(h => {
      const game = getGame(h.game);
      const label = h.net > 0 ? 'win' : h.net < 0 ? 'loss' : 'push';
      const time = new Date(h.time);
      const stamp = Number.isNaN(time.getTime()) ? 'Just played' : time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `<div class="history-item"><div class="history-icon">${game.icon}</div><div><strong>${game.title}</strong><small>${stamp} · Bet ${amount(h.stake)} CR</small></div><span class="history-value ${label}">${h.net > 0 ? '+' : ''}${amount(h.net)} CR</span></div>`;
    }).join('');
  }
  function updateUI() { renderWallet(); renderHistory(); save(); }

  function renderGames() {
    const text = byId('gameSearch').value.trim().toLowerCase();
    const visible = GAMES.filter(g => (selectedFilter === 'all' || g.category === selectedFilter) && (g.title.toLowerCase().includes(text) || g.desc.toLowerCase().includes(text)));
    byId('gamesGrid').innerHTML = visible.length ? visible.map(g => `<button type="button" class="game-card game-card--${g.id}${g.id === selectedGame ? ' is-selected' : ''}" data-game="${g.id}" aria-label="Play ${g.title}"><div class="game-art"><span class="game-art-label">${g.badge}</span><span class="game-illustration" aria-hidden="true">${g.icon}</span></div><div class="game-card-bottom"><div><h3>${g.title}</h3><p>${g.desc}</p></div><span class="game-open"><svg><use href="#ic-arrow"/></svg></span></div></button>`).join('') : '<div class="no-results">No games found. Try another search or category.</div>';
    document.querySelectorAll('[data-filter]').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === selectedFilter));
  }
  function hasActiveRound() {
    return (selectedGame === 'blackjack' && blackjackRound && !blackjackRound.finished) || (selectedGame === 'mines' && minesRound && !minesRound.finished);
  }
  function syncStakeControls() {
    const active = !!hasActiveRound();
    byId('betAmount').disabled = active;
    document.querySelectorAll('[data-stake]').forEach(b => b.disabled = active);
    const value = Number(byId('betAmount').value);
    document.querySelectorAll('[data-stake]').forEach(b => b.classList.toggle('selected', Number(b.dataset.stake) === value));
  }
  function showOutcome() {
    const el = byId('gameResult');
    const outcome = lastOutcome[selectedGame];
    if (!outcome) { el.hidden = true; return; }
    el.hidden = false;
    el.className = `game-result ${outcome.type === 'loss' ? 'lose' : outcome.type === 'push' ? 'push' : ''}`;
    el.innerHTML = `<strong>${outcome.title}</strong>${outcome.text}`;
  }
  function renderStage() {
    const g = getGame(selectedGame);
    byId('arenaTitle').textContent = g.title;
    byId('arenaSubtitle').textContent = g.desc;
    byId('arenaIcon').textContent = g.icon;
    byId('gameInstructions').textContent = g.instructions;
    byId('gameExtra').textContent = g.extra;
    byId('payoutHint').textContent = g.multiplier;
    const stage = byId('gameStage');
    switch (selectedGame) {
      case 'number': stage.innerHTML = renderNumber(); break;
      case 'coin': stage.innerHTML = renderCoin(); break;
      case 'dice': stage.innerHTML = renderDice(); break;
      case 'slots': stage.innerHTML = renderSlots(); break;
      case 'roulette': stage.innerHTML = renderRoulette(); break;
      case 'blackjack': stage.innerHTML = renderBlackjack(); break;
      case 'mines': stage.innerHTML = renderMines(); break;
    }
    syncStakeControls();
    showOutcome();
  }
  function optionsHTML(game, values) {
    return `<div class="stage-options">${values.map(([key, label, extra = '']) => `<button type="button" class="option-button ${extra}${selectedChoices[game] === String(key) ? ' active' : ''}" data-choice="${key}" aria-pressed="${selectedChoices[game] === String(key)}">${label}</button>`).join('')}</div>`;
  }
  function playBtn(label) { return `<button type="button" class="button button-primary stage-play" data-action="play">${label} <svg><use href="#ic-arrow"/></svg></button>`; }
  function renderNumber() { return `<div class="stage-kicker">CHOOSE YOUR LUCKY NUMBER</div>${lastVisual.number ? `<div class="stage-note">Last result: <strong>${lastVisual.number}</strong></div>` : ''}${optionsHTML('number', [1,2,3,4,5].map(n => [n,n]))}${playBtn('Reveal number')}<span class="stage-note">Correct guess pays 4.5× your bet</span>`; }
  function renderCoin() { return `<div class="stage-kicker">CALL THE FLIP</div><div class="stage-display stage-display--coin">${lastVisual.coin || '✦'}</div>${optionsHTML('coin', [['heads','Heads','option-button--word'],['tails','Tails','option-button--word']])}${playBtn('Flip coin')}`; }
  function renderDice() { return `<div class="stage-kicker">GO HIGH OR LOW</div><div class="stage-display stage-display--dice">${lastVisual.dice || '🎲'}</div>${optionsHTML('dice', [['low','Low · 1–3','option-button--word'],['high','High · 4–6','option-button--word']])}${playBtn('Roll dice')}`; }
  function renderSlots() { return `<div class="stage-kicker">THREE REELS. ONE MOMENT.</div><div class="stage-display stage-display--slots">${lastVisual.slots || '🍒 🔔 💎'}</div>${playBtn('Spin the reels')}<span class="stage-note">2 matches: 1.25× &nbsp;·&nbsp; 3 matches: 12×</span>`; }
  function renderRoulette() {
    const result = lastVisual.roulette;
    const ball = result ? `<div class="stage-display stage-display--roulette roul-${result.color}">${result.number}</div>` : '<div class="stage-display">🎡</div>';
    return `<div class="stage-kicker">PICK YOUR COLOR</div>${ball}${optionsHTML('roulette', [['red','🔴 Red','option-button--word'],['black','⚫ Black','option-button--word'],['green','🟢 Green','option-button--word']])}${playBtn('Spin the wheel')}<span class="stage-note">Red / black: 2× &nbsp;·&nbsp; Green zero: 36×</span>`;
  }

  function cardHTML(card) {
    const red = card.suit === '♥' || card.suit === '♦';
    return `<div class="playing-card ${red ? 'red' : ''}" aria-label="${card.rank} of ${card.suit}"><span>${card.rank}</span><span class="suit">${card.suit}</span></div>`;
  }
  function handScore(hand) {
    let total = 0; let aces = 0;
    for (const card of hand) { if (card.rank === 'A') { total += 11; aces++; } else { total += ['J','Q','K'].includes(card.rank) ? 10 : Number(card.rank); } }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }
  function renderBlackjack() {
    const r = blackjackRound;
    if (!r) return `<div class="stage-display">🃏</div><div class="stage-kicker">BEAT THE DEALER. GET CLOSER TO 21.</div>${playBtn('Deal cards')}<div class="stage-note">An ace counts as 1 or 11 · Face cards count as 10</div>`;
    const revealed = r.finished;
    return `<div class="bj-table"><div class="bj-label">DEALER · ${revealed ? handScore(r.dealer) : '?'} POINTS</div><div class="bj-cards">${cardHTML(r.dealer[0])}${revealed ? r.dealer.slice(1).map(cardHTML).join('') : '<div class="playing-card back" aria-label="Hidden dealer card">✦</div>'}</div><div class="bj-divider"></div><div class="bj-label">YOU · ${handScore(r.player)} POINTS</div><div class="bj-cards">${r.player.map(cardHTML).join('')}</div></div>${revealed ? playBtn('Deal another hand') : '<div class="bj-actions"><button type="button" class="button button-primary" data-action="bj-hit">Hit · +1 card</button><button type="button" class="button button-secondary" data-action="bj-stand">Stand</button></div>'}`;
  }
  function mineMultiplier(n) {
    // P(survive n safe picks) = product((7 - i) / (9 - i)), i=0..n-1.
    let probability = 1;
    for (let i = 0; i < n; i++) probability *= (7 - i) / (9 - i);
    return roundCredits(0.92 / probability);
  }
  function renderMines() {
    const r = minesRound;
    if (!r) return `<div class="stage-display">💎</div><div class="stage-kicker">TWO MINES ARE HIDDEN IN NINE TILES</div>${playBtn('Start mining')}<div class="stage-note">Reveal gems, then cash out before you hit a mine.</div>`;
    const tiles = Array.from({ length: 9 }, (_, i) => {
      const safe = r.revealed.includes(i);
      const mine = r.mines.includes(i) && r.finished;
      const disabled = r.finished || safe;
      return `<button type="button" class="mine-cell ${mine ? 'bomb' : safe ? 'revealed' : ''}" data-cell="${i}" ${disabled ? 'disabled' : ''} aria-label="${mine ? 'Mine' : safe ? 'Safe gem' : 'Reveal hidden tile ' + (i + 1)}">${mine ? '💣' : safe ? '💎' : '✧'}</button>`;
    }).join('');
    const multiplier = r.revealed.length ? mineMultiplier(r.revealed.length) : 0;
    return `<div class="stage-kicker">FIND THE GEMS. AVOID TWO MINES.</div><div class="mine-grid">${tiles}</div><div class="mines-status">Safe tiles: ${r.revealed.length}/7 ${!r.finished && r.revealed.length ? `· Cashout: <span class="mine-pay">${amount(roundCredits(r.stake * multiplier))} CR (${multiplier}×)</span>` : ''}</div>${r.finished ? playBtn('New minefield') : `<div class="mine-actions"><button type="button" class="button button-primary" data-action="mine-cashout" ${r.revealed.length === 0 ? 'disabled' : ''}>Cash out ${r.revealed.length ? amount(roundCredits(r.stake * multiplier)) + ' CR' : ''}</button></div>`}`;
  }

  function startBet() {
    const input = byId('betAmount');
    const stake = Number(input.value);
    if (!Number.isSafeInteger(stake) || stake <= 0) { notify('Enter a whole-number stake greater than zero.'); input.focus(); return null; }
    if (stake > 1000000) { notify('The maximum allowed stake is 1,000,000 CR.'); return null; }
    if (stake > state.limit) { notify(`Your personal limit is ${amount(state.limit)} CR per round.`); return null; }
    if (stake > state.balance) { notify('Not enough credits. Open your demo wallet to top up.'); return null; }
    state.balance = roundCredits(state.balance - stake);
    updateUI();
    return stake;
  }
  function finishRound(game, stake, payout, explanation) {
    payout = roundCredits(payout);
    state.balance = roundCredits(state.balance + payout);
    const net = roundCredits(payout - stake);
    const type = net > 0 ? 'win' : net < 0 ? 'loss' : 'push';
    state.stats.rounds++;
    state.stats.wagered = roundCredits(state.stats.wagered + stake);
    if (type === 'win') state.stats.wins++;
    else if (type === 'loss') state.stats.losses++;
    else state.stats.pushes++;
    state.history.unshift({ game, stake, net, time: Date.now() });
    state.history = state.history.slice(0, 16);
    lastOutcome[game] = { type, title: type === 'win' ? `You won +${amount(net)} CR! ✦` : type === 'push' ? 'Push — bet returned.' : `No win this round · −${amount(stake)} CR`, text: explanation };
    updateUI();
    renderStage();
  }

  function playGame() {
    if (selectedGame === 'blackjack') { dealBlackjack(); return; }
    if (selectedGame === 'mines') { startMines(); return; }
    const stake = startBet();
    if (stake === null) return;
    switch (selectedGame) {
      case 'number': {
        const number = randomInt(5) + 1;
        lastVisual.number = number;
        const won = Number(selectedChoices.number) === number;
        finishRound('number', stake, won ? stake * 4.5 : 0, `You picked ${selectedChoices.number}; the result was ${number}.`);
        break;
      }
      case 'coin': {
        const side = randomInt(2) ? 'heads' : 'tails';
        lastVisual.coin = side === 'heads' ? 'H' : 'T';
        finishRound('coin', stake, side === selectedChoices.coin ? stake * 1.9 : 0, `The coin landed on ${side}.`);
        break;
      }
      case 'dice': {
        const die = randomInt(6) + 1;
        lastVisual.dice = ['⚀','⚁','⚂','⚃','⚄','⚅'][die-1];
        const hit = selectedChoices.dice === 'low' ? die <= 3 : die >= 4;
        finishRound('dice', stake, hit ? stake * 1.9 : 0, `You chose ${selectedChoices.dice}; the die rolled ${die}.`);
        break;
      }
      case 'slots': {
        const reels = [0, 0, 0].map(() => SLOT_SYMBOLS[randomInt(SLOT_SYMBOLS.length)]);
        lastVisual.slots = reels.join(' ');
        const unique = new Set(reels).size;
        const factor = unique === 1 ? 12 : unique === 2 ? 1.25 : 0;
        finishRound('slots', stake, stake * factor, factor === 12 ? 'Three matching symbols — jackpot!' : factor ? 'Two matching symbols!' : 'No matching symbols this spin.');
        break;
      }
      case 'roulette': {
        const n = randomInt(37);
        const color = n === 0 ? 'green' : RED_NUMBERS.has(n) ? 'red' : 'black';
        lastVisual.roulette = { number: n, color };
        const factor = color === selectedChoices.roulette ? (color === 'green' ? 36 : 2) : 0;
        finishRound('roulette', stake, stake * factor, `Ball landed on ${n} (${color}). You chose ${selectedChoices.roulette}.`);
        break;
      }
    }
  }

  function makeDeck() {
    const cards = SUITS.flatMap(suit => RANKS.map(rank => ({ suit, rank })));
    for (let i = cards.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }
  function dealBlackjack() {
    if (blackjackRound && !blackjackRound.finished) { notify('Finish your current hand first.'); return; }
    const stake = startBet();
    if (stake === null) return;
    const deck = makeDeck();
    blackjackRound = { stake, deck, player: [deck.pop(), deck.pop()], dealer: [deck.pop(), deck.pop()], finished: false };
    delete lastOutcome.blackjack;
    const playerNatural = handScore(blackjackRound.player) === 21;
    const dealerNatural = handScore(blackjackRound.dealer) === 21;
    if (playerNatural || dealerNatural) {
      const payout = playerNatural && dealerNatural ? stake : playerNatural ? stake * 2.5 : 0;
      settleBlackjack(payout, playerNatural && dealerNatural ? 'Both have blackjack. The round is a push.' : playerNatural ? 'Natural blackjack! Paid 3:2.' : 'Dealer has natural blackjack.');
    } else { save(); renderStage(); }
  }
  function settleBlackjack(payout, message) {
    const r = blackjackRound;
    if (!r || r.finished) return;
    r.finished = true;
    finishRound('blackjack', r.stake, payout, `${message} You: ${handScore(r.player)} · Dealer: ${handScore(r.dealer)}.`);
  }
  function blackjackHit() {
    if (!blackjackRound || blackjackRound.finished) return;
    blackjackRound.player.push(blackjackRound.deck.pop());
    const score = handScore(blackjackRound.player);
    if (score > 21) settleBlackjack(0, 'Bust! Your hand is over 21.');
    else if (score === 21) blackjackStand();
    else { save(); renderStage(); }
  }
  function blackjackStand() {
    if (!blackjackRound || blackjackRound.finished) return;
    const r = blackjackRound;
    while (handScore(r.dealer) < 17) r.dealer.push(r.deck.pop());
    const dealer = handScore(r.dealer), player = handScore(r.player);
    const payout = dealer > 21 || player > dealer ? r.stake * 2 : player === dealer ? r.stake : 0;
    const explanation = dealer > 21 ? 'The dealer busts!' : player > dealer ? 'You beat the dealer!' : player === dealer ? 'Same score, a push.' : 'The dealer wins this hand.';
    settleBlackjack(payout, explanation);
  }

  function startMines() {
    if (minesRound && !minesRound.finished) { notify('Finish this minefield first.'); return; }
    const stake = startBet();
    if (stake === null) return;
    const positions = Array.from({ length: 9 }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    minesRound = { stake, mines: positions.slice(0, 2), revealed: [], finished: false };
    delete lastOutcome.mines;
    save();
    renderStage();
  }
  function revealMine(index) {
    const r = minesRound;
    if (!r || r.finished || !Number.isInteger(index) || index < 0 || index > 8 || r.revealed.includes(index)) return;
    if (r.mines.includes(index)) {
      r.finished = true;
      finishRound('mines', r.stake, 0, `A mine was hidden under tile ${index + 1}. ${r.revealed.length} safe gems were found.`);
      return;
    }
    r.revealed.push(index);
    if (r.revealed.length === 7) cashoutMines();
    else { save(); renderStage(); }
  }
  function cashoutMines() {
    const r = minesRound;
    if (!r || r.finished || !r.revealed.length) return;
    r.finished = true;
    const factor = mineMultiplier(r.revealed.length);
    finishRound('mines', r.stake, r.stake * factor, `Safely collected ${r.revealed.length} gem${r.revealed.length === 1 ? '' : 's'} at ${factor}×.`);
  }

  function selectGame(id) {
    if (!getGame(id)) return;
    selectedGame = id;
    renderGames();
    renderStage();
    byId('play').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    closeMenu();
  }
  function navigate(target) {
    const el = byId(target);
    if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    document.querySelectorAll('.side-link[data-target]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.target === target));
    closeMenu();
  }
  function closeMenu() { byId('sidebar').classList.remove('open'); byId('mobileScrim').hidden = true; byId('menuButton').setAttribute('aria-expanded', 'false'); }
  function openDialog(id) {
    if (id === 'limitsDialog') byId('limitAmount').value = String(state.limit);
    const el = byId(id);
    if (!el.open) el.showModal();
  }
  function closeDialog() { document.querySelectorAll('dialog[open]').forEach(el => el.close()); }

  function handleAction(el) {
    switch (el.dataset.action) {
      case 'home': navigate('home'); break;
      case 'navigate': navigate(el.dataset.target); break;
      case 'wallet': openDialog('walletDialog'); break;
      case 'limits': openDialog('limitsDialog'); break;
      case 'close-dialog': closeDialog(); break;
      case 'topup': {
        const n = Number(el.dataset.amount);
        state.balance = roundCredits(Math.min(1e9, state.balance + n));
        updateUI();
        notify(`Added ${amount(n)} free demo credits!`);
        break;
      }
      case 'reset': {
        if (!window.confirm('Reset demo credits, stats, and history? This cannot be undone.')) return;
        state = initialState();
        blackjackRound = null;
        minesRound = null;
        lastVisual = {};
        lastOutcome = {};
        byId('betAmount').value = '25';
        updateUI();
        renderStage();
        closeDialog();
        notify('Demo account reset.');
        break;
      }
      case 'save-limits': {
        const n = Number(byId('limitAmount').value);
        if (!Number.isSafeInteger(n) || n < 1 || n > 1000000) { notify('Enter a whole-number limit between 1 and 1,000,000.'); return; }
        state.limit = n;
        const input = byId('betAmount');
        if (Number(input.value) > n) input.value = String(n);
        updateUI();
        syncStakeControls();
        closeDialog();
        notify(`Your stake limit is now ${amount(n)} CR.`);
        break;
      }
      case 'clear-history':
        state.history = [];
        updateUI();
        notify('Recent activity cleared.');
        break;
      case 'play': playGame(); break;
      case 'bj-hit': blackjackHit(); break;
      case 'bj-stand': blackjackStand(); break;
      case 'mine-cashout': cashoutMines(); break;
    }
  }

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (action) { if (action.tagName === 'A') event.preventDefault(); handleAction(action); return; }
    const game = event.target.closest('[data-game]');
    if (game) { selectGame(game.dataset.game); return; }
    const filter = event.target.closest('[data-filter]');
    if (filter) { selectedFilter = filter.dataset.filter; renderGames(); return; }
    const stake = event.target.closest('[data-stake]');
    if (stake) { if (!hasActiveRound()) { byId('betAmount').value = stake.dataset.stake; syncStakeControls(); } return; }
    const choice = event.target.closest('[data-choice]');
    if (choice && ['number','coin','dice','roulette'].includes(selectedGame)) { selectedChoices[selectedGame] = choice.dataset.choice; renderStage(); return; }
    const cell = event.target.closest('[data-cell]');
    if (cell) { revealMine(Number(cell.dataset.cell)); }
  });
  byId('gameSearch').addEventListener('input', renderGames);
  byId('betAmount').addEventListener('input', syncStakeControls);
  byId('menuButton').addEventListener('click', () => {
    const opened = byId('sidebar').classList.toggle('open');
    byId('mobileScrim').hidden = !opened;
    byId('menuButton').setAttribute('aria-expanded', String(opened));
  });
  byId('mobileScrim').addEventListener('click', closeMenu);
  document.querySelectorAll('.app-dialog').forEach(dialog => {
    dialog.addEventListener('click', ev => { if (ev.target === dialog) dialog.close(); });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  byId('footerYear').textContent = new Date().getFullYear();
  updateUI();
  renderGames();
  renderStage();
})();
