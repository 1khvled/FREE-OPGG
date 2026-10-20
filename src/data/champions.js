/**
 * Champion registry — id → { key, name, title, tags }.
 *
 * Source of truth: OP.GG's public champion metadata endpoint
 *   GET https://lol-api-champion.op.gg/api/meta/champions
 * (mirrors Riot's Data Dragon champion list).
 *
 * `key` is the Data Dragon square name ("Aatrox", "TwistedFate", "Chogath").
 * The champion endpoints return numeric ids only, so the square name has to
 * be resolved locally to build image URLs and to label counters.
 *
 * Pure data — no imports, no side effects.
 */

/** @type {Record<string, { key: string, name: string, title: string, tags: string[] }>} */
export const CHAMPIONS = {
  1: { key: "Annie", name: "Annie", title: "the Dark Child", tags: ["Mage","Support"] },
  2: { key: "Olaf", name: "Olaf", title: "the Berserker", tags: ["Fighter","Tank"] },
  3: { key: "Galio", name: "Galio", title: "the Colossus", tags: ["Tank","Mage"] },
  4: { key: "TwistedFate", name: "Twisted Fate", title: "the Card Master", tags: ["Mage","Marksman"] },
  5: { key: "XinZhao", name: "Xin Zhao", title: "the Seneschal of Demacia", tags: ["Fighter","Tank"] },
  6: { key: "Urgot", name: "Urgot", title: "the Dreadnought", tags: ["Fighter","Tank"] },
  7: { key: "Leblanc", name: "LeBlanc", title: "the Deceiver", tags: ["Assassin","Mage"] },
  8: { key: "Vladimir", name: "Vladimir", title: "the Crimson Reaper", tags: ["Mage","Fighter"] },
  9: { key: "Fiddlesticks", name: "Fiddlesticks", title: "the Ancient Fear", tags: ["Mage","Support"] },
  10: { key: "Kayle", name: "Kayle", title: "the Righteous", tags: ["Marksman","Mage"] },
  11: { key: "MasterYi", name: "Master Yi", title: "the Wuju Bladesman", tags: ["Fighter","Assassin"] },
  12: { key: "Alistar", name: "Alistar", title: "the Minotaur", tags: ["Tank","Support"] },
  13: { key: "Ryze", name: "Ryze", title: "the Rune Mage", tags: ["Mage"] },
  14: { key: "Sion", name: "Sion", title: "The Undead Juggernaut", tags: ["Tank","Fighter"] },
  15: { key: "Sivir", name: "Sivir", title: "the Battle Mistress", tags: ["Marksman"] },
  16: { key: "Soraka", name: "Soraka", title: "the Starchild", tags: ["Support","Mage"] },
  17: { key: "Teemo", name: "Teemo", title: "the Swift Scout", tags: ["Marksman","Mage"] },
  18: { key: "Tristana", name: "Tristana", title: "the Yordle Gunner", tags: ["Marksman","Assassin"] },
  19: { key: "Warwick", name: "Warwick", title: "the Uncaged Wrath of Zaun", tags: ["Fighter","Tank"] },
  20: { key: "Nunu", name: "Nunu & Willump", title: "the Boy and His Yeti", tags: ["Tank","Mage"] },
  21: { key: "MissFortune", name: "Miss Fortune", title: "the Bounty Hunter", tags: ["Marksman","Mage"] },
  22: { key: "Ashe", name: "Ashe", title: "the Frost Archer", tags: ["Marksman","Support"] },
  23: { key: "Tryndamere", name: "Tryndamere", title: "the Barbarian King", tags: ["Fighter","Assassin"] },
  24: { key: "Jax", name: "Jax", title: "Grandmaster at Arms", tags: ["Fighter"] },
  25: { key: "Morgana", name: "Morgana", title: "the Fallen", tags: ["Support","Mage"] },
  26: { key: "Zilean", name: "Zilean", title: "the Chronokeeper", tags: ["Support","Mage"] },
  27: { key: "Singed", name: "Singed", title: "the Mad Chemist", tags: ["Tank","Mage"] },
  28: { key: "Evelynn", name: "Evelynn", title: "Agony's Embrace", tags: ["Assassin","Mage"] },
  29: { key: "Twitch", name: "Twitch", title: "the Plague Rat", tags: ["Marksman","Assassin"] },
  30: { key: "Karthus", name: "Karthus", title: "the Deathsinger", tags: ["Mage"] },
  31: { key: "Chogath", name: "Cho'Gath", title: "the Terror of the Void", tags: ["Tank","Mage"] },
  32: { key: "Amumu", name: "Amumu", title: "the Sad Mummy", tags: ["Tank","Support"] },
  33: { key: "Rammus", name: "Rammus", title: "the Armordillo", tags: ["Tank"] },
  34: { key: "Anivia", name: "Anivia", title: "the Cryophoenix", tags: ["Mage"] },
  35: { key: "Shaco", name: "Shaco", title: "the Demon Jester", tags: ["Assassin"] },
  36: { key: "DrMundo", name: "Dr. Mundo", title: "the Madman of Zaun", tags: ["Tank","Fighter"] },
  37: { key: "Sona", name: "Sona", title: "Maven of the Strings", tags: ["Support","Mage"] },
  38: { key: "Kassadin", name: "Kassadin", title: "the Void Walker", tags: ["Assassin","Mage"] },
  39: { key: "Irelia", name: "Irelia", title: "the Blade Dancer", tags: ["Fighter","Assassin"] },
  40: { key: "Janna", name: "Janna", title: "the Storm's Fury", tags: ["Support","Mage"] },
  41: { key: "Gangplank", name: "Gangplank", title: "the Saltwater Scourge", tags: ["Fighter"] },
  42: { key: "Corki", name: "Corki", title: "the Daring Bombardier", tags: ["Marksman","Mage"] },
  43: { key: "Karma", name: "Karma", title: "the Enlightened One", tags: ["Mage","Support"] },
  44: { key: "Taric", name: "Taric", title: "the Shield of Valoran", tags: ["Support","Tank"] },
  45: { key: "Veigar", name: "Veigar", title: "the Tiny Master of Evil", tags: ["Mage"] },
  48: { key: "Trundle", name: "Trundle", title: "the Troll King", tags: ["Fighter","Tank"] },
  50: { key: "Swain", name: "Swain", title: "the Noxian Grand General", tags: ["Mage","Support"] },
  51: { key: "Caitlyn", name: "Caitlyn", title: "the Sheriff of Piltover", tags: ["Marksman"] },
  53: { key: "Blitzcrank", name: "Blitzcrank", title: "the Great Steam Golem", tags: ["Tank","Support"] },
  54: { key: "Malphite", name: "Malphite", title: "Shard of the Monolith", tags: ["Tank","Mage"] },
  55: { key: "Katarina", name: "Katarina", title: "the Sinister Blade", tags: ["Assassin","Mage"] },
  56: { key: "Nocturne", name: "Nocturne", title: "the Eternal Nightmare", tags: ["Fighter","Assassin"] },
  57: { key: "Maokai", name: "Maokai", title: "the Twisted Treant", tags: ["Tank","Support"] },
  58: { key: "Renekton", name: "Renekton", title: "the Butcher of the Sands", tags: ["Fighter","Tank"] },
  59: { key: "JarvanIV", name: "Jarvan IV", title: "the Exemplar of Demacia", tags: ["Fighter","Tank"] },
  60: { key: "Elise", name: "Elise", title: "the Spider Queen", tags: ["Assassin","Mage"] },
  61: { key: "Orianna", name: "Orianna", title: "the Lady of Clockwork", tags: ["Mage","Support"] },
  62: { key: "MonkeyKing", name: "Wukong", title: "the Monkey King", tags: ["Fighter","Tank"] },
  63: { key: "Brand", name: "Brand", title: "the Burning Vengeance", tags: ["Mage","Support"] },
  64: { key: "LeeSin", name: "Lee Sin", title: "the Blind Monk", tags: ["Fighter","Assassin"] },
  67: { key: "Vayne", name: "Vayne", title: "the Night Hunter", tags: ["Marksman","Assassin"] },
  68: { key: "Rumble", name: "Rumble", title: "the Mechanized Menace", tags: ["Fighter","Mage"] },
  69: { key: "Cassiopeia", name: "Cassiopeia", title: "the Serpent's Embrace", tags: ["Mage"] },
  72: { key: "Skarner", name: "Skarner", title: "the Primordial Sovereign", tags: ["Tank","Fighter"] },
  74: { key: "Heimerdinger", name: "Heimerdinger", title: "the Revered Inventor", tags: ["Mage","Support"] },
  75: { key: "Nasus", name: "Nasus", title: "the Curator of the Sands", tags: ["Fighter","Tank"] },
  76: { key: "Nidalee", name: "Nidalee", title: "the Bestial Huntress", tags: ["Assassin","Mage"] },
  77: { key: "Udyr", name: "Udyr", title: "the Spirit Walker", tags: ["Fighter","Tank"] },
  78: { key: "Poppy", name: "Poppy", title: "Keeper of the Hammer", tags: ["Tank","Fighter"] },
  79: { key: "Gragas", name: "Gragas", title: "the Rabble Rouser", tags: ["Fighter","Mage"] },
  80: { key: "Pantheon", name: "Pantheon", title: "the Unbreakable Spear", tags: ["Fighter","Assassin"] },
  81: { key: "Ezreal", name: "Ezreal", title: "the Prodigal Explorer", tags: ["Marksman","Mage"] },
  82: { key: "Mordekaiser", name: "Mordekaiser", title: "the Iron Revenant", tags: ["Fighter","Mage"] },
  83: { key: "Yorick", name: "Yorick", title: "Shepherd of Souls", tags: ["Fighter","Tank"] },
  84: { key: "Akali", name: "Akali", title: "the Rogue Assassin", tags: ["Assassin"] },
  85: { key: "Kennen", name: "Kennen", title: "the Heart of the Tempest", tags: ["Mage"] },
  86: { key: "Garen", name: "Garen", title: "The Might of Demacia", tags: ["Fighter","Tank"] },
  89: { key: "Leona", name: "Leona", title: "the Radiant Dawn", tags: ["Tank","Support"] },
  90: { key: "Malzahar", name: "Malzahar", title: "the Prophet of the Void", tags: ["Mage"] },
  91: { key: "Talon", name: "Talon", title: "the Blade's Shadow", tags: ["Assassin"] },
  92: { key: "Riven", name: "Riven", title: "the Exile", tags: ["Fighter","Assassin"] },
  96: { key: "KogMaw", name: "Kog'Maw", title: "the Mouth of the Abyss", tags: ["Marksman","Mage"] },
  98: { key: "Shen", name: "Shen", title: "the Eye of Twilight", tags: ["Tank"] },
  99: { key: "Lux", name: "Lux", title: "the Lady of Luminosity", tags: ["Mage","Support"] },
  101: { key: "Xerath", name: "Xerath", title: "the Magus Ascendant", tags: ["Mage","Support"] },
  102: { key: "Shyvana", name: "Shyvana", title: "the Half-Dragon", tags: ["Fighter","Tank"] },
  103: { key: "Ahri", name: "Ahri", title: "the Nine-Tailed Fox", tags: ["Mage","Assassin"] },
  104: { key: "Graves", name: "Graves", title: "the Outlaw", tags: ["Marksman"] },
  105: { key: "Fizz", name: "Fizz", title: "the Tidal Trickster", tags: ["Assassin","Fighter"] },
  106: { key: "Volibear", name: "Volibear", title: "the Relentless Storm", tags: ["Fighter","Tank"] },
  107: { key: "Rengar", name: "Rengar", title: "the Pridestalker", tags: ["Assassin","Fighter"] },
  110: { key: "Varus", name: "Varus", title: "the Arrow of Retribution", tags: ["Marksman","Mage"] },
  111: { key: "Nautilus", name: "Nautilus", title: "the Titan of the Depths", tags: ["Tank","Support"] },
  112: { key: "Viktor", name: "Viktor", title: "the Herald of the Arcane", tags: ["Mage"] },
  113: { key: "Sejuani", name: "Sejuani", title: "Fury of the North", tags: ["Tank"] },
  114: { key: "Fiora", name: "Fiora", title: "the Grand Duelist", tags: ["Fighter","Assassin"] },
  115: { key: "Ziggs", name: "Ziggs", title: "the Hexplosives Expert", tags: ["Mage"] },
  117: { key: "Lulu", name: "Lulu", title: "the Fae Sorceress", tags: ["Support","Mage"] },
  119: { key: "Draven", name: "Draven", title: "the Glorious Executioner", tags: ["Marksman"] },
  120: { key: "Hecarim", name: "Hecarim", title: "the Shadow of War", tags: ["Fighter","Tank"] },
  121: { key: "Khazix", name: "Kha'Zix", title: "the Voidreaver", tags: ["Assassin"] },
  122: { key: "Darius", name: "Darius", title: "the Hand of Noxus", tags: ["Fighter","Tank"] },
  126: { key: "Jayce", name: "Jayce", title: "the Defender of Tomorrow", tags: ["Fighter","Marksman"] },
  127: { key: "Lissandra", name: "Lissandra", title: "the Ice Witch", tags: ["Mage"] },
  131: { key: "Diana", name: "Diana", title: "Scorn of the Moon", tags: ["Fighter","Assassin"] },
  133: { key: "Quinn", name: "Quinn", title: "Demacia's Wings", tags: ["Marksman","Assassin"] },
  134: { key: "Syndra", name: "Syndra", title: "the Dark Sovereign", tags: ["Mage"] },
  136: { key: "AurelionSol", name: "Aurelion Sol", title: "The Star Forger", tags: ["Mage"] },
  141: { key: "Kayn", name: "Kayn", title: "the Shadow Reaper", tags: ["Fighter","Assassin"] },
  142: { key: "Zoe", name: "Zoe", title: "the Aspect of Twilight", tags: ["Mage"] },
  143: { key: "Zyra", name: "Zyra", title: "Rise of the Thorns", tags: ["Mage","Support"] },
  145: { key: "Kaisa", name: "Kai'Sa", title: "Daughter of the Void", tags: ["Marksman","Mage"] },
  147: { key: "Seraphine", name: "Seraphine", title: "the Starry-Eyed Songstress", tags: ["Support","Mage"] },
  150: { key: "Gnar", name: "Gnar", title: "the Missing Link", tags: ["Fighter","Tank"] },
  154: { key: "Zac", name: "Zac", title: "the Secret Weapon", tags: ["Tank","Fighter"] },
  157: { key: "Yasuo", name: "Yasuo", title: "the Unforgiven", tags: ["Fighter","Assassin"] },
  161: { key: "Velkoz", name: "Vel'Koz", title: "the Eye of the Void", tags: ["Mage","Support"] },
  163: { key: "Taliyah", name: "Taliyah", title: "the Stoneweaver", tags: ["Mage","Support"] },
  164: { key: "Camille", name: "Camille", title: "the Steel Shadow", tags: ["Fighter","Assassin"] },
  166: { key: "Akshan", name: "Akshan", title: "the Rogue Sentinel", tags: ["Marksman","Assassin"] },
  200: { key: "Belveth", name: "Bel'Veth", title: "the Empress of the Void", tags: ["Fighter"] },
  201: { key: "Braum", name: "Braum", title: "the Heart of the Freljord", tags: ["Tank","Support"] },
  202: { key: "Jhin", name: "Jhin", title: "the Virtuoso", tags: ["Marksman","Mage"] },
  203: { key: "Kindred", name: "Kindred", title: "The Eternal Hunters", tags: ["Marksman"] },
  221: { key: "Zeri", name: "Zeri", title: "The Spark of Zaun", tags: ["Marksman"] },
  222: { key: "Jinx", name: "Jinx", title: "the Loose Cannon", tags: ["Marksman"] },
  223: { key: "TahmKench", name: "Tahm Kench", title: "The River King", tags: ["Tank","Support"] },
  233: { key: "Briar", name: "Briar", title: "the Restrained Hunger", tags: ["Fighter","Assassin"] },
  234: { key: "Viego", name: "Viego", title: "The Ruined King", tags: ["Fighter","Assassin"] },
  235: { key: "Senna", name: "Senna", title: "the Redeemer", tags: ["Support","Marksman"] },
  236: { key: "Lucian", name: "Lucian", title: "the Purifier", tags: ["Marksman","Assassin"] },
  238: { key: "Zed", name: "Zed", title: "the Master of Shadows", tags: ["Assassin"] },
  240: { key: "Kled", name: "Kled", title: "the Cantankerous Cavalier", tags: ["Fighter"] },
  245: { key: "Ekko", name: "Ekko", title: "the Boy Who Shattered Time", tags: ["Assassin","Mage"] },
  246: { key: "Qiyana", name: "Qiyana", title: "Empress of the Elements", tags: ["Assassin"] },
  254: { key: "Vi", name: "Vi", title: "the Piltover Enforcer", tags: ["Fighter","Assassin"] },
  266: { key: "Aatrox", name: "Aatrox", title: "the Darkin Blade", tags: ["Fighter"] },
  267: { key: "Nami", name: "Nami", title: "the Tidecaller", tags: ["Support","Mage"] },
  268: { key: "Azir", name: "Azir", title: "the Emperor of the Sands", tags: ["Mage","Marksman"] },
  350: { key: "Yuumi", name: "Yuumi", title: "the Magical Cat", tags: ["Support","Mage"] },
  360: { key: "Samira", name: "Samira", title: "the Desert Rose", tags: ["Marksman","Assassin"] },
  412: { key: "Thresh", name: "Thresh", title: "the Chain Warden", tags: ["Support","Tank"] },
  420: { key: "Illaoi", name: "Illaoi", title: "the Kraken Priestess", tags: ["Fighter","Tank"] },
  421: { key: "RekSai", name: "Rek'Sai", title: "the Void Burrower", tags: ["Fighter","Tank"] },
  427: { key: "Ivern", name: "Ivern", title: "the Green Father", tags: ["Support","Mage"] },
  429: { key: "Kalista", name: "Kalista", title: "the Spear of Vengeance", tags: ["Marksman"] },
  432: { key: "Bard", name: "Bard", title: "the Wandering Caretaker", tags: ["Support","Mage"] },
  497: { key: "Rakan", name: "Rakan", title: "The Charmer", tags: ["Support"] },
  498: { key: "Xayah", name: "Xayah", title: "the Rebel", tags: ["Marksman"] },
  516: { key: "Ornn", name: "Ornn", title: "The Fire below the Mountain", tags: ["Tank"] },
  517: { key: "Sylas", name: "Sylas", title: "the Unshackled", tags: ["Mage","Assassin"] },
  518: { key: "Neeko", name: "Neeko", title: "the Curious Chameleon", tags: ["Mage","Support"] },
  523: { key: "Aphelios", name: "Aphelios", title: "the Weapon of the Faithful", tags: ["Marksman"] },
  526: { key: "Rell", name: "Rell", title: "the Iron Maiden", tags: ["Tank","Support"] },
  555: { key: "Pyke", name: "Pyke", title: "the Bloodharbor Ripper", tags: ["Support","Assassin"] },
  711: { key: "Vex", name: "Vex", title: "the Gloomist", tags: ["Mage"] },
  777: { key: "Yone", name: "Yone", title: "the Unforgotten", tags: ["Fighter","Assassin"] },
  799: { key: "Ambessa", name: "Ambessa", title: "Matriarch of War", tags: ["Fighter","Assassin"] },
  800: { key: "Mel", name: "Mel", title: "the Soul's Reflection", tags: ["Mage","Support"] },
  804: { key: "Yunara", name: "Yunara", title: "the Unbroken Faith", tags: ["Marksman"] },
  805: { key: "Locke", name: "Locke", title: "the Ashen Exorcist", tags: ["Assassin","Mage"] },
  875: { key: "Sett", name: "Sett", title: "the Boss", tags: ["Fighter","Tank"] },
  876: { key: "Lillia", name: "Lillia", title: "the Bashful Bloom", tags: ["Fighter","Mage"] },
  887: { key: "Gwen", name: "Gwen", title: "The Hallowed Seamstress", tags: ["Fighter"] },
  888: { key: "Renata", name: "Renata Glasc", title: "the Chem-Baroness", tags: ["Support","Mage"] },
  893: { key: "Aurora", name: "Aurora", title: "the Witch Between Worlds", tags: ["Mage","Assassin"] },
  895: { key: "Nilah", name: "Nilah", title: "the Joy Unbound", tags: ["Fighter","Assassin"] },
  897: { key: "KSante", name: "K'Sante", title: "the Pride of Nazumah", tags: ["Tank","Fighter"] },
  901: { key: "Smolder", name: "Smolder", title: "the Fiery Fledgling", tags: ["Marksman","Mage"] },
  902: { key: "Milio", name: "Milio", title: "The Gentle Flame", tags: ["Support","Mage"] },
  904: { key: "Zaahen", name: "Zaahen", title: "The Unsundered", tags: ["Fighter"] },
  910: { key: "Hwei", name: "Hwei", title: "the Visionary", tags: ["Mage","Support"] },
  950: { key: "Naafiri", name: "Naafiri", title: "the Hound of a Hundred Bites", tags: ["Assassin","Fighter"] },
  60001: { key: "Annie", variantKey: "Jade_Annie", name: "Annie", title: "The Dark Child", tags: ["Mage","Support"] },
  60002: { key: "Olaf", variantKey: "Jade_Olaf", name: "Olaf", title: "The Berserker", tags: ["Fighter","Tank"] },
  60003: { key: "Galio", variantKey: "Jade_Galio", name: "Galio", title: "The Colossus", tags: ["Tank","Mage"] },
  60004: { key: "TwistedFate", variantKey: "Jade_TwistedFate", name: "Twisted Fate", title: "The Card Master", tags: ["Mage","Marksman"] },
  60005: { key: "XinZhao", variantKey: "Jade_XinZhao", name: "Xin Zhao", title: "The Seneschal of Demacia", tags: ["Fighter","Tank"] },
  60009: { key: "Fiddlesticks", variantKey: "Jade_Fiddlesticks", name: "Fiddlesticks", title: "The Harbinger of Doom", tags: ["Mage","Support"] },
  60010: { key: "Kayle", variantKey: "Jade_Kayle", name: "Kayle", title: "The Judicator", tags: ["Mage","Marksman"] },
  60011: { key: "MasterYi", variantKey: "Jade_MasterYi", name: "Master Yi", title: "The Wuju Bladesman", tags: ["Fighter","Assassin"] },
  60012: { key: "Alistar", variantKey: "Jade_Alistar", name: "Alistar", title: "The Minotaur", tags: ["Tank","Support"] },
  60013: { key: "Ryze", variantKey: "Jade_Ryze", name: "Ryze", title: "The Rogue Mage", tags: ["Mage"] },
  60014: { key: "Sion", variantKey: "Jade_Sion", name: "Sion", title: "The Undead Champion", tags: ["Tank","Fighter"] },
  60015: { key: "Sivir", variantKey: "Jade_Sivir", name: "Sivir", title: "The Battle Mistress", tags: ["Marksman"] },
  60016: { key: "Soraka", variantKey: "Jade_Soraka", name: "Soraka", title: "The Starchild", tags: ["Support","Mage"] },
  60017: { key: "Teemo", variantKey: "Jade_Teemo", name: "Teemo", title: "The Swift Scout", tags: ["Marksman","Mage"] },
  60018: { key: "Tristana", variantKey: "Jade_Tristana", name: "Tristana", title: "The Megling Gunner", tags: ["Marksman","Assassin"] },
  60019: { key: "Warwick", variantKey: "Jade_Warwick", name: "Warwick", title: "The Blood Hunter", tags: ["Fighter","Tank"] },
  60020: { key: "Nunu", variantKey: "Jade_Nunu", name: "Nunu & Willump", title: "The Yeti Rider", tags: ["Tank","Mage"] },
  60021: { key: "MissFortune", variantKey: "Jade_MissFortune", name: "Miss Fortune", title: "The Bounty Hunter", tags: ["Marksman","Mage"] },
  60022: { key: "Ashe", variantKey: "Jade_Ashe", name: "Ashe", title: "The Frost Archer", tags: ["Marksman","Support"] },
  60023: { key: "Tryndamere", variantKey: "Jade_Tryndamere", name: "Tryndamere", title: "The Barbarian King", tags: ["Fighter","Assassin"] },
  60024: { key: "Jax", variantKey: "Jade_Jax", name: "Jax", title: "Grandmaster at Arms", tags: ["Fighter"] },
  60025: { key: "Morgana", variantKey: "Jade_Morgana", name: "Morgana", title: "Fallen Angel", tags: ["Support","Mage"] },
  60026: { key: "Zilean", variantKey: "Jade_Zilean", name: "Zilean", title: "The Chronokeeper", tags: ["Support","Mage"] },
  60027: { key: "Singed", variantKey: "Jade_Singed", name: "Singed", title: "The Mad Chemist", tags: ["Tank","Mage"] },
  60028: { key: "Evelynn", variantKey: "Jade_Evelynn", name: "Evelynn", title: "The Widowmaker", tags: ["Assassin","Mage"] },
  60029: { key: "Twitch", variantKey: "Jade_Twitch", name: "Twitch", title: "The Plague Rat", tags: ["Marksman","Assassin"] },
  60030: { key: "Karthus", variantKey: "Jade_Karthus", name: "Karthus", title: "The Deathsinger", tags: ["Mage"] },
  60031: { key: "Chogath", variantKey: "Jade_Chogath", name: "Cho'Gath", title: "The Terror of the Void", tags: ["Tank","Mage"] },
  60032: { key: "Amumu", variantKey: "Jade_Amumu", name: "Amumu", title: "The Sad Mummy", tags: ["Tank","Support"] },
  60033: { key: "Rammus", variantKey: "Jade_Rammus", name: "Rammus", title: "The Armordillo", tags: ["Tank"] },
  60034: { key: "Anivia", variantKey: "Jade_Anivia", name: "Anivia", title: "The Cryopheonix", tags: ["Mage","Support"] },
  60035: { key: "Shaco", variantKey: "Jade_Shaco", name: "Shaco", title: "The Demon Jester", tags: ["Assassin"] },
  60036: { key: "DrMundo", variantKey: "Jade_DrMundo", name: "Dr. Mundo", title: "The Madman of Zaun", tags: ["Tank","Fighter"] },
  60037: { key: "Sona", variantKey: "Jade_Sona", name: "Sona", title: "Maven of the Strings", tags: ["Support","Mage"] },
  60038: { key: "Kassadin", variantKey: "Jade_Kassadin", name: "Kassadin", title: "The Void Walker", tags: ["Assassin","Mage"] },
  60039: { key: "Irelia", variantKey: "Jade_Irelia", name: "Irelia", title: "The Will of the Blades", tags: ["Fighter","Assassin"] },
  60040: { key: "Janna", variantKey: "Jade_Janna", name: "Janna", title: "The Storm's Fury", tags: ["Support","Mage"] },
  60041: { key: "Gangplank", variantKey: "Jade_Gangplank", name: "Gangplank", title: "The Saltwater Scourge", tags: ["Fighter"] },
  60042: { key: "Corki", variantKey: "Jade_Corki", name: "Corki", title: "The Daring Bombardier", tags: ["Marksman","Mage"] },
  60043: { key: "Karma", variantKey: "Jade_Karma", name: "Karma", title: "The Enlightened One", tags: ["Mage","Support"] },
  60044: { key: "Taric", variantKey: "Jade_Taric", name: "Taric", title: "The Gem Knight", tags: ["Support","Tank"] },
  60045: { key: "Veigar", variantKey: "Jade_Veigar", name: "Veigar", title: "The Tiny Maser of Evil", tags: ["Mage"] },
  60051: { key: "Caitlyn", variantKey: "Jade_Caitlyn", name: "Caitlyn", title: "The Sheriff of Piltover", tags: ["Marksman"] },
  60053: { key: "Blitzcrank", variantKey: "Jade_Blitzcrank", name: "Blitzcrank", title: "The Great Steam Golem", tags: ["Tank","Support"] },
  60054: { key: "Malphite", variantKey: "Jade_Malphite", name: "Malphite", title: "Shard of the Monolith", tags: ["Tank","Mage"] },
  60055: { key: "Katarina", variantKey: "Jade_Katarina", name: "Katarina", title: "The Sinister Blade", tags: ["Assassin","Mage"] },
  60059: { key: "JarvanIV", variantKey: "Jade_JarvanIV", name: "Jarvan IV", title: "The Exemplar of Demacia", tags: ["Fighter","Tank"] },
  60062: { key: "Wukong", variantKey: "Jade_Wukong", name: "Wukong", title: "The Monkey King", tags: ["Fighter","Tank"] },
  60063: { key: "Brand", variantKey: "Jade_Brand", name: "Brand", title: "The Burning Vengeance", tags: ["Mage","Support"] },
  60064: { key: "LeeSin", variantKey: "Jade_LeeSin", name: "Lee Sin", title: "The Blind Monk", tags: ["Fighter","Assassin"] },
  60067: { key: "Vayne", variantKey: "Jade_Vayne", name: "Vayne", title: "The Night Hunter", tags: ["Marksman","Assassin"] },
  60072: { key: "Skarner", variantKey: "Jade_Skarner", name: "Skarner", title: "The Crystal Vanguard", tags: ["Tank","Fighter"] },
  60074: { key: "Heimerdinger", variantKey: "Jade_Heimerdinger", name: "Heimerdinger", title: "The Revered Inventor", tags: ["Mage","Support"] },
  60075: { key: "Nasus", variantKey: "Jade_Nasus", name: "Nasus", title: "The Curator of the Sands", tags: ["Fighter","Tank"] },
  60076: { key: "Nidalee", variantKey: "Jade_Nidalee", name: "Nidalee", title: "The Bestial Huntress", tags: ["Assassin","Mage"] },
  60078: { key: "Poppy", variantKey: "Jade_Poppy", name: "Poppy", title: "The Iron Ambassador", tags: ["Tank","Fighter"] },
  60079: { key: "Gragas", variantKey: "Jade_Gragas", name: "Gragas", title: "The Rabble Rouser", tags: ["Fighter","Mage"] },
  60080: { key: "Pantheon", variantKey: "Jade_Pantheon", name: "Pantheon", title: "The Artisan of War", tags: ["Fighter","Assassin"] },
  60081: { key: "Ezreal", variantKey: "Jade_Ezreal", name: "Ezreal", title: "The Prodigal Explorer", tags: ["Marksman","Mage"] },
  60084: { key: "Akali", variantKey: "Jade_Akali", name: "Akali", title: "The Fist of Shadow", tags: ["Assassin"] },
  60085: { key: "Kennen", variantKey: "Jade_Kennen", name: "Kennen", title: "The Heart of the Tempest", tags: ["Mage"] },
  60086: { key: "Garen", variantKey: "Jade_Garen", name: "Garen", title: "The Might of Deamcia", tags: ["Fighter","Tank"] },
  60089: { key: "Leona", variantKey: "Jade_Leona", name: "Leona", title: "The Radiant Dawn", tags: ["Tank","Support"] },
  60090: { key: "Malzahar", variantKey: "Jade_Malzahar", name: "Malzahar", title: "The Prophet of the Void", tags: ["Mage"] },
  60096: { key: "KogMaw", variantKey: "Jade_KogMaw", name: "Kog'Maw", title: "The Mouth of the Abyss", tags: ["Marksman","Mage"] },
  60098: { key: "Shen", variantKey: "Jade_Shen", name: "Shen", title: "Eye of Twilight", tags: ["Tank"] },
  60099: { key: "Lux", variantKey: "Jade_Lux", name: "Lux", title: "The Lady of Luminosity", tags: ["Mage","Support"] },
  60102: { key: "Shyvana", variantKey: "Jade_Shyvana", name: "Shyvana", title: "The Half-Dragon", tags: ["Fighter","Tank"] },
  60103: { key: "Ahri", variantKey: "Jade_Ahri", name: "Ahri", title: "The Nine-Tailed Fox", tags: ["Mage","Assassin"] },
  60104: { key: "Graves", variantKey: "Jade_Graves", name: "Graves", title: "The Outlaw", tags: ["Marksman"] },
  60105: { key: "Fizz", variantKey: "Jade_Fizz", name: "Fizz", title: "The Tidal Trickster", tags: ["Assassin","Fighter"] },
  60111: { key: "Nautilus", variantKey: "Jade_Nautilus", name: "Nautilus", title: "The Titan of the Depths", tags: ["Tank","Support"] },
  60114: { key: "Fiora", variantKey: "Jade_Fiora", name: "Fiora", title: "The Grand Duelist", tags: ["Fighter","Assassin"] },
  60117: { key: "Lulu", variantKey: "Jade_Lulu", name: "Lulu", title: "The Fae Sorceress", tags: ["Support","Mage"] },
  60133: { key: "Quinn", variantKey: "Jade_Quinn", name: "Quinn", title: "", tags: ["Marksman","Assassin"] },
  60266: { key: "Aatrox", variantKey: "Jade_Aatrox", name: "Aatrox", title: "The Darkin Blade", tags: ["Fighter"] },
  60267: { key: "Nami", variantKey: "Jade_Nami", name: "Nami", title: "", tags: ["Support","Mage"] },
};

