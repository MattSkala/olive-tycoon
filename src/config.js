// Everything you would tune: prices, rates, the calendar and the farm table. No logic lives here.
// Names of things a player reads (upgrades, grades, buyers, farm blurbs) are in src/lang/*.js, keyed by the ids used here.

export const DAYS = 30; // days in a game month
export const GOAL = 250000; // estate value that completes the last objective
export const RANK_MIN = [0, 25000, 75000, 150000, GOAL]; // estate value at which each rank starts (names: lang `title.0` .. `title.4`)

// ---- economy
export const START_CASH = 5000;
export const OVERDRAFT = -3000; // running costs may dip this far; below it the bank sells the cellar, then forecloses
export const OVERDRAFT_INTEREST = .03; // a month
export const HOME_VALUE = 6000; // what the inherited farm counts for in the estate value
export const OIL_VALUE = 8; // what a litre in the cellar counts for in the estate value
export const SAPLING = 40;
export const UPKEEP_TREE = 2, UPKEEP_SAPLING = 1; // a month
export const WAGE = 300; // a picker, a month
export const PICK = 600; // kg a picker picks in a month
export const HAND_PICK = 8; // kg per click on a tree
export const CREW_MAX = 8; // pickers per farm
export const MILL_FEE = .15; // per kg, unless you own the press
export const TREE_KG = 60; // fruit a healthy mature tree bears on ordinary soil at moisture 40

// Equipment. `cost` only; what each one does is in the rules (search for `up.<id>`).
export const UPGRADES = { shakers:{ cost:3000 }, press:{ cost:8000 }, bottling:{ cost:6000 }, borehole:{ cost:5000 } };
export const PRESS_QUALITY = 1.1, BOTTLING_PRICE = 1.4, SHAKER_SPEED = 2;

// ---- olives and oil
// Ripeness by month (0 = January): early = little but excellent oil, late = lots of mediocre oil.
export const STAGE = { 9:{ name:'green', yield:.12, q:1.35 }, 10:{ name:'turning', yield:.18, q:1.15 }, 11:{ name:'ripe', yield:.21, q:1 }, 0:{ name:'overripe', yield:.22, q:.8 } };
export const DROP = Math.pow(.92, 1 / DAYS); // ripe fruit falls while you wait: 8% a month
export const GRADE_MIN = [1.25, 1.05, .9, 0]; // lowest quality of each grade, best first (names: lang `grade.0` .. `grade.3`)
// The Sitia competition judges the season's average quality: [id, lowest quality, prize, reputation]
export const MEDALS = [['gold', 1.25, 1500, 12], ['silver', 1.1, 700, 7], ['bronze', .98, 300, 4]];

// ---- market and contracts
export const PRICE_HARVEST = 10.5, PRICE_NORMAL = 12.5; // the market drifts toward these: everyone sells at harvest time
export const PRICE_MIN = 5;
export const MARKET_DEPTH = 1500; // litres that push the price down by 1
export const BUYERS = 6; // names: lang `buyer.0` .. `buyer.5`
export const MAX_ORDERS = 3;

// ---- water
// Soil moisture, January to December: points lost per day, and the chance that a day starts two days of rain (halved).
export const EVAP = [.3, .3, .6, 1, 1.4, 1.8, 2.2, 2.2, 1.6, 1, .5, .3];
export const RAINP = [.30, .28, .20, .12, .06, .02, .01, .01, .05, .15, .22, .30];
export const RAIN_GAIN = 12; // points a day of rain adds
export const BAND_MIN = { lush:60, good:35, dry:15, parched:0 }; // moisture bands, wettest first
export const TRUCK = 2, TRUCK_MIN = 40; // a truck load: per tree, and at least
export const DRIP_RATE = .015, DRIP_TO = 70; // drip: cost per tree per point, and the moisture it holds
export const GREEN_DAYS = 10; // dry days a farm may have and still earn the Green Thumb, so reacting to the dry warning is in time
export const GREEN_PRIZE = 500;

// ---- pruning
// Olives are pruned in late winter, after the harvest and before the bloom. Trials found that pruning every second year
// evens out the crop at half the cost of yearly pruning, so a pruning here lasts two seasons and a third year changes nothing.
export const PRUNE_MONTHS = [1, 2, 3]; // February to April
export const PRUNE_COST = 5, PRUNE_MIN = 40; // per mature tree, and at least
export const PRUNE_HEALTH = 10; // health a pruning gives back to neglected trees
// Canopy state by years since the last pruning (`until`, inclusive). fruit: crop multiplier; pick: picking speed multiplier.
export const CANOPY = { tidy:{ until:1, fruit:1.1, pick:1.2 }, grown:{ until:2, fruit:1, pick:1 }, wild:{ until:Infinity, fruit:.8, pick:.7 } };

// ---- rivals in the season report: [name, estate value in season 1, yearly growth]
export const LEAGUE = [['Manolis', 30000, 1.09], ['Kyria Eleni', 60000, 1.07], ['Sitia Agro', 120000, 1.06]];

// ---- farms
// x, z: plot centre in the 3D world (the bay is toward -z); y: height of its pad. cols x rows tree slots.
// old/oldHealth: the mature trees it comes with. fruit, drain, q: multipliers on crop, drying speed and oil quality.
// late: months its olives ripen after the others. haul: multiplier on the water truck price. rep: reputation needed to buy.
// pruned: years since its trees were last pruned (see CANOPY).
export const SP = 3.4, MARGIN = 3; // slot spacing; soil margin around the grid
export const FARMS = [
  { name:'Patriko',      x:0,    z:12,  y:0,  cols:10, rows:8,  price:0,     rep:0,  old:60, oldHealth:100, soil:'loam',  fruit:1,    drain:1,   q:1,    late:0, haul:1,   pruned:2 },
  { name:'Kato Chorafi', x:50,   z:12,  y:0,  cols:8,  rows:8,  price:4000,  rep:0,  old:0,  oldHealth:100, soil:'red',   fruit:1.1,  drain:.8,  q:1,    late:0, haul:1,   pruned:0 },
  { name:'Palia Elia',   x:-50,  z:12,  y:0,  cols:8,  rows:7,  price:6000,  rep:0,  old:40, oldHealth:50,  soil:'loam',  fruit:1,    drain:1,   q:1.05, late:0, haul:1,   pruned:6 },
  { name:'Paralia',      x:-15,  z:-84, y:-7, cols:12, rows:9,  price:7500,  rep:15, old:30, oldHealth:70,  soil:'sand',  fruit:.95,  drain:1.4, q:1,    late:0, haul:1.3, pruned:3 },
  { name:'Kastri',       x:-140, z:22,  y:7,  cols:10, rows:7,  price:9000,  rep:25, old:20, oldHealth:100, soil:'stony', fruit:.85,  drain:1.2, q:1.1,  late:1, haul:1.5, pruned:2 },
  { name:'Megalo Ktima', x:128,  z:22,  y:-1, cols:12, rows:10, price:18000, rep:40, old:0,  oldHealth:100, soil:'red',   fruit:1.05, drain:.9,  q:1,    late:0, haul:1.3, pruned:0 },
];
export const DRIP_BASE = 1000, DRIP_SLOT = 20; // drip lines on a farm: base price plus per slot