/**
 * Champion record for a numeric champion id, or `null` when unknown.
 *
 * The API also lists "ultimate form" pseudo champions whose ids are the base
 * id plus 60000 (`60266` → Aatrox); those resolve to their base champion.
 *
 * @param {number|string} id
 * @returns {{key: string, name: string, title: string, tags: string[]}|null}
 */
export function championById(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return null;
  const direct = CHAMPIONS[String(num)];
  if (direct) return direct;
  if (num > 60000) return CHAMPIONS[String(num - 60000)] || null;
  return null;
}

/** Display name for a numeric champion id, or `null` when unknown. */
export function championName(id) {
  const champ = championById(id);
  return champ ? champ.name : null;
}

/** Data Dragon square name for a numeric champion id, or `null` when unknown. */
export function championKeyById(id) {
  const champ = championById(id);
  return champ ? champ.key : null;
}

/**
 * Champion record for a square name or display name, or `null` when unknown.
 *
 * @param {string} name
 * @returns {{key: string, name: string, title: string, tags: string[]}|null}
 */
export function championByName(name) {
  if (name === null || name === undefined) return null;
  const needle = String(name).trim().toLowerCase();
  if (!needle) return null;
  for (const champ of Object.values(CHAMPIONS)) {
    if (champ.key.toLowerCase() === needle || champ.name.toLowerCase() === needle) {
      return champ;
    }
  }
  return null;
}

/** Numeric champion id for a square name / display name, or `null` when unknown. */
export function championIdByName(name) {
  if (name === null || name === undefined) return null;
  const needle = String(name).trim().toLowerCase();
  if (!needle) return null;
  for (const [id, champ] of Object.entries(CHAMPIONS)) {
    if (champ.key.toLowerCase() === needle || champ.name.toLowerCase() === needle) {
      return Number(id);
    }
  }
  return null;
}
