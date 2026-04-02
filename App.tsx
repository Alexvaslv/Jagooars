/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { User, Swords, Users, Trophy, ShoppingBag, Gavel, Shield, ChevronLeft, ChevronRight, CheckCircle2, ScrollText, Backpack, Mail, Settings, ArrowLeft, PawPrint, Wind, Coins, Gem, Hexagon, Circle, Star, Lock, Mountain, TreePine, Heart, Crown, BookOpen, FlaskConical, PlusCircle, Shuffle, Flag, Ban, Snowflake, MicOff, LifeBuoy, Package, Check, ExternalLink, Minus, RotateCcw, MapPin, CalendarDays, Mars, Venus, Pencil, Eye, EyeOff } from "lucide-react";

interface Item {
  id: string;
  name: string;
  level: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  type: string;
  bonusPercent: number;
  stats: {
    strength: number;
    agility: number;
    intuition: number;
    endurance: number;
    wisdom: number;
  };
  isChest?: boolean;
  chestRewards?: {
    iron?: number;
    silver?: number;
    gold?: number;
    diamonds?: number;
  };
}

const EquipSlot = ({ label, item }: { label: string, item?: Item | null }) => (
  <div className="flex flex-col items-center gap-1 group">
    <div className={`w-14 h-14 rounded-xl ${item ? (
      item.rarity === 'legendary' ? 'bg-orange-900/20 border-orange-500/60 shadow-[0_0_20px_rgba(249,115,22,0.3)]' :
      item.rarity === 'epic' ? 'bg-purple-900/20 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.3)]' :
      item.rarity === 'rare' ? 'bg-blue-900/20 border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.3)]' :
      item.rarity === 'uncommon' ? 'bg-green-900/20 border-green-500/60 shadow-[0_0_20px_rgba(34,197,94,0.3)]' :
      'bg-white/10 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.15)]'
    ) : 'bg-black/40 border-white/5'} border flex items-center justify-center hover:border-white/20 transition-all duration-300 cursor-pointer relative overflow-hidden group-hover:scale-105`}>
      {item ? (
        <div className="flex flex-col items-center justify-center p-1 relative z-10">
          {item.name.toLowerCase().includes("меч") && <Swords className="w-6 h-6 text-amber-400" />}
          {item.name.toLowerCase().includes("щит") && <Shield className="w-6 h-6 text-amber-400" />}
          {item.name.toLowerCase().includes("лук") && <Wind className="w-6 h-6 text-amber-400" />}
          {item.name.toLowerCase().includes("топор") && <Gavel className="w-6 h-6 text-amber-400" />}
          {item.name.toLowerCase().includes("посох") && <Star className="w-6 h-6 text-amber-400" />}
          {item.name.toLowerCase().includes("рубашка") && <User className="w-6 h-6 text-amber-400" />}
          <div className="absolute inset-0 bg-gradient-to-t from-amber-900/20 to-transparent opacity-50" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
          {label === "Меч" && <Swords className="w-5 h-5 text-stone-500" />}
          {label === "Второе оружие" && <Shield className="w-5 h-5 text-stone-500" />}
          {label === "Рубашка" && <User className="w-5 h-5 text-stone-500" />}
          {label === "Шлем" && <Hexagon className="w-5 h-5 text-stone-500" />}
          {label === "Наручи" && <Circle className="w-5 h-5 text-stone-500" />}
          {label === "Штаны" && <ShoppingBag className="w-5 h-5 text-stone-500" />}
          {label === "Сапоги" && <PawPrint className="w-5 h-5 text-stone-500" />}
          {label === "Ожерелье" && <Gem className="w-5 h-5 text-stone-500" />}
          {label === "Перчатки" && <Users className="w-5 h-5 text-stone-500" />}
          {label === "Пояс" && <Settings className="w-5 h-5 text-stone-500" />}
        </div>
      )}
      {/* Cell Corner Accents */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/10" />
      <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-white/10" />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-white/10" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/10" />
    </div>
    <span className="text-[8px] text-stone-500 uppercase tracking-widest text-center w-16 leading-tight truncate px-1">{item ? item.name.split(' ')[0] : label}</span>
  </div>
);

const FOREST_ENEMIES = [
  { name: "Хромой серый волк", maxHealth: 150, xpMin: 50, xpMax: 80, silver: 10, drops: ["Деревянный меч", "Деревянный щит"], recLevel: 1 },
  { name: "Серый волк", maxHealth: 350, xpMin: 150, xpMax: 250, silver: 25, drops: ["Волчья шкура"], recLevel: 2 },
  { name: "Черный волк", maxHealth: 750, xpMin: 400, xpMax: 600, silver: 50, drops: ["Острый клык"], recLevel: 4 },
  { name: "Вожак волчьей стаи", maxHealth: 1800, xpMin: 0, xpMax: 0, silver: 200, drops: ["Золотая шкура", "Амулет вожака"], recLevel: 5 }
];

const XP_TABLE = [0, 0, 200, 500, 1200, 2500, 5000, 12000];
for (let i = 8; i <= 85; i++) {
  const prevDelta = XP_TABLE[i - 1] - XP_TABLE[i - 2];
  XP_TABLE.push(Math.floor(XP_TABLE[i - 1] + prevDelta * 1.25));
}

const TAKEN_USERNAMES = ["admin", "player", "hero", "test", "root", "system", "moderator", "creator"];

export default function App() {
  const [page, setPage] = useState(1);
  const [inventoryTab, setInventoryTab] = useState<"equipment" | "books" | "elixirs" | "chests">("equipment");
  const [playerHealth, setPlayerHealth] = useState(100);
  const [wolfHealth, setWolfHealth] = useState(100);
  const [battleStep, setBattleStep] = useState(0);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("rpg_player_name") || "Герой");
  const [playerRace, setPlayerRace] = useState(() => localStorage.getItem("rpg_player_race") || "Человек");
  const [realName, setRealName] = useState(() => localStorage.getItem("rpg_real_name") || "");
  const [birthYear, setBirthYear] = useState(() => parseInt(localStorage.getItem("rpg_birth_year") || "2000"));
  const [country, setCountry] = useState(() => localStorage.getItem("rpg_country") || "Неизвестно");
  const [characterStatus, setCharacterStatus] = useState(() => localStorage.getItem("rpg_character_status") || "Новичок");
  const [playerGender, setPlayerGender] = useState<"male" | "female">(() => (localStorage.getItem("rpg_player_gender") as "male" | "female") || "male");
  const [playerAge, setPlayerAge] = useState(() => parseInt(localStorage.getItem("rpg_player_age") || "18"));
  const [playerLocation, setPlayerLocation] = useState(() => localStorage.getItem("rpg_player_location") || "Неизвестно");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasGiftKey, setHasGiftKey] = useState(() => localStorage.getItem("rpg_has_gift_key") === "true");
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => localStorage.getItem("rpg_onboarding_complete") === "true");
  const [tempName, setTempName] = useState("");
  const [tempRace, setTempRace] = useState("Человек");
  const [tempRealName, setTempRealName] = useState("");
  const [tempBirthYear, setTempBirthYear] = useState(2000);
  const [tempAge, setTempAge] = useState(18);
  const [tempLocation, setTempLocation] = useState("Деревня Ветров");
  const [tempCountry, setTempCountry] = useState("Россия");
  const [tempStatus, setTempStatus] = useState("В поиске приключений");
  const [isNameHidden, setIsNameHidden] = useState(() => localStorage.getItem("rpg_name_hidden") === "true");
  const [isAgeHidden, setIsAgeHidden] = useState(() => localStorage.getItem("rpg_age_hidden") === "true");
  const [isCountryHidden, setIsCountryHidden] = useState(() => localStorage.getItem("rpg_country_hidden") === "true");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDatingAuthorized, setIsDatingAuthorized] = useState(() => localStorage.getItem("rpg_dating_authorized") === "true");
  const [datingPassword, setDatingPassword] = useState("");

  const validateUsername = (name: string) => {
    // 5-10 letters (English), numbers, underscores
    const regex = /^[a-zA-Z0-9_]{5,10}$/;
    return regex.test(name);
  };

  useEffect(() => {
    localStorage.setItem("rpg_onboarding_complete", hasCompletedOnboarding.toString());
    localStorage.setItem("rpg_name_hidden", isNameHidden.toString());
    localStorage.setItem("rpg_age_hidden", isAgeHidden.toString());
    localStorage.setItem("rpg_country_hidden", isCountryHidden.toString());
    if (hasCompletedOnboarding) {
      localStorage.setItem("rpg_player_name", playerName);
      localStorage.setItem("rpg_player_race", playerRace);
      localStorage.setItem("rpg_real_name", realName);
      localStorage.setItem("rpg_birth_year", birthYear.toString());
      localStorage.setItem("rpg_country", country);
      localStorage.setItem("rpg_character_status", characterStatus);
      localStorage.setItem("rpg_player_gender", playerGender);
      localStorage.setItem("rpg_player_age", playerAge.toString());
      localStorage.setItem("rpg_player_location", playerLocation);
    }
  }, [hasCompletedOnboarding, playerName, playerRace, realName, birthYear, country, characterStatus, playerGender, playerAge, playerLocation, isNameHidden, isAgeHidden, isCountryHidden]);

  const [silver, setSilver] = useState(() => parseInt(localStorage.getItem("rpg_silver") || "0"));
  const [iron, setIron] = useState(0);
  const [gold, setGold] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [booksInventory, setBooksInventory] = useState<string[]>([]);
  const [elixirsInventory, setElixirsInventory] = useState<string[]>([]);
  const [chestsInventory, setChestsInventory] = useState<Item[]>([]);
  const [equippedItems, setEquippedItems] = useState<{[key: string]: Item | null}>({
    "Шлем": null,
    "Наручи": null,
    "Меч": null,
    "Штаны": null,
    "Сапоги": null,
    "Ожерелье": null,
    "Перчатки": null,
    "Второе оружие": null,
    "Рубашка": null,
    "Пояс": null,
  });
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [xp, setXp] = useState(100);
  const [lastXpGained, setLastXpGained] = useState(0);
  const [forestProgress, setForestProgress] = useState(0);
  const [title, setTitle] = useState({ name: "Новичок", description: "— ты только начинаешь свой путь." });
  const [ownedTitles, setOwnedTitles] = useState([
    { name: "Новичок", description: "— ты только начинаешь свой путь." }
  ]);
  const [selectedTitle, setSelectedTitle] = useState<{ name: string, description: string } | null>(null);
  const [lastDrops, setLastDrops] = useState<string[]>([]);
  const [lastSilver, setLastSilver] = useState(0);
  const [lastIron, setLastIron] = useState(0);
  const [blackWolfKills, setBlackWolfKills] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSeen, setLastSeen] = useState(new Date());
  const [clanName, setClanName] = useState<string | null>(() => {
    const saved = localStorage.getItem("rpg_clan_name");
    const fakeClans = ["Легион Смерти", "Орден Света", "Тени Леса", "Волки Севера", "Золотой Дракон"];
    if (saved && fakeClans.includes(saved)) return null;
    return saved;
  });
  const [clanRole, setClanRole] = useState<string>(() => localStorage.getItem("rpg_clan_role") || "Новобранец");
  const [clanJoinedDate, setClanJoinedDate] = useState<string | null>(() => localStorage.getItem("rpg_clan_joined_date"));
  const [clanMembers, setClanMembers] = useState<{name: string, role: string, level: number}[]>(() => {
    const saved = localStorage.getItem("rpg_clan_members");
    if (saved) {
      const parsed = JSON.parse(saved);
      const fakeMembers = ["СильныйВоин", "ТеневойУбийца", "МудрыйМаг", "ЛеснойДруид", "СтальнойРыцарь", "ГлаваКлана", "ЗамГлавы", "Офицер1", "Почтальон", "Боец", "Гром", "Элирия", "Тень", "Мрак"];
      return parsed.filter((m: any) => !fakeMembers.includes(m.name));
    }
    return [];
  });
  const [showClanLeaveConfirm, setShowClanLeaveConfirm] = useState(false);
  const [isCreatingClan, setIsCreatingClan] = useState(false);
  const [isJoiningClan, setIsJoiningClan] = useState(false);
  const [newClanNameInput, setNewClanNameInput] = useState("");
  const [clanSearchQuery, setClanSearchQuery] = useState("");
  const [clanTab, setClanTab] = useState<"info" | "members" | "manage">("info");
  const [selectedMemberIdx, setSelectedMemberIdx] = useState<number | null>(null);
  const [existingClans, setExistingClans] = useState<{name: string, members: number}[]>(() => {
    const saved = localStorage.getItem("rpg_existing_clans_v2");
    if (saved) {
      const parsed = JSON.parse(saved);
      const fakeClans = ["Легион Смерти", "Орден Света", "Тени Леса", "Волки Севера", "Золотой Дракон"];
      return parsed.filter((c: any) => !fakeClans.includes(c.name));
    }
    
    return [];
  });

  useEffect(() => {
    localStorage.setItem("rpg_existing_clans_v2", JSON.stringify(existingClans));
  }, [existingClans]);

  useEffect(() => {
    if (clanName) {
      localStorage.setItem("rpg_clan_name", clanName);
      localStorage.setItem("rpg_clan_role", clanRole);
      localStorage.setItem("rpg_clan_members", JSON.stringify(clanMembers));
      if (clanJoinedDate) localStorage.setItem("rpg_clan_joined_date", clanJoinedDate);
    } else {
      localStorage.removeItem("rpg_clan_name");
      localStorage.removeItem("rpg_clan_role");
      localStorage.removeItem("rpg_clan_members");
      localStorage.removeItem("rpg_clan_joined_date");
    }
  }, [clanName, clanRole, clanMembers, clanJoinedDate]);

  useEffect(() => {
    localStorage.setItem("rpg_has_gift_key", hasGiftKey.toString());
  }, [hasGiftKey]);

  useEffect(() => {
    localStorage.setItem("rpg_chests_inventory", JSON.stringify(chestsInventory));
  }, [chestsInventory]);

  useEffect(() => {
    if (clanName && clanJoinedDate) {
      const joinedDate = new Date(clanJoinedDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - joinedDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 7 && clanRole === "Новобранец") {
        setClanRole("Воины");
      }
    }
  }, [clanName, clanJoinedDate, clanRole]);

  const [spentStrength, setSpentStrength] = useState(0);
  const [spentAgility, setSpentAgility] = useState(0);
  const [spentIntuition, setSpentIntuition] = useState(0);
  const [spentEndurance, setSpentEndurance] = useState(0);
  const [spentWisdom, setSpentWisdom] = useState(0);
  const [pendingStats, setPendingStats] = useState({
    strength: 0,
    agility: 0,
    intuition: 0,
    endurance: 0,
    wisdom: 0
  });
  const [adminResourceAmount, setAdminResourceAmount] = useState<number>(100);
  const [messages, setMessages] = useState<{id: number, text: string, read: boolean, date: string, claimable?: {iron?: number, silver?: number, gold?: number, diamonds?: number, givesKey?: boolean}, claimed?: boolean}[]>([]);
  const [prevLevel, setPrevLevel] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  let currentLevel = 1;
  for (let i = 1; i <= 85; i++) {
    if (xp >= XP_TABLE[i]) {
      currentLevel = i;
    } else {
      break;
    }
  }

  const isMaxLevel = currentLevel >= 85;
  const currentLevelBaseXp = XP_TABLE[currentLevel];
  const nextLevelXp = isMaxLevel ? currentLevelBaseXp : XP_TABLE[currentLevel + 1];
  const xpIntoLevel = isMaxLevel ? 0 : xp - currentLevelBaseXp;
  const xpNeededForNext = isMaxLevel ? 1 : nextLevelXp - currentLevelBaseXp;
  const xpPercentage = isMaxLevel ? 100 : (xpIntoLevel / xpNeededForNext) * 100;

  const currentEnemy = forestProgress < 4 ? FOREST_ENEMIES[forestProgress] : FOREST_ENEMIES[3];
  
  const totalStatPoints = Math.min(currentLevel - 1, 49) * 5;
  const totalPending = pendingStats.strength + pendingStats.agility + pendingStats.intuition + pendingStats.endurance + pendingStats.wisdom;
  const unspentStatPoints = totalStatPoints - (spentStrength + spentAgility + spentIntuition + spentEndurance + spentWisdom) - totalPending;

  const gearBonuses = { strength: 0, agility: 0, intuition: 0, endurance: 0, wisdom: 0 };
  const elixirBonuses = { strength: 0, agility: 0, intuition: 0, endurance: 0, wisdom: 0 };
  
  const totalStrength = 10 + spentStrength + gearBonuses.strength + elixirBonuses.strength;
  const totalAgility = 10 + spentAgility + gearBonuses.agility + elixirBonuses.agility;
  const totalIntuition = 10 + spentIntuition + gearBonuses.intuition + elixirBonuses.intuition;
  const totalEndurance = 10 + spentEndurance + gearBonuses.endurance + elixirBonuses.endurance;
  const totalWisdom = 10 + spentWisdom + gearBonuses.wisdom + elixirBonuses.wisdom;

  const basePlayerHealth = 200 + (currentLevel - 1) * 50;
  const maxPlayerHealth = Math.floor(basePlayerHealth * (1 + (totalEndurance - 10) * 0.15));

  const getHealthColor = (current: number, max: number) => {
    const p = (current / max) * 100;
    if (p >= 70) return "bg-green-500";
    if (p >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  useEffect(() => {
    if (page !== 4) {
      setPlayerHealth(maxPlayerHealth);
    }
  }, [maxPlayerHealth, page]);

  useEffect(() => {
    if (currentLevel > prevLevel) {
      const newMsg = {
        id: Date.now(),
        text: `Поздравляем! Вы достигли ${currentLevel} уровня. Вам начислено 5 очков характеристик (доступно до 50 уровня).`,
        read: false,
        date: new Date().toLocaleTimeString()
      };
      
      // Level 2 gift: Chest
      if (currentLevel === 2) {
        const giftMsg = {
          id: Date.now() + 1,
          text: "Поздравляем с достижением 2 уровня! Вот ваш приветственный сундук. Чтобы открыть его, вам понадобится специальное кольцо-ключ, которое вы получите на 5 уровне.",
          read: false,
          date: new Date().toLocaleTimeString(),
          claimable: {
            iron: 5000,
            silver: 50000
          },
          claimed: false
        };
        setMessages(prev => [giftMsg, newMsg, ...prev]);
      } else if (currentLevel === 5) {
        const keyMsg = {
          id: Date.now() + 2,
          text: "Поздравляем с достижением 5 уровня! Как и обещали, вот ваше Кольцо-ключ для открытия подарочного сундука.",
          read: false,
          date: new Date().toLocaleTimeString(),
          claimable: {
            givesKey: true
          },
          claimed: false
        };
        setMessages(prev => [keyMsg, newMsg, ...prev]);
      } else {
        setMessages(prev => [newMsg, ...prev]);
      }
      
      setPrevLevel(currentLevel);
    }
  }, [currentLevel, prevLevel]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [page]);

  const [combatCooldown, setCombatCooldown] = useState(0);
  const [playerDamageAnim, setPlayerDamageAnim] = useState<{ value: number | string, type: string, id: number } | null>(null);
  const [enemyDamageAnim, setEnemyDamageAnim] = useState<{ value: number | string, type: string, id: number } | null>(null);
  const [isSurrendering, setIsSurrendering] = useState(false);
  const [playerBadges, setPlayerBadges] = useState<string[]>(() => {
    const saved = localStorage.getItem("rpg_player_badges");
    return saved ? JSON.parse(saved) : [];
  });
  const [playerStatus, setPlayerStatus] = useState<string | null>(() => localStorage.getItem("rpg_player_status"));

  useEffect(() => {
    localStorage.setItem("rpg_player_badges", JSON.stringify(playerBadges));
  }, [playerBadges]);

  useEffect(() => {
    if (playerStatus) localStorage.setItem("rpg_player_status", playerStatus);
    else localStorage.removeItem("rpg_player_status");
  }, [playerStatus]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (combatCooldown > 0) {
      timer = setInterval(() => {
        setCombatCooldown(prev => Math.max(0, prev - 1));
      }, 500);
    }
    return () => clearInterval(timer);
  }, [combatCooldown]);

  const processTurn = (pDmg: number, eDmg: number, pLog: string, eLog: string) => {
    setCombatCooldown(1);
    const isBoss = currentEnemy.name === "Вожак волчьей стаи";
    const bossRageMultiplier = (isBoss && wolfHealth < currentEnemy.maxHealth * 0.3) ? 1.5 : 1.0;
    const finalEnemyDmg = Math.floor(eDmg * bossRageMultiplier);

    // Trigger animations
    if (pDmg > 0) {
      setEnemyDamageAnim({ value: pDmg, type: pLog.includes('[КРИТ]') ? 'crit' : 'hit', id: Date.now() });
    } else if (pLog.includes('[УВОРОТ]')) {
      setEnemyDamageAnim({ value: 'УВОРОТ', type: 'dodge', id: Date.now() });
    }

    if (finalEnemyDmg > 0) {
      setPlayerDamageAnim({ value: finalEnemyDmg, type: eLog.includes('[КРИТ]') ? 'crit' : 'hit', id: Date.now() });
    } else if (eLog.includes('[УВОРОТ]')) {
      setPlayerDamageAnim({ value: 'УВОРОТ', type: 'dodge', id: Date.now() });
    } else if (eLog.includes('[БЛОК]')) {
      setPlayerDamageAnim({ value: 'БЛОК', type: 'block', id: Date.now() });
    }

    const newWolfHp = Math.max(0, wolfHealth - pDmg);
    setWolfHealth(newWolfHp);
    
    if (newWolfHp === 0) {
      setBattleLog(prev => [...prev, pLog, "Враг повержен!"]);
    } else {
      const newPlayerHp = Math.max(0, playerHealth - finalEnemyDmg);
      setPlayerHealth(newPlayerHp);
      const bossRageLog = (bossRageMultiplier > 1 && !battleLog.some(l => l.includes("ЯРОСТЬ"))) ? "ВОЖАК ВПАДАЕТ В ЯРОСТЬ! Урон увеличен!" : "";
      
      const logsToAdd = [pLog];
      if (bossRageLog) logsToAdd.push(bossRageLog);
      if (finalEnemyDmg > 0 || eLog.includes("промахнулся") || eLog.includes("уклонился") || eLog.includes("Блок")) {
        logsToAdd.push(eLog.replace(`${eDmg}`, `${finalEnemyDmg}`));
      }
      
      setBattleLog(prev => [...prev, ...logsToAdd]);
    }
  };

  const getRandomLog = (type: 'hit' | 'crit' | 'dodge' | 'block', attacker: string, defender: string, damage?: number) => {
    const hitPhrases = [
      "{attacker} наносит стремительный удар по {defender}!",
      "{attacker} не обдумывая врезал {defender}!",
      "{attacker} проводит серию ударов, задевая {defender}!",
      "{attacker} делает выпад, и {defender} не успевает среагировать!",
      "{attacker} обрушивает мощный удар на {defender}!",
      "{attacker} делает резкий выпад в сторону {defender}!",
      "{attacker} находит брешь в защите {defender} и атакует!",
      "{attacker} проводит сокрушительную атаку по {defender}!"
    ];

    const critPhrases = [
      "[КРИТ] {attacker} находит слабое место {defender} и наносит сокрушительный урон!",
      "[КРИТ] НЕВЕРОЯТНО! {attacker} проводит идеальный прием против {defender}!",
      "[КРИТ] {attacker} вкладывает всю ярость в этот удар по {defender}!",
      "[КРИТ] Точно в цель! {attacker} пробивает защиту {defender}!",
      "[КРИТ] {attacker} совершает смертоносный выпад, {defender} в шоке!",
      "[КРИТ] {attacker} наносит удар невероятной силы по {defender}!",
      "[КРИТ] {attacker} проводит мастерскую атаку, {defender} едва держится!"
    ];

    const dodgePhrases = [
      "[УВОРОТ] {defender} ловко уходит от атаки {attacker}!",
      "[УВОРОТ] {attacker} промахивается! {defender} слишком быстр!",
      "[УВОРОТ] {defender} предвидит движение {attacker} и уклоняется!",
      "[УВОРОТ] Мимо! {attacker} бьет в пустоту, пока {defender} отскакивает в сторону!",
      "[УВОРОТ] {defender} делает изящный пируэт, избегая удара {attacker}!",
      "[УВОРОТ] {defender} демонстрирует чудеса реакции, уходя от {attacker}!"
    ];

    const blockPhrases = [
      "[БЛОК] {defender} принимает удар {attacker} на щит!",
      "[БЛОК] {attacker} бьет по защите {defender}, урон поглощен!",
      "[БЛОК] {defender} блокирует выпад {attacker}, минимизируя повреждения!",
      "[БЛОК] Удар {attacker} приходится в блок {defender}!",
      "[БЛОК] {defender} стойко выдерживает натиск {attacker}!",
      "[БЛОК] {defender} вовремя выставляет защиту против {attacker}!"
    ];

    let phrase = "";
    if (type === 'hit') phrase = hitPhrases[Math.floor(Math.random() * hitPhrases.length)];
    else if (type === 'crit') phrase = critPhrases[Math.floor(Math.random() * critPhrases.length)];
    else if (type === 'dodge') phrase = dodgePhrases[Math.floor(Math.random() * dodgePhrases.length)];
    else if (type === 'block') phrase = blockPhrases[Math.floor(Math.random() * blockPhrases.length)];

    let result = phrase
      .replace("{attacker}", `[N:${attacker}]`)
      .replace("{defender}", `[N:${defender}]`);

    if (damage !== undefined && damage > 0) {
      result += ` [${damage} урона]`;
    } else if (damage === 0 && type !== 'dodge') {
      result += ` [Урон поглощен]`;
    }
    return result;
  };

  const renderLogText = (text: string) => {
    const parts = text.split(/(\[N:[^\]]+\]|\[КРИТ\]|\[УВОРОТ\]|\[БЛОК\])/);
    return parts.map((part, i) => {
      if (part.startsWith('[N:')) {
        const name = part.slice(3, -1);
        const isPlayer = name === playerName;
        return <span key={i} className={isPlayer ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{name}</span>;
      }
      if (part === '[КРИТ]') return <span key={i} className="text-amber-400 font-black animate-pulse">[КРИТ] </span>;
      if (part === '[УВОРОТ]') return <span key={i} className="text-blue-400 font-bold">[УВОРОТ] </span>;
      if (part === '[БЛОК]') return <span key={i} className="text-stone-400 font-bold">[БЛОК] </span>;
      return <span key={i}>{part}</span>;
    });
  };

  const handleVictory = () => {
    let gainedXp = 0;
    let isPackLeader = forestProgress === 3;
    
    if (isPackLeader) {
       const targetLevel = Math.floor(Math.random() * 2) + 5; // 5, 6
       const targetXp = XP_TABLE[targetLevel];
       gainedXp = Math.max(0, targetXp - xp);
       
       const newTitle = { 
         name: "🐺 Убийца волчьей стаи", 
         description: "— ты очистил окрестные леса от хищников." 
       };
       
       setTitle(newTitle);
       setOwnedTitles(prev => {
         if (!prev.find(t => t.name === newTitle.name)) {
           return [...prev, newTitle];
         }
         return prev;
       });

       setMessages(prev => [
         {
           id: Date.now(),
           text: `Вы получили новый титул: ${newTitle.name}! Теперь ваши награды в лесу увеличены.`,
           read: false,
           date: new Date().toLocaleTimeString()
         },
         ...prev
       ]);
    } else {
       const baseGainedXp = Math.floor(Math.random() * (currentEnemy.xpMax - currentEnemy.xpMin + 1)) + currentEnemy.xpMin;
       // Random boost between 150% and 200% (multiplier 2.5x to 3.0x) as requested
       const randomBoost = Math.random() * (3.0 - 2.5) + 2.5;
       gainedXp = Math.floor(baseGainedXp * randomBoost * (1 + (totalWisdom - 10) * 0.05));
    }
    
    const hasSlayerTitle = title.name === "🐺 Убийца волчьей стаи";
    const resourceMultiplier = (isPackLeader || hasSlayerTitle) ? 1.4 : 1.0;
    gainedXp = Math.floor(gainedXp * resourceMultiplier);

    setLastXpGained(gainedXp);
    setXp(prev => prev + gainedXp);
    
    // Increased silver by 30% on top of previous balance
    let gainedSilver = Math.floor(Math.random() * 2601) + 1300;
    gainedSilver = Math.floor(gainedSilver * resourceMultiplier);
    setLastSilver(gainedSilver);
    setSilver(prev => prev + gainedSilver);
    
    let gainedIron = 0;
    // Increased iron drop chance by 30%
    const ironChance = (isPackLeader || hasSlayerTitle ? 0.65 : 0.26);
    if (Math.random() < ironChance) {
      gainedIron = 1;
      setIron(prev => prev + 1);
    }
    setLastIron(gainedIron);
    
    if (forestProgress === 2) {
      setBlackWolfKills(prev => prev + 1);
    }

    const generateItem = (name: string, level: number): Item => {
      const isNovice = level <= 10;
      // Improved stat generation for story balance: min stats are higher
      const minStat = Math.max(1, Math.floor(level * 0.5));
      return {
        id: Math.random().toString(36).substr(2, 9),
        name,
        level,
        rarity: isNovice ? 'common' : 'uncommon',
        type: name.includes("меч") || name.includes("лук") || name.includes("топор") || name.includes("посох") ? "weapon" : 
              name.includes("щит") ? "offhand" : "armor",
        bonusPercent: Math.floor(Math.random() * 21) + 10, // 10-30% bonus
        stats: {
          strength: Math.floor(Math.random() * (level - minStat + 1)) + minStat,
          agility: Math.floor(Math.random() * (level - minStat + 1)) + minStat,
          intuition: Math.floor(Math.random() * (level - minStat + 1)) + minStat,
          endurance: Math.floor(Math.random() * (level - minStat + 1)) + minStat,
          wisdom: Math.floor(Math.random() * (level - minStat + 1)) + minStat,
        }
      };
    };

    let finalDrops: Item[] = [];
    // Only novice items drop now, 40% chance
    if (Math.random() < 0.40) {
      const noviceItems = [
        "Деревянный лук новичка",
        "Деревянный меч новичка",
        "Деревянный топор новичка",
        "Деревянный посох новичка",
        "Деревянный щит новичка",
        "Рубашка новичка"
      ];
      const randomName = noviceItems[Math.floor(Math.random() * noviceItems.length)];
      finalDrops.push(generateItem(randomName, Math.floor(Math.random() * 10) + 1));
    }

    // Drop books or elixirs
    if (Math.random() < 0.03) {
      const books = ["Книга силы новичка", "Книга ловкости новичка", "Книга мудрости новичка"];
      const book = books[Math.floor(Math.random() * books.length)];
      setBooksInventory(prev => [...prev].slice(0, 9).concat(book));
    }
    if (Math.random() < 0.08) {
      const elixirs = ["Малое зелье здоровья", "Малое зелье маны", "Эликсир силы"];
      const elixir = elixirs[Math.floor(Math.random() * elixirs.length)];
      setElixirsInventory(prev => [...prev].slice(0, 9).concat(elixir));
    }

    setLastDrops(finalDrops.map(d => d.name));
    setInventory(prev => {
      const newInv = [...prev];
      finalDrops.forEach(d => {
        if (newInv.length < 10) newInv.push(d);
      });
      return newInv;
    });
    
    if (!hasCompletedOnboarding) {
      setPage(12);
    } else {
      setPage(5);
    }
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="min-h-screen h-screen overflow-x-hidden overflow-y-auto relative bg-gradient-to-br from-stone-900 to-black"
    >
      <AnimatePresence mode="wait">
        {page === 1 && (
          <motion.div
            key="page1"
            className="flex flex-col items-center justify-center min-h-screen gap-8"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100vh" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
              className="mb-[-1rem] opacity-20"
            >
              <Crown className="w-32 h-32 text-stone-300" fill="currentColor" strokeWidth={1} />
            </motion.div>
            <motion.h1
              className="text-stone-50 text-5xl md:text-7xl font-serif tracking-widest text-center uppercase"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            >
              Nation of Light and Darkness
            </motion.h1>
            <motion.p
              className="text-stone-400 text-center max-w-sm text-lg mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
            >
              Welcome, traveler. Your journey in the Nation of Light and Darkness begins here.
            </motion.p>
            <button
              onClick={() => {
                setPlayerHealth(100);
                setWolfHealth(100);
                setBattleStep(0);
                setBattleLog([]);
                setPage(4);
              }}
              className="px-10 py-4 backdrop-blur-md bg-white/5 border border-white/20 text-stone-100 uppercase tracking-widest rounded-full hover:bg-white/10 hover:border-white/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 font-display"
            >
              Battle
            </button>
          </motion.div>
        )}

        {page === 4 && (
          <motion.div
            key="page4"
            className="min-h-screen flex flex-col p-6 text-stone-100 w-full max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center mb-8 relative mt-4">
              <button 
                onClick={() => setPage(2)} 
                className="absolute left-0 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-3xl md:text-4xl font-serif tracking-widest w-full text-center text-stone-50 uppercase">Сражение</h2>
            </div>

            {/* Battle Arena */}
            <div className="flex-1 flex flex-row items-center justify-between gap-2 px-2">
              {/* Player */}
              <div className="flex flex-col items-center gap-4 w-5/12 relative">
                <motion.div 
                  animate={playerDamageAnim ? { x: [-2, 2, -2, 2, 0] } : {}}
                  transition={{ duration: 0.2 }}
                  className={`w-24 h-24 rounded-full bg-stone-800/50 border ${playerGender === 'male' ? 'border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.1)]'} flex items-center justify-center relative overflow-hidden`}
                >
                  <div className={`absolute -bottom-3 ${playerGender === 'male' ? 'bg-blue-950 border-blue-800 text-blue-400' : 'bg-pink-950 border-pink-800 text-pink-400'} border px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest truncate max-w-[100px] z-10`}>
                    {playerName}
                  </div>
                  <User className={`w-10 h-10 ${playerGender === 'male' ? 'text-blue-400' : 'text-pink-400'}`} />
                  <div className={`absolute inset-0 bg-gradient-to-t ${playerGender === 'male' ? 'from-blue-900/20' : 'from-pink-900/20'} to-transparent opacity-50`} />
                  
                  <AnimatePresence>
                    {playerDamageAnim && (
                      <motion.div
                        key={playerDamageAnim.id}
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -60, scale: 1.2 }}
                        exit={{ opacity: 0 }}
                        onAnimationComplete={() => setPlayerDamageAnim(null)}
                        className={`absolute font-black text-xl pointer-events-none drop-shadow-md ${
                          playerDamageAnim.type === 'crit' ? 'text-amber-400 text-2xl' : 
                          playerDamageAnim.type === 'dodge' ? 'text-blue-400' : 
                          playerDamageAnim.type === 'block' ? 'text-stone-400' : 'text-red-500'
                        }`}
                      >
                        {playerDamageAnim.value}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Player Health Bar */}
                <div className="w-full max-w-[120px] bg-black/50 rounded-full h-3 border border-white/10 overflow-hidden relative">
                  <div className={`absolute top-0 left-0 h-full ${getHealthColor(playerHealth, maxPlayerHealth)} transition-all duration-500`} style={{ width: `${(playerHealth / maxPlayerHealth) * 100}%` }} />
                  <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold">{playerHealth} / {maxPlayerHealth}</div>
                </div>
              </div>

              <div className="text-center text-stone-500 font-serif italic text-sm shrink-0 w-2/12">
                vs
              </div>

              {/* Enemy (Wolf) */}
              <div className="flex flex-col items-center gap-4 w-5/12 relative">
                <motion.div 
                  animate={enemyDamageAnim ? { x: [-2, 2, -2, 2, 0], scale: enemyDamageAnim.type === 'crit' ? [1, 1.1, 1] : 1 } : {}}
                  transition={{ duration: 0.2 }}
                  className="w-28 h-28 rounded-full bg-red-900/20 border border-red-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.1)] relative"
                >
                  <div className="absolute -bottom-3 bg-red-950 border border-red-800 px-3 py-1 rounded-full text-[10px] text-red-400 font-bold uppercase tracking-widest text-center leading-tight">
                    {currentEnemy.name}
                  </div>
                  <PawPrint className="w-12 h-12 text-red-400" />

                  <AnimatePresence>
                    {enemyDamageAnim && (
                      <motion.div
                        key={enemyDamageAnim.id}
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -70, scale: 1.2 }}
                        exit={{ opacity: 0 }}
                        onAnimationComplete={() => setEnemyDamageAnim(null)}
                        className={`absolute font-black text-xl pointer-events-none drop-shadow-md ${
                          enemyDamageAnim.type === 'crit' ? 'text-amber-400 text-2xl' : 
                          enemyDamageAnim.type === 'dodge' ? 'text-blue-400' : 'text-green-400'
                        }`}
                      >
                        {enemyDamageAnim.value}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
                
                {/* Enemy Health Bar */}
                <div className="w-full max-w-[120px] bg-black/50 rounded-full h-3 border border-white/10 overflow-hidden relative">
                  <div className={`absolute top-0 left-0 h-full ${getHealthColor(wolfHealth, currentEnemy.maxHealth)} transition-all duration-500`} style={{ width: `${(wolfHealth / currentEnemy.maxHealth) * 100}%` }} />
                  <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold">{wolfHealth} / {currentEnemy.maxHealth}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {wolfHealth > 0 && playerHealth > 0 ? (
              <div className="mt-6 mb-4 flex flex-col gap-3 w-full">
                {wolfHealth <= currentEnemy.maxHealth * 0.2 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="mb-2"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.05, 1],
                        textShadow: ["0px 0px 0px rgba(251,191,36,0)", "0px 0px 15px rgba(251,191,36,0.8)", "0px 0px 0px rgba(251,191,36,0)"]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5, 
                        ease: "easeInOut" 
                      }}
                      className="text-center text-amber-400 font-bold text-sm uppercase tracking-widest"
                    >
                      Враг почти повержен! Добейте его!
                    </motion.div>
                  </motion.div>
                )}
                <div className="grid grid-cols-1 gap-3 w-full">
                  <motion.button 
                    onClick={() => {
                      if (combatCooldown > 0) return;
                      // Player Attack
                      const baseDmg = Math.floor(Math.random() * 20) + 20 + currentLevel * 5;
                      const dmgMultiplier = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
                      let pDmg = Math.floor(baseDmg * (1 + (totalStrength - 10) * 0.15) * dmgMultiplier);
                      
                      const critChance = Math.min(0.75, 0.065 * (1 + (totalIntuition - 10) * 0.15));
                      const isCrit = Math.random() < critChance;
                      if (isCrit) pDmg = Math.floor(pDmg * 1.5);
                      
                      const pLog = getRandomLog(isCrit ? 'crit' : 'hit', playerName, currentEnemy.name, pDmg);

                      // Enemy Attack
                      const eBaseDmg = Math.floor(Math.random() * 15) + 15 + forestProgress * 25;
                      const eDmgMultiplier = 0.9 + Math.random() * 0.2;
                      let eDmg = Math.floor(eBaseDmg * eDmgMultiplier);
                      
                      // Enemy can also crit or miss
                      const eCritChance = 0.05 + forestProgress * 0.02;
                      const eIsCrit = Math.random() < eCritChance;
                      if (eIsCrit) eDmg = Math.floor(eDmg * 1.3);

                      const eDodgeChance = Math.min(0.95, 0.65 * (1 + (totalAgility - 10) * 0.15)) * 0.1; // Passive dodge chance
                      const playerDodged = Math.random() < eDodgeChance;
                      
                      let eLog = "";
                      if (playerDodged) {
                        eDmg = 0;
                        eLog = getRandomLog('dodge', currentEnemy.name, playerName);
                      } else {
                        eLog = getRandomLog(eIsCrit ? 'crit' : 'hit', currentEnemy.name, playerName, eDmg);
                      }

                      processTurn(pDmg, eDmg, pLog, eLog);
                    }}
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.95 }} 
                    disabled={(forestProgress === 0 && (battleLog.length === 0 || battleLog.length >= 6)) ? false : combatCooldown > 0}
                    className={`w-full py-4 rounded-2xl backdrop-blur-sm border transition-all duration-300 flex items-center justify-center gap-3 font-bold uppercase tracking-wider ${
                      combatCooldown > 0 
                        ? "bg-stone-800/50 border-white/5 text-stone-600 cursor-not-allowed"
                        : forestProgress === 0 && (battleLog.length === 0 || battleLog.length >= 6)
                          ? "bg-red-500/30 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)] text-white animate-pulse" 
                          : "bg-red-500/10 border-red-500/30 text-red-100 hover:bg-red-500/20"
                    }`}
                  >
                    <Swords className="w-5 h-5" /> {combatCooldown > 0 ? `Перезарядка (${combatCooldown}с)` : "Ударить"}
                  </motion.button>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button 
                      onClick={() => {
                        if (combatCooldown > 0) return;
                        const dodgeChance = Math.min(0.95, 0.65 * (1 + (totalAgility - 10) * 0.15));
                        const success = Math.random() < dodgeChance;
                        
                        if (success) {
                          const baseDmg = Math.floor(Math.random() * 15) + 30 + currentLevel * 5;
                          const dmgMultiplier = 0.8 + Math.random() * 0.4;
                          let pDmg = Math.floor(baseDmg * (1 + (totalAgility - 10) * 0.15) * dmgMultiplier);
                          
                          const critChance = Math.min(0.75, 0.065 * (1 + (totalIntuition - 10) * 0.15));
                          const isCrit = Math.random() < critChance;
                          if (isCrit) pDmg = Math.floor(pDmg * 1.5);
                          
                          const pLog = getRandomLog(isCrit ? 'crit' : 'hit', playerName, currentEnemy.name, pDmg);
                          const eLog = getRandomLog('dodge', currentEnemy.name, playerName);
                          
                          processTurn(pDmg, 0, pLog, eLog);
                        } else {
                          const eBaseDmg = Math.floor(Math.random() * 15) + 20 + forestProgress * 25;
                          const eDmg = Math.floor(eBaseDmg * (0.9 + Math.random() * 0.2));
                          
                          const pLog = `Вы не смогли увернуться!`;
                          const eLog = getRandomLog('hit', currentEnemy.name, playerName, eDmg);
                          
                          processTurn(0, eDmg, pLog, eLog);
                        }
                      }}
                      whileHover={combatCooldown > 0 ? {} : { scale: 1.02 }} 
                      whileTap={combatCooldown > 0 ? {} : { scale: 0.95 }} 
                      disabled={combatCooldown > 0}
                      className={`w-full py-3 rounded-2xl backdrop-blur-sm border transition-all duration-300 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm ${
                        combatCooldown > 0
                          ? "bg-stone-800/50 border-white/5 text-stone-600 cursor-not-allowed"
                          : forestProgress === 0 && battleLog.length === 2
                            ? "bg-blue-500/30 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] text-white animate-pulse" 
                            : "bg-blue-500/10 border-blue-500/30 text-blue-100 hover:bg-blue-500/20"
                      }`}
                    >
                      <Wind className="w-4 h-4" /> {combatCooldown > 0 ? `${combatCooldown}с` : "Уворот"}
                    </motion.button>
                    <motion.button 
                      onClick={() => {
                        if (combatCooldown > 0) return;
                        const baseDmg = Math.floor(Math.random() * 10) + 10 + currentLevel * 3;
                        const dmgMultiplier = 0.8 + Math.random() * 0.4;
                        let pDmg = Math.floor(baseDmg * (1 + (totalStrength - 10) * 0.15) * dmgMultiplier);
                        
                        const critChance = Math.min(0.75, 0.065 * (1 + (totalIntuition - 10) * 0.15));
                        const isCrit = Math.random() < critChance;
                        if (isCrit) pDmg = Math.floor(pDmg * 1.5);

                        const blockValue = Math.floor(10 * (1 + (totalEndurance - 10) * 0.15));
                        const eBaseDmg = Math.floor(Math.random() * 10) + 5 + forestProgress * 15;
                        const eDmg = Math.max(0, Math.floor(eBaseDmg * (0.9 + Math.random() * 0.2)) - blockValue);
                        
                        const pLog = getRandomLog(isCrit ? 'crit' : 'hit', playerName, currentEnemy.name, pDmg);
                        const eLog = getRandomLog('block', currentEnemy.name, playerName, eDmg);
                        
                        processTurn(pDmg, eDmg, pLog, eLog);
                      }}
                      whileHover={combatCooldown > 0 ? {} : { scale: 1.02 }} 
                      whileTap={combatCooldown > 0 ? {} : { scale: 0.95 }} 
                      disabled={combatCooldown > 0}
                      className={`w-full py-3 rounded-2xl backdrop-blur-sm border transition-all duration-300 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm ${
                        combatCooldown > 0
                          ? "bg-stone-800/50 border-white/5 text-stone-600 cursor-not-allowed"
                          : forestProgress === 0 && battleLog.length === 4
                            ? "bg-stone-400/30 border-stone-300 shadow-[0_0_20px_rgba(168,162,158,0.5)] text-white animate-pulse" 
                            : "bg-stone-500/10 border-stone-500/30 text-stone-200 hover:bg-stone-500/20"
                      }`}
                    >
                      <Shield className="w-4 h-4" /> {combatCooldown > 0 ? `${combatCooldown}с` : "Блок"}
                    </motion.button>
                  </div>
                  
                  {/* Surrender Button */}
                  <div className="mt-2">
                    {!isSurrendering ? (
                      <motion.button
                        onClick={() => setIsSurrendering(true)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full py-2 rounded-xl bg-stone-900/50 border border-stone-700/50 text-stone-500 hover:text-stone-300 hover:border-stone-500 transition-all text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Flag className="w-3 h-3" /> Сдаться
                      </motion.button>
                    ) : (
                      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="text-[9px] text-red-400 text-center font-bold uppercase tracking-tighter">Вы уверены? Награды не будут начислены!</div>
                        <div className="grid grid-cols-2 gap-2">
                          <motion.button
                            onClick={() => {
                              setBattleLog(prev => [...prev, `[N:${playerName}] позорно сдается и бежит с поля боя!`]);
                              setTimeout(() => {
                                setPage(2);
                                setIsSurrendering(false);
                              }, 1500);
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            className="py-2 rounded-lg bg-red-900/30 border border-red-500/50 text-red-400 text-[10px] font-black uppercase"
                          >
                            Да, сдаться
                          </motion.button>
                          <motion.button
                            onClick={() => setIsSurrendering(false)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            className="py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-300 text-[10px] font-black uppercase"
                          >
                            Нет
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : wolfHealth <= 0 ? (
              <div className="mt-6 mb-4 flex flex-col items-center gap-4 w-full">
                <h3 className="text-2xl font-bold text-yellow-400 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">Победа!</h3>
                <motion.button 
                  onClick={handleVictory}
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  className="w-full py-4 rounded-2xl backdrop-blur-sm bg-yellow-500/20 border border-yellow-500/50 hover:bg-yellow-500/30 text-yellow-100 transition-colors flex items-center justify-center gap-3 font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                >
                  <Trophy className="w-5 h-5" /> Забрать награду
                </motion.button>
              </div>
            ) : (
              <div className="mt-6 mb-4 flex flex-col items-center gap-4 w-full">
                <h3 className="text-2xl font-bold text-red-500 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">Поражение</h3>
                <motion.button 
                  onClick={() => setPage(2)}
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }} 
                  className="w-full py-4 rounded-2xl backdrop-blur-sm bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 text-red-100 transition-colors flex items-center justify-center gap-3 font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  <ArrowLeft className="w-5 h-5" /> Отступить
                </motion.button>
              </div>
            )}

            {/* Battle Log */}
            <div className="mt-auto mb-8 w-full h-28 bg-black/40 border border-white/10 rounded-xl p-3 overflow-y-auto font-mono text-[10px] flex flex-col gap-1.5 shadow-inner">
              {battleLog.length === 0 && <span className="text-stone-500 italic text-center mt-8">Бой начинается...</span>}
              {battleLog.map((log, i) => (
                <div key={i} className="text-stone-300 leading-tight">
                  &gt; {renderLogText(log)}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {page === 5 && (
          <motion.div
            key="page5"
            className="min-h-screen flex flex-col items-center justify-center p-6 text-stone-100 w-full max-w-md mx-auto gap-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-serif text-amber-400">Победа над врагом!</h2>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 my-6 flex flex-col gap-3 text-left w-full shadow-inner">
                <h4 className="text-[10px] uppercase tracking-widest text-stone-500 mb-2 text-center">Получена награда</h4>
                {lastDrops.map((drop, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-stone-200 bg-black/20 p-2 rounded-lg border border-white/5">
                    <ShoppingBag className="w-5 h-5 text-stone-400"/> 
                    <span className="text-sm">{drop}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 text-stone-200 bg-black/20 p-2 rounded-lg border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-stone-300 border-2 border-stone-400 shadow-[0_0_10px_rgba(214,211,209,0.5)] flex items-center justify-center"><Circle className="w-3 h-3 text-stone-600" /></div> 
                  <span className="text-sm">{lastSilver} Серебра</span>
                </div>
                {lastIron > 0 && (
                  <div className="flex items-center gap-3 text-stone-200 bg-black/20 p-2 rounded-lg border border-white/5">
                    <Hexagon className="w-5 h-5 text-stone-400"/> 
                    <span className="text-sm">{lastIron} Железо</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-stone-200 bg-black/20 p-2 rounded-lg border border-white/5">
                  <Star className="w-5 h-5 text-amber-400"/> 
                  <span className="text-sm">{lastXpGained} Опыта</span>
                </div>
              </div>

              {forestProgress === 3 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-amber-200 text-sm text-center animate-pulse">
                  Вы одолели Золотую Вожачку и получили титул <span className="font-bold text-amber-400">«Вожак Стаи»</span>, а также невероятное количество опыта!
                </div>
              )}

              {forestProgress === 2 && blackWolfKills < 3 && (
                <div className="bg-stone-500/10 border border-stone-500/30 rounded-xl p-4 mb-6 text-stone-300 text-sm text-center">
                  Чтобы выследить Вожака Стаи, вам нужно одолеть еще <span className="font-bold text-white">{3 - blackWolfKills}</span> Черных волков.
                </div>
              )}
            </div>
            
            <motion.button 
              onClick={() => {
                if (forestProgress < 4) {
                  if (forestProgress === 2) {
                    if (blackWolfKills >= 3) {
                      setForestProgress(prev => prev + 1);
                    }
                  } else {
                    setForestProgress(prev => prev + 1);
                  }
                }
                setPage(2);
              }}
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="w-full py-4 rounded-2xl backdrop-blur-sm transition-colors font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-100"
            >
              Продолжить путь
            </motion.button>
          </motion.div>
        )}

        {page === 12 && (
          <motion.div
            key="page12"
            className="min-h-screen flex flex-col items-center justify-center p-6 text-stone-100 w-full max-w-md mx-auto gap-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="text-center space-y-4 w-full">
              <h2 className="text-3xl font-serif text-amber-400 mb-8">Знакомство</h2>
              
              <div className="w-full space-y-6 bg-black/40 border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="space-y-2">
                  <p className="text-sm text-stone-300 text-left ml-1">Раса героя</p>
                  <select
                    value={tempRace}
                    onChange={(e) => setTempRace(e.target.value)}
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-amber-500/50 appearance-none"
                  >
                    <option value="Человек">Человек</option>
                    <option value="Эльф">Эльф</option>
                    <option value="Гном">Гном</option>
                    <option value="Орк">Орк</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-stone-300 text-left ml-1">Имя героя</p>
                  <input 
                    type="text" 
                    value={tempName}
                    maxLength={12}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^[a-zA-Z]*$/.test(val)) {
                        setTempName(val);
                      }
                    }}
                    placeholder="Твое имя..."
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white text-lg focus:outline-none focus:border-amber-500/50"
                  />
                  {tempName.length > 0 && tempName.length < 4 && (
                    <p className="text-xs text-red-400 text-left ml-1">Минимум 4 буквы</p>
                  )}
                  {TAKEN_USERNAMES.includes(tempName.toLowerCase()) && (
                    <p className="text-xs text-red-400 text-left ml-1">Это имя уже занято</p>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setPlayerGender('male')}
                      className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${playerGender === 'male' ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-black/20 border-white/5 text-stone-500 hover:bg-white/5'}`}
                    >
                      <Mars className="w-5 h-5" /> Мужчина
                    </button>
                    <button 
                      onClick={() => setPlayerGender('female')}
                      className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${playerGender === 'female' ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'bg-black/20 border-white/5 text-stone-500 hover:bg-white/5'}`}
                    >
                      <Venus className="w-5 h-5" /> Женщина
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-stone-500 ml-1">Возраст</label>
                      <input 
                        type="number" 
                        value={playerAge}
                        onChange={(e) => setPlayerAge(Number(e.target.value))}
                        className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-stone-500 ml-1">Страна</label>
                      <input 
                        type="text" 
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full bg-black/60 border border-white/20 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  disabled={!validateUsername(tempName) || TAKEN_USERNAMES.includes(tempName.toLowerCase())}
                  onClick={() => {
                    if (validateUsername(tempName) && !TAKEN_USERNAMES.includes(tempName.toLowerCase())) {
                      setPlayerName(tempName);
                      setPlayerRace(tempRace);
                      setHasCompletedOnboarding(true);
                      setPage(5);
                    } else {
                      alert("Имя должно содержать от 5 до 10 символов (буквы, цифры, подчеркивания)");
                    }
                  }}
                  className={`w-full mt-4 py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${validateUsername(tempName) && !TAKEN_USERNAMES.includes(tempName.toLowerCase()) ? 'bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-stone-800 text-stone-500 cursor-not-allowed'}`}
                >
                  Продолжить путь
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {page === 13 && (
          <motion.div
            key="page13"
            className="min-h-screen flex flex-col items-center justify-center p-6 text-stone-100 w-full max-w-md mx-auto gap-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="flex items-center w-full mb-8">
              <button 
                onClick={() => setPage(2)} 
                className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold uppercase tracking-widest w-full text-center">Знакомства</h2>
            </div>
            
            {!isDatingAuthorized ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full space-y-6">
                <h3 className="text-xl font-bold text-center text-stone-300">Вход в раздел</h3>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Пароль</label>
                  <input 
                    type="password"
                    value={datingPassword}
                    onChange={(e) => setDatingPassword(e.target.value)}
                    placeholder="Введите пароль..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-pink-500/50"
                  />
                </div>
                <button
                  onClick={() => {
                    if (datingPassword === "123456") {
                      setIsDatingAuthorized(true);
                      localStorage.setItem("rpg_dating_authorized", "true");
                    } else {
                      alert("Неверный пароль!");
                    }
                  }}
                  className="w-full py-4 rounded-xl bg-pink-600 text-white font-bold uppercase tracking-widest hover:bg-pink-500 transition-all shadow-[0_0_20px_rgba(219,39,119,0.2)]"
                >
                  Войти
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-pink-400">Добро пожаловать!</h3>
                <p className="text-stone-400">Здесь вы можете найти новых друзей и партнеров.</p>
                <button
                  onClick={() => {
                    setIsDatingAuthorized(false);
                    localStorage.removeItem("rpg_dating_authorized");
                    setDatingPassword("");
                  }}
                  className="w-full py-3 rounded-xl bg-stone-800 text-stone-300 font-bold uppercase tracking-widest hover:bg-stone-700 transition-all"
                >
                  Выйти из раздела
                </button>
              </div>
            )}
          </motion.div>
        )}

        {page === 2 && (
          <motion.div
            key="page2"
            className="min-h-screen flex flex-col items-center justify-center p-8 text-stone-100 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {/* Top Bar with Mail Icon */}
            <div className="absolute top-6 right-6 flex gap-3 z-10">
              <button 
                onClick={() => setPage(7)}
                className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10 relative shadow-lg"
              >
                <Mail className="w-5 h-5 text-stone-300" />
                <span className={`absolute top-0 right-0 w-3 h-3 border-2 border-stone-900 rounded-full ${
                  messages.some(m => !m.read) ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}></span>
              </button>
            </div>

            <div className="w-full max-w-md p-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl mb-6 relative mt-10">
              {/* Avatar */}
              <div className={`absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-stone-900 border-2 ${playerGender === 'male' ? 'border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.3)]'} flex items-center justify-center shadow-lg overflow-hidden`}>
                <User className={`w-10 h-10 ${playerGender === 'male' ? 'text-blue-400' : 'text-pink-400'}`} />
                <div className={`absolute inset-0 bg-gradient-to-t ${playerGender === 'male' ? 'from-blue-900/20' : 'from-pink-900/20'} to-transparent opacity-50`} />
              </div>
              <div className="flex justify-between items-center mb-2 mt-8">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{playerName}</span>
                    <div className={`px-2 py-0.5 rounded-full ${playerGender === 'male' ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400' : 'bg-pink-500/20 border border-pink-500/50 text-pink-400'} text-[8px] font-bold uppercase tracking-widest`}>
                      {playerGender === 'male' ? 'Мужской профиль' : 'Женский профиль'}
                    </div>
                  </div>
                </div>
                <span className="text-stone-300 font-bold">Уровень {currentLevel}</span>
              </div>
              <div className="mb-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-stone-400 mb-1">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" /> Здоровье</span>
                    <span>{playerHealth} / {maxPlayerHealth}</span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-2 border border-white/10 overflow-hidden">
                    <div className={`${getHealthColor(playerHealth, maxPlayerHealth)} h-full transition-all duration-500`} style={{ width: `${(playerHealth / maxPlayerHealth) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-stone-400 mb-1">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> Опыт</span>
                    <span>{isMaxLevel ? "Макс. уровень" : `${xpIntoLevel} / ${xpNeededForNext}`}</span>
                  </div>
                  <div className="w-full bg-black/50 rounded-full h-2 border border-white/10 overflow-hidden">
                    <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${xpPercentage}%` }} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-stone-300">
                <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5"><Hexagon className="w-4 h-4 text-stone-400"/> Железо: {iron}</div>
                <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5"><Circle className="w-4 h-4 text-zinc-300"/> Серебро: {silver}</div>
                <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5"><Coins className="w-4 h-4 text-yellow-400"/> Золото: {gold}</div>
                <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5"><Gem className="w-4 h-4 text-cyan-400"/> Кристаллы: {diamonds}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full max-w-md text-center">
              <div className="space-y-2">
                <motion.button 
                  onClick={() => setPage(9)}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} 
                  className="w-full py-4 rounded-2xl backdrop-blur-sm bg-amber-900/20 border border-amber-500/30 hover:bg-amber-900/40 transition-colors flex items-center justify-center gap-3 text-amber-400 font-bold shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  <ScrollText className="w-6 h-6" /> Сюжетные миссии
                </motion.button>
              </div>
              <div className="border-t border-white/20 my-2" />
              <div className="space-y-2">
                <motion.button 
                  onClick={() => setPage(2)}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} 
                  className="w-full py-4 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-3 text-stone-100 font-serif tracking-widest uppercase shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                >
                  <Swords className="w-5 h-5" strokeWidth={1} /> Дуэль
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} 
                  className="w-full py-4 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-3 text-stone-100 font-serif tracking-widest uppercase shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                >
                  <Users className="w-5 h-5" strokeWidth={1} /> Битва отрядов
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} 
                  className="w-full py-4 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-3 text-stone-100 font-serif tracking-widest uppercase shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                >
                  <Trophy className="w-5 h-5" strokeWidth={1} /> Королевская битва
                </motion.button>
              </div>
              <div className="border-t border-white/20 my-2" />
              <div className="space-y-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 font-serif tracking-widest uppercase">
                  <ShoppingBag className="w-5 h-5" strokeWidth={1} /> Магазин
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 font-serif tracking-widest uppercase">
                  <Gavel className="w-5 h-5" strokeWidth={1} /> Аукцион
                </motion.button>
              </div>
              <div className="border-t border-white/20 my-2" />
              <div className="space-y-2">
                <motion.button onClick={() => setPage(13)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 font-serif tracking-widest uppercase">
                  <Heart className="w-5 h-5 text-pink-500" strokeWidth={1} /> Знакомства
                </motion.button>
                <motion.button onClick={() => setPage(3)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 font-serif tracking-widest uppercase">
                  <User className="w-5 h-5" strokeWidth={1} /> Мой персонаж
                </motion.button>
                <motion.button onClick={() => setPage(10)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 font-serif tracking-widest uppercase">
                  <Shield className="w-5 h-5" strokeWidth={1} /> Мой клан
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
        {page === 3 && (
          <motion.div
            key="page3"
            className="min-h-screen flex flex-col p-6 text-stone-100 w-full max-w-md mx-auto"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center mb-8 relative mt-4">
              <button 
                onClick={() => setPage(2)} 
                className="absolute left-0 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold uppercase tracking-widest w-full text-center">Экипировка</h2>
            </div>

            {/* Character & Slots */}
            <div className="flex justify-between items-center w-full mt-4">
              {/* Left Column */}
              <div className="flex flex-col gap-4">
                <EquipSlot label="Шлем" item={equippedItems["Шлем"]} />
                <EquipSlot label="Наручи" item={equippedItems["Наручи"]} />
                <EquipSlot label="Меч" item={equippedItems["Меч"]} />
                <EquipSlot label="Штаны" item={equippedItems["Штаны"]} />
                <EquipSlot label="Сапоги" item={equippedItems["Сапоги"]} />
              </div>

              {/* Center Silhouette */}
              <div className="flex-1 flex flex-col items-center justify-center relative px-4">
                <div className={`w-full aspect-[1/2] rounded-full bg-gradient-to-b from-stone-800 to-stone-900 border ${playerGender === 'male' ? 'border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]' : 'border-pink-500/20 shadow-[0_0_40px_rgba(236,72,153,0.1)]'} flex items-center justify-center overflow-hidden relative`}>
                  <User className={`w-24 h-24 ${playerGender === 'male' ? 'text-blue-500/30' : 'text-pink-500/30'}`} />
                  <div className={`absolute inset-0 bg-gradient-to-t ${playerGender === 'male' ? 'from-blue-900/10' : 'from-pink-900/10'} to-transparent`} />
                  
                  {/* Overlay icons for equipped items */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 p-4 opacity-30 pointer-events-none">
                    {(Object.values(equippedItems) as (Item | null)[]).map((item, i) => {
                      if (!item) return <div key={i} />;
                      const name = item.name.toLowerCase();
                      return (
                        <div key={i} className="flex items-center justify-center">
                          {name.includes("меч") && <Swords className="w-4 h-4 text-amber-400" />}
                          {name.includes("щит") && <Shield className="w-4 h-4 text-amber-400" />}
                          {name.includes("лук") && <Wind className="w-4 h-4 text-amber-400" />}
                          {name.includes("топор") && <Gavel className="w-4 h-4 text-amber-400" />}
                          {name.includes("посох") && <Star className="w-4 h-4 text-amber-400" />}
                          {name.includes("рубашка") && <User className="w-4 h-4 text-amber-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-4">
                <EquipSlot label="Ожерелье" item={equippedItems["Ожерелье"]} />
                <EquipSlot label="Перчатки" item={equippedItems["Перчатки"]} />
                <EquipSlot label="Второе оружие" item={equippedItems["Второе оружие"]} />
                <EquipSlot label="Рубашка" item={equippedItems["Рубашка"]} />
                <EquipSlot label="Пояс" item={equippedItems["Пояс"]} />
              </div>
            </div>

            {/* Character Info */}
            <div className="mt-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
              <h3 className="text-2xl font-bold tracking-wider text-white mb-1">{playerName}</h3>
              {title && <div className="text-white text-[10px] font-bold uppercase tracking-widest mb-2">{title.name}</div>}
              
              <div className="flex items-center justify-center gap-2 text-stone-400 mb-2">
                <Shield className="w-4 h-4" />
                <span className="text-sm">Клан: {clanName || "Отсутствует"}</span>
                <span className="mx-2 text-stone-600">•</span>
                <span className="text-sm">Уровень {currentLevel}</span>
              </div>

              {/* Badges and Status */}
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${playerGender === 'male' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-pink-500/20 border-pink-500/50 text-pink-400'} text-[10px] font-bold uppercase tracking-widest`}>
                  {playerGender === 'male' ? 'Мужской профиль' : 'Женский профиль'}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                  Раса: {playerRace}
                </div>
                {playerBadges.includes('admin') && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] font-bold uppercase tracking-widest">
                      <Crown className="w-3 h-3" /> Админ
                    </div>
                  )}
                  {playerBadges.includes('mod') && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                      <Shield className="w-3 h-3" /> Модер
                    </div>
                  )}
                  {playerBadges.includes('support') && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/50 text-green-400 text-[10px] font-bold uppercase tracking-widest">
                      <LifeBuoy className="w-3 h-3" /> Саппорт
                    </div>
                  )}
                  {playerBadges.includes('verified') && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3" /> Вериф
                    </div>
                  )}
                  {playerStatus === 'banned' && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-900 border border-red-600 text-red-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
                      <Ban className="w-3 h-3" /> БАН
                    </div>
                  )}
                  {playerStatus === 'blocked' && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-900 border border-stone-600 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
                      <Lock className="w-3 h-3" /> БЛОК
                    </div>
                  )}
                  {playerStatus === 'frozen' && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-400 text-blue-300 text-[10px] font-bold uppercase tracking-widest">
                      <Snowflake className="w-3 h-3" /> ЗАМОРОЗКА
                    </div>
                  )}
                  {playerStatus === 'muted' && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-800 border border-stone-500 text-stone-500 text-[10px] font-bold uppercase tracking-widest">
                      <MicOff className="w-3 h-3" /> МУТ
                    </div>
                  )}
                </div>

              {/* Online Status Indicator */}
              <div className="flex items-center gap-2 mt-1 relative group">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
                  {isOnline ? (
                    <span className="text-green-400">В сети</span>
                  ) : (
                    (() => {
                      const now = new Date();
                      const diff = now.getTime() - lastSeen.getTime();
                      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                      
                      if (days >= 10) return "Был давно";
                      if (days >= 1) return "Был недавно";
                      
                      const hours = lastSeen.getHours().toString().padStart(2, '0');
                      const minutes = lastSeen.getMinutes().toString().padStart(2, '0');
                      return `Был в ${hours}:${minutes} сегодня`;
                    })()
                  )}
                </span>
                
                {/* Hidden toggle for testing */}
                <button 
                  onClick={() => {
                    if (isOnline) {
                      // Set last seen to 2 hours ago for "today" test
                      const twoHoursAgo = new Date();
                      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
                      setLastSeen(twoHoursAgo);
                    }
                    setIsOnline(!isOnline);
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute -right-8 text-[8px] text-stone-600 hover:text-stone-400 transition-opacity"
                >
                  [переключить]
                </button>
              </div>
            </div>

            {/* Identity Grid - Moved from Profile for prominence */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className={`p-3 rounded-2xl border ${playerGender === 'male' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-pink-500/5 border-pink-500/20'} flex flex-col items-center gap-2 text-center backdrop-blur-sm`}>
                {playerGender === 'male' ? <Mars className="w-5 h-5 text-blue-400" /> : <Venus className="w-5 h-5 text-pink-400" />}
                <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold">Пол</span>
                <span className={`text-[10px] font-bold ${playerGender === 'male' ? 'text-blue-300' : 'text-pink-300'}`}>
                  {playerGender === 'male' ? 'Мужской' : 'Женский'}
                </span>
              </div>
              <div className="p-3 rounded-2xl border bg-stone-500/5 border-stone-500/20 flex flex-col items-center gap-2 text-center backdrop-blur-sm">
                <CalendarDays className="w-5 h-5 text-stone-400" />
                <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold">Возраст</span>
                <span className="text-[10px] font-bold text-stone-200">{playerAge} лет</span>
              </div>
              <div className="p-3 rounded-2xl border bg-stone-500/5 border-stone-500/20 flex flex-col items-center gap-2 text-center backdrop-blur-sm">
                <MapPin className="w-5 h-5 text-stone-400" />
                <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold">Откуда</span>
                <span className="text-[10px] font-bold text-stone-200 truncate w-full">{playerLocation}</span>
              </div>
            </div>

            {/* Attributes */}
            <div className="mt-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] uppercase tracking-widest text-stone-500">Характеристики</h4>
                {unspentStatPoints > 0 && (
                  <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold animate-pulse">
                    Свободных очков: {unspentStatPoints}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {[
                  { label: "Сила", base: 10 + spentStrength, gear: gearBonuses.strength, elixir: elixirBonuses.strength, setter: setSpentStrength, spent: spentStrength, key: 'strength' },
                  { label: "Ловкость", base: 10 + spentAgility, gear: gearBonuses.agility, elixir: elixirBonuses.agility, setter: setSpentAgility, spent: spentAgility, key: 'agility' },
                  { label: "Интуиция", base: 10 + spentIntuition, gear: gearBonuses.intuition, elixir: elixirBonuses.intuition, setter: setSpentIntuition, spent: spentIntuition, key: 'intuition' },
                  { label: "Выносливость", base: 10 + spentEndurance, gear: gearBonuses.endurance, elixir: elixirBonuses.endurance, setter: setSpentEndurance, spent: spentEndurance, key: 'endurance' },
                  { label: "Мудрость", base: 10 + spentWisdom, gear: gearBonuses.wisdom, elixir: elixirBonuses.wisdom, setter: setSpentWisdom, spent: spentWisdom, key: 'wisdom' },
                ].map((stat, idx) => {
                  const pending = pendingStats[stat.key as keyof typeof pendingStats];
                  const total = stat.base + pending + stat.gear + stat.elixir;
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-stone-300">{stat.label}</span>
                      <div className="flex items-center gap-3">
                        <div className="font-mono flex items-center gap-0.5 text-[11px]">
                          <span className="text-stone-400">{stat.base}</span>
                          {pending !== 0 && (
                            <>
                              <span className="text-stone-500">{pending > 0 ? "+" : ""}</span>
                              <span className={`${pending > 0 ? "text-amber-400" : "text-red-400"} font-bold`}>{pending}</span>
                            </>
                          )}
                          <span className="text-stone-500">+</span>
                          <span className="text-green-400">({stat.gear})</span>
                          <span className="text-stone-500">+</span>
                          <span className="text-amber-400">({stat.elixir})</span>
                          <span className="text-stone-500">=</span>
                          <span className="text-red-500 font-bold ml-1">{total}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {pending > 0 && (
                            <button 
                              onClick={() => setPendingStats(prev => ({ ...prev, [stat.key]: prev[stat.key as keyof typeof pendingStats] - 1 }))}
                              className="w-5 h-5 rounded bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 hover:bg-red-500/40 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          )}
                          {unspentStatPoints > 0 && (
                            <button 
                              onClick={() => setPendingStats(prev => ({ ...prev, [stat.key]: prev[stat.key as keyof typeof pendingStats] + 1 }))}
                              className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 hover:bg-amber-500/40 transition-colors"
                            >
                              <PlusCircle className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Confirm Pending Stats */}
              {Object.values(pendingStats).some(v => v !== 0) && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setSpentStrength(prev => prev + pendingStats.strength);
                      setSpentAgility(prev => prev + pendingStats.agility);
                      setSpentIntuition(prev => prev + pendingStats.intuition);
                      setSpentEndurance(prev => prev + pendingStats.endurance);
                      setSpentWisdom(prev => prev + pendingStats.wisdom);
                      setPendingStats({ strength: 0, agility: 0, intuition: 0, endurance: 0, wisdom: 0 });
                    }}
                    className="flex-1 py-2 bg-green-500/20 border border-green-500/50 rounded-xl text-green-400 text-[10px] font-bold uppercase tracking-widest hover:bg-green-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Подтвердить распределение
                  </button>
                  <button
                    onClick={() => setPendingStats({ strength: 0, agility: 0, intuition: 0, endurance: 0, wisdom: 0 })}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/30 transition-all"
                  >
                    Отмена
                  </button>
                </div>
              )}

              {/* Reset Stats Button */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    let costType: 'silver' | 'diamonds' = 'silver';
                    let costAmount = 0;
                    
                    if (currentLevel < 15) {
                      costType = 'silver';
                      costAmount = 90000;
                    } else if (currentLevel <= 40) {
                      costType = 'diamonds';
                      costAmount = 1000;
                    } else {
                      // Level > 40, user didn't specify, I'll keep it at 1000 diamonds or disable
                      costType = 'diamonds';
                      costAmount = 1000;
                    }

                    const hasEnough = costType === 'silver' ? silver >= costAmount : diamonds >= costAmount;
                    
                    if (hasEnough) {
                      if (costType === 'silver') setSilver(prev => prev - costAmount);
                      else setDiamonds(prev => prev - costAmount);
                      
                      setSpentStrength(0);
                      setSpentAgility(0);
                      setSpentIntuition(0);
                      setSpentEndurance(0);
                      setSpentWisdom(0);
                    } else {
                      // Show some feedback? For now just log or do nothing
                      console.log("Not enough currency to reset stats");
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2 group"
                >
                  <RotateCcw className="w-4 h-4 text-stone-500 group-hover:text-amber-400 transition-colors" />
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 group-hover:text-stone-200 transition-colors">Сброс характеристик</span>
                    <span className="text-[8px] text-stone-600">
                      {currentLevel < 15 ? "90,000 серебра" : "1,000 алмазов"}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Indicators */}
            <div className="mt-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full">
              <h4 className="text-[10px] uppercase tracking-widest text-stone-500 mb-4 text-center">Показатели</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-300">Урон</span>
                  <span className="font-mono text-white">
                    {Math.floor((20 + currentLevel * 5) * (1 + (totalStrength - 10) * 0.15))} - {Math.floor((40 + currentLevel * 5) * (1 + (totalStrength - 10) * 0.15))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-300">Шанс уворота</span>
                  <span className="font-mono text-white">{Math.min(95, Math.floor(65 * (1 + (totalAgility - 10) * 0.15)))}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-300">Макс. здоровье</span>
                  <span className="font-mono text-white">{maxPlayerHealth}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-300">Защита (Блок)</span>
                  <span className="font-mono text-white">{Math.floor(10 * (1 + (totalEndurance - 10) * 0.15))}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-300">Шанс крита</span>
                  <span className="font-mono text-white">{Math.min(75, parseFloat((6.5 * (1 + (totalIntuition - 10) * 0.15)).toFixed(1)))}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-300">Бонус опыта</span>
                  <span className="font-mono text-white">+{Math.floor(10 * (1 + (totalWisdom - 10) * 0.15))}%</span>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="mt-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full">
              <h4 className="text-[10px] uppercase tracking-widest text-stone-500 mb-4 text-center">Статистика персонажа</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm"><span className="text-stone-300">Победы (Дуэль)</span><span className="font-mono text-white">0</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-stone-300">Победы (Битва отрядов)</span><span className="font-mono text-white">0</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-stone-300">Победы (Королевская битва)</span><span className="font-mono text-white">0</span></div>
              </div>
            </div>

            {/* My Profile (Anketa) */}
            <div className="mt-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <ScrollText className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-amber-400 font-black">Моя анкета</h4>
                    <p className="text-[8px] text-stone-500 uppercase tracking-tighter">Личные данные героя</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setTempRealName(realName);
                    setTempRace(playerRace);
                    setTempAge(playerAge);
                    setTempCountry(country);
                    setTempStatus(characterStatus);
                    setIsEditingProfile(true);
                  }}
                  className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                >
                  <Pencil className="w-4 h-4 text-amber-400" />
                </button>
              </div>
              
              <div className="space-y-6 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 p-3 bg-black/20 rounded-2xl border border-white/5 relative">
                    <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold flex items-center gap-1">
                      <User className="w-2.5 h-2.5" /> {playerGender === 'male' ? 'Имя героя' : 'Имя героини'}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-200 font-medium">{isNameHidden ? "••••••••" : (realName || "Не указано")}</span>
                      <button onClick={() => setIsNameHidden(!isNameHidden)} className="text-stone-600 hover:text-stone-400 transition-colors">
                        {isNameHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 p-3 bg-black/20 rounded-2xl border border-white/5">
                    <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" /> Никнейм
                    </span>
                    <span className="text-xs text-stone-200 font-medium">{playerName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 p-3 bg-black/20 rounded-2xl border border-white/5">
                    <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold flex items-center gap-1">
                      <CalendarDays className="w-2.5 h-2.5" /> Возраст
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-200 font-medium">{isAgeHidden ? "••" : playerAge}</span>
                      <button onClick={() => setIsAgeHidden(!isAgeHidden)} className="text-stone-600 hover:text-stone-400 transition-colors">
                        {isAgeHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 p-3 bg-black/20 rounded-2xl border border-white/5">
                    <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold flex items-center gap-1">
                      <Flag className="w-2.5 h-2.5" /> Страна
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-200 font-medium">{isCountryHidden ? "••••••••" : country}</span>
                      <button onClick={() => setIsCountryHidden(!isCountryHidden)} className="text-stone-600 hover:text-stone-400 transition-colors">
                        {isCountryHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[8px] uppercase tracking-widest text-stone-500 font-bold flex items-center gap-1 ml-1">
                    <BookOpen className="w-2.5 h-2.5" /> Статус персонажа
                  </span>
                  <div className="p-4 bg-gradient-to-br from-black/40 to-black/20 rounded-2xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/30" />
                    <p className="text-xs text-stone-400 italic leading-relaxed">"{characterStatus}"</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 mb-12 space-y-2 w-full">
              <motion.button 
                onClick={() => setPage(8)}
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.95 }} 
                className="w-full py-3 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Backpack className="w-5 h-5" /> Мой инвентарь
              </motion.button>
              <motion.button 
                onClick={() => setPage(7)}
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.95 }} 
                className="w-full py-3 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" /> Моя почта
              </motion.button>
              <motion.button 
                onClick={() => setPage(11)}
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.95 }} 
                className="w-full py-3 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" /> Настройки
              </motion.button>
              
              <div className="border-t border-white/20 my-4" />
              
              <motion.button onClick={() => setPage(2)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="w-full py-3 rounded-full backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-stone-300">
                <ArrowLeft className="w-5 h-5" /> Назад
              </motion.button>
            </div>
          </motion.div>
        )}
        {page === 6 && (
          <motion.div
            key="page6"
            className="min-h-screen flex flex-col p-6 text-stone-100 w-full max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center mb-8 relative mt-4">
              <button 
                onClick={() => setPage(9)} 
                className="absolute left-0 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold uppercase tracking-widest w-full text-center text-green-400">Темный Лес</h2>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <p className="text-stone-400 text-center mb-4">Выберите противника для охоты:</p>
              
              {FOREST_ENEMIES.map((enemy, idx) => {
                const isUnlocked = forestProgress >= idx;
                const isDefeated = forestProgress > idx;
                
                return (
                  <motion.button
                    key={idx}
                    onClick={() => {
                      if (isUnlocked && !isDefeated) {
                        setPlayerHealth(maxPlayerHealth);
                        setWolfHealth(enemy.maxHealth);
                        setBattleLog([]);
                        setPage(4);
                      }
                    }}
                    whileHover={isUnlocked && !isDefeated ? { scale: 1.02 } : {}}
                    whileTap={isUnlocked && !isDefeated ? { scale: 0.95 } : {}}
                    className={`w-full py-4 px-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 flex items-center justify-between ${
                      isDefeated 
                        ? "bg-stone-900/50 border-stone-800 text-stone-600 opacity-70" 
                        : isUnlocked 
                          ? "bg-green-900/20 border-green-500/30 text-green-100 hover:bg-green-900/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                          : "bg-black/40 border-white/5 text-stone-700 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <PawPrint className={`w-6 h-6 ${isDefeated ? 'text-stone-700' : isUnlocked ? 'text-green-500' : 'text-stone-800'}`} />
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">
                            {enemy.name}
                            {enemy.name === "Черный волк" && ` (${blackWolfKills}/3)`}
                          </span>
                          {enemy.name === "Вожак волчьей стаи" && <Crown className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            currentLevel >= (enemy as any).recLevel 
                              ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>
                            Ур. {(enemy as any).recLevel}
                          </span>
                          {isUnlocked && !isDefeated && <span className="text-[10px] text-green-400/70 uppercase tracking-widest font-medium">Доступно</span>}
                          {isDefeated && <span className="text-[10px] text-stone-500 uppercase tracking-widest font-medium">Побежден</span>}
                          {!isUnlocked && <span className="text-[10px] text-stone-700 uppercase tracking-widest font-medium">Заблокировано</span>}
                        </div>
                      </div>
                    </div>
                    {isUnlocked && !isDefeated && <Swords className="w-5 h-5 text-green-500/50" />}
                    {isDefeated && <Lock className="w-5 h-5 text-stone-700" />}
                    {!isUnlocked && <Lock className="w-5 h-5 text-stone-800" />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
        {page === 7 && (
          <motion.div
            key="page7"
            className="min-h-screen flex flex-col p-6 text-stone-100 w-full max-w-md mx-auto"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center mb-8 relative mt-4">
              <button 
                onClick={() => setPage(2)} 
                className="absolute left-0 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold uppercase tracking-widest w-full text-center">Почта</h2>
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-20">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-stone-500 gap-4">
                  <Mail className="w-12 h-12 opacity-20" />
                  <p>У вас пока нет писем</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    onClick={() => {
                      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
                    }}
                    className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                      msg.read 
                        ? "bg-white/5 border-white/10 text-stone-400" 
                        : "bg-amber-500/10 border-amber-500/30 text-stone-100 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] uppercase tracking-widest font-bold ${msg.read ? "text-stone-600" : "text-amber-400"}`}>
                        {msg.read ? "Прочитано" : "Новое письмо"}
                      </span>
                      <span className="text-[10px] text-stone-600">{msg.date}</span>
                    </div>
                    <p className="text-sm leading-relaxed mb-3">{msg.text}</p>
                    
                      {msg.claimable && !msg.claimed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (msg.claimable) {
                              if (msg.claimable.givesKey) {
                                setHasGiftKey(true);
                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, claimed: true, read: true } : m));
                              } else {
                                const chest: Item = {
                                  id: Math.random().toString(36).substr(2, 9),
                                  name: "Сундук с ресурсами",
                                  level: 1,
                                  rarity: 'rare',
                                  type: 'chest',
                                  bonusPercent: 0,
                                  stats: { strength: 0, agility: 0, intuition: 0, endurance: 0, wisdom: 0 },
                                  isChest: true,
                                  chestRewards: msg.claimable
                                };
                                setChestsInventory(prev => [...prev, chest]);
                                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, claimed: true, read: true } : m));
                              }
                            }
                          }}
                          className="w-full py-2 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-400 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500/30 transition-all flex items-center justify-center gap-2"
                        >
                          <Package className="w-3 h-3" /> {msg.claimable.givesKey ? "Забрать Кольцо-ключ" : "Забрать в инвентарь"}
                        </button>
                      )}
                      
                      {msg.claimed && (
                        <div className="text-[10px] text-green-500/70 font-bold uppercase tracking-widest flex items-center gap-2">
                          <Check className="w-4 h-4" /> {msg.claimable?.givesKey ? "Кольцо получено" : "Ресурсы получены"}
                        </div>
                      )}
                  </motion.div>
                ))
              )}
            </div>

            <motion.button 
              onClick={() => setPage(2)}
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.95 }} 
              className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md py-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm"
            >
              <ArrowLeft className="w-5 h-5" /> Назад
            </motion.button>
          </motion.div>
        )}
        {page === 8 && (
          <motion.div
            key="page8"
            className="min-h-screen flex flex-col p-6 text-stone-100 w-full max-w-md mx-auto"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center mb-6 relative mt-4">
              <button 
                onClick={() => setPage(3)} 
                className="absolute left-0 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold uppercase tracking-widest w-full text-center">Инвентарь</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { id: "equipment", label: "Снаряжение", icon: Swords },
                { id: "books", label: "Книги", icon: BookOpen },
                { id: "elixirs", label: "Эликсиры", icon: FlaskConical },
                { id: "chests", label: "Сундуки", icon: Package },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setInventoryTab(tab.id as any);
                    setSelectedItemIdx(null);
                  }}
                  className={`flex-1 py-3 rounded-xl border flex flex-col items-center gap-1 transition-all duration-300 ${
                    inventoryTab === tab.id 
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]" 
                      : "bg-white/5 border-white/10 text-stone-500 hover:bg-white/10"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-[9px] uppercase font-bold tracking-tighter">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto pb-24 pr-1">
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 50 }).map((_, idx) => {
                  const isOpen = idx < 10;
                  const currentInv = inventoryTab === "equipment" ? inventory : inventoryTab === "books" ? booksInventory : inventoryTab === "elixirs" ? elixirsInventory : chestsInventory;
                  const item = isOpen ? currentInv[idx] : null;
                  const isSelected = selectedItemIdx === idx;

                  return (
                    <div key={idx} className="relative aspect-square">
                      <motion.div
                        whileHover={isOpen ? { scale: 1.05 } : {}}
                        whileTap={isOpen ? { scale: 0.95 } : {}}
                        onClick={() => {
                          if (isOpen && item) {
                            setSelectedItemIdx(isSelected ? null : idx);
                          }
                        }}
                        className={`w-full h-full rounded-xl border flex items-center justify-center transition-all duration-300 relative overflow-hidden ${
                          !isOpen 
                            ? "bg-black/40 border-white/5 opacity-40 cursor-not-allowed" 
                            : isSelected
                              ? "bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] z-10"
                              : item
                                ? (inventoryTab === "equipment" && (item as Item).rarity === 'common' 
                                    ? "bg-stone-800/80 border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.1)] cursor-pointer" 
                                    : "bg-stone-800/80 border-white/20 hover:border-white/40 cursor-pointer")
                                : "bg-black/20 border-white/5 cursor-default"
                        }`}
                      >
                        {!isOpen ? (
                          <Lock className="w-4 h-4 text-stone-700" />
                        ) : item ? (
                          <div className="flex flex-col items-center justify-center p-1">
                            {inventoryTab === "equipment" || inventoryTab === "chests" ? (
                              <>
                                {inventoryTab === "equipment" && (
                                  <>
                                    {(item as Item).name.toLowerCase().includes("меч") && <Swords className="w-6 h-6 text-stone-300" />}
                                    {(item as Item).name.toLowerCase().includes("щит") && <Shield className="w-6 h-6 text-stone-300" />}
                                    {(item as Item).name.toLowerCase().includes("лук") && <Wind className="w-6 h-6 text-stone-300" />}
                                    {(item as Item).name.toLowerCase().includes("топор") && <Gavel className="w-6 h-6 text-stone-300" />}
                                    {(item as Item).name.toLowerCase().includes("посох") && <Star className="w-6 h-6 text-stone-300" />}
                                    {(item as Item).name.toLowerCase().includes("рубашка") && <User className="w-6 h-6 text-stone-300" />}
                                    {!(item as Item).name.toLowerCase().includes("меч") && !(item as Item).name.toLowerCase().includes("щит") && !(item as Item).name.toLowerCase().includes("лук") && !(item as Item).name.toLowerCase().includes("топор") && !(item as Item).name.toLowerCase().includes("посох") && !(item as Item).name.toLowerCase().includes("рубашка") && <ShoppingBag className="w-6 h-6 text-stone-300" />}
                                  </>
                                )}
                                {inventoryTab === "chests" && (
                                  <div className="relative">
                                    <Package className="w-6 h-6 text-amber-400" />
                                    {!hasGiftKey && (
                                      <div className="absolute -top-1 -right-1 bg-red-500/20 rounded-full p-0.5 border border-red-500/50">
                                        <Lock className="w-2 h-2 text-red-400" />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                {(item as string).includes("меч") && <Swords className="w-6 h-6 text-stone-300" />}
                                {(item as string).includes("щит") && <Shield className="w-6 h-6 text-stone-300" />}
                                {(item as string).includes("лук") && <Wind className="w-6 h-6 text-stone-300" />}
                                {(item as string).includes("топор") && <Gavel className="w-6 h-6 text-stone-300" />}
                                {(item as string).includes("посох") && <Star className="w-6 h-6 text-stone-300" />}
                                {(item as string).includes("рубашка") && <User className="w-6 h-6 text-stone-300" />}
                                {inventoryTab === "books" && <BookOpen className="w-6 h-6 text-stone-300" />}
                                {inventoryTab === "elixirs" && <FlaskConical className="w-6 h-6 text-stone-300" />}
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white/5" />
                        )}
                      </motion.div>
                      
                      {/* Item Details Popup (Overlay) */}
                      <AnimatePresence>
                        {isSelected && item && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute top-full left-0 right-0 mt-2 z-50 bg-stone-900 border border-white/20 rounded-2xl p-3 shadow-2xl min-w-[180px]"
                            style={{ left: idx % 5 > 2 ? 'auto' : 0, right: idx % 5 > 2 ? 0 : 'auto' }}
                          >
                            <div className="mb-3">
                              <div className="text-xs font-bold text-amber-400 mb-0.5 truncate">
                                {inventoryTab === "equipment" || inventoryTab === "chests" ? (item as Item).name : (item as string)}
                              </div>
                              <div className="text-[9px] text-stone-500 uppercase tracking-widest flex justify-between">
                                <span>{inventoryTab === "equipment" ? "Снаряжение" : inventoryTab === "books" ? "Книга" : inventoryTab === "elixirs" ? "Эликсир" : "Сундук"}</span>
                                {inventoryTab === "equipment" && <span>Ур. {(item as Item).level}</span>}
                              </div>
                            </div>

                            {inventoryTab === "chests" && (item as Item).chestRewards && (
                              <div className="mb-3 space-y-1 bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="text-[9px] text-stone-500 uppercase tracking-widest mb-1">Содержимое:</div>
                                {(item as Item).chestRewards?.iron && <div className="text-[10px] text-stone-400">Железо: <span className="text-white">{(item as Item).chestRewards?.iron}</span></div>}
                                {(item as Item).chestRewards?.silver && <div className="text-[10px] text-stone-400">Серебро: <span className="text-white">{(item as Item).chestRewards?.silver}</span></div>}
                                {(item as Item).chestRewards?.gold && <div className="text-[10px] text-stone-400">Золото: <span className="text-white">{(item as Item).chestRewards?.gold}</span></div>}
                                {(item as Item).chestRewards?.diamonds && <div className="text-[10px] text-stone-400">Алмазы: <span className="text-white">{(item as Item).chestRewards?.diamonds}</span></div>}
                              </div>
                            )}

                            {inventoryTab === "equipment" && (
                              <div className="mb-3 space-y-1 bg-black/40 p-2 rounded-lg border border-white/5">
                                <div className="flex justify-between items-center text-[10px] mb-1 pb-1 border-b border-white/5">
                                  <span className="text-amber-400 font-bold">Бонус:</span>
                                  <span className="text-amber-400 font-bold">+{ (item as Item).bonusPercent }%</span>
                                </div>
                                {(() => {
                                  const equipment = item as Item;
                                  let slot = "";
                                  if (equipment.name.toLowerCase().includes("меч") || equipment.name.toLowerCase().includes("лук") || equipment.name.toLowerCase().includes("топор") || equipment.name.toLowerCase().includes("посох")) slot = "Меч";
                                  else if (equipment.name.toLowerCase().includes("щит")) slot = "Второе оружие";
                                  else if (equipment.name.toLowerCase().includes("рубашка")) slot = "Рубашка";
                                  
                                  const equipped = slot ? equippedItems[slot] : null;

                                  return Object.entries(equipment.stats).map(([key, val]) => {
                                    if (val === 0) return null;
                                    const equippedVal = equipped ? (equipped.stats as any)[key] : 0;
                                    const diff = val - equippedVal;
                                    const statLabel = key === "strength" ? "Сил" : key === "agility" ? "Лов" : key === "intuition" ? "Инт" : key === "endurance" ? "Вын" : "Муд";
                                    
                                    return (
                                      <div key={key} className="flex justify-between items-center text-[10px]">
                                        <span className="text-stone-400">{statLabel}:</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-white font-mono">{val}</span>
                                          {equipped && diff !== 0 && (
                                            <span className={`text-[8px] font-bold ${diff > 0 ? "text-green-400" : "text-red-400"}`}>
                                              ({diff > 0 ? "+" : ""}{diff})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-1.5">
                              {inventoryTab === "equipment" ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const equipment = item as Item;
                                    let slot = "";
                                    if (equipment.name.toLowerCase().includes("меч") || equipment.name.toLowerCase().includes("лук") || equipment.name.toLowerCase().includes("топор") || equipment.name.toLowerCase().includes("посох")) slot = "Меч";
                                    else if (equipment.name.toLowerCase().includes("щит")) slot = "Второе оружие";
                                    else if (equipment.name.toLowerCase().includes("рубашка")) slot = "Рубашка";
                                    
                                    if (slot) {
                                      const oldItem = equippedItems[slot];
                                      setEquippedItems(prev => ({ ...prev, [slot]: equipment }));
                                      setInventory(prev => {
                                        const newInv = [...prev];
                                        newInv.splice(idx, 1);
                                        if (oldItem) newInv.push(oldItem);
                                        return newInv;
                                      });
                                      setSelectedItemIdx(null);
                                    }
                                  }}
                                  className="w-full py-2 bg-green-900/30 border border-green-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest text-green-400 hover:bg-green-900/50 transition-colors"
                                >
                                  Одеть
                                </button>
                              ) : inventoryTab === "chests" ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!hasGiftKey) {
                                      alert("Для открытия этого сундука необходимо Кольцо-ключ, которое присылают на почту при достижении 5 уровня!");
                                      return;
                                    }
                                    const chest = item as Item;
                                    if (chest.chestRewards) {
                                      if (chest.chestRewards.iron) setIron(prev => prev + chest.chestRewards!.iron!);
                                      if (chest.chestRewards.silver) setSilver(prev => prev + chest.chestRewards!.silver!);
                                      if (chest.chestRewards.gold) setGold(prev => prev + chest.chestRewards!.gold!);
                                      if (chest.chestRewards.diamonds) setDiamonds(prev => prev + chest.chestRewards!.diamonds!);
                                      
                                      setChestsInventory(prev => {
                                        const newInv = [...prev];
                                        newInv.splice(idx, 1);
                                        return newInv;
                                      });
                                      setSelectedItemIdx(null);
                                    }
                                  }}
                                  className="w-full py-2 bg-amber-500/20 border border-amber-500/50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-amber-400 hover:bg-amber-500/30 transition-colors"
                                >
                                  Открыть
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Placeholder for use logic
                                    if (inventoryTab === "books") {
                                      setBooksInventory(prev => {
                                        const newInv = [...prev];
                                        newInv.splice(idx, 1);
                                        return newInv;
                                      });
                                    } else {
                                      setElixirsInventory(prev => {
                                        const newInv = [...prev];
                                        newInv.splice(idx, 1);
                                        return newInv;
                                      });
                                    }
                                    setSelectedItemIdx(null);
                                  }}
                                  className="w-full py-2 bg-green-900/30 border border-green-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest text-green-400 hover:bg-green-900/50 transition-colors"
                                >
                                  Использовать
                                </button>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIron(prev => prev + 1);
                                  if (inventoryTab === "equipment") {
                                    setInventory(prev => {
                                      const newInv = [...prev];
                                      newInv.splice(idx, 1);
                                      return newInv;
                                    });
                                  } else if (inventoryTab === "books") {
                                    setBooksInventory(prev => {
                                      const newInv = [...prev];
                                      newInv.splice(idx, 1);
                                      return newInv;
                                    });
                                  } else {
                                    setElixirsInventory(prev => {
                                      const newInv = [...prev];
                                      newInv.splice(idx, 1);
                                      return newInv;
                                    });
                                  }
                                  setSelectedItemIdx(null);
                                }}
                                className="w-full py-2 bg-blue-900/30 border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:bg-blue-900/50 transition-colors"
                              >
                                Разобрать
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (inventoryTab === "equipment") {
                                    setInventory(prev => {
                                      const newInv = [...prev];
                                      newInv.splice(idx, 1);
                                      return newInv;
                                    });
                                  } else if (inventoryTab === "books") {
                                    setBooksInventory(prev => {
                                      const newInv = [...prev];
                                      newInv.splice(idx, 1);
                                      return newInv;
                                    });
                                  } else {
                                    setElixirsInventory(prev => {
                                      const newInv = [...prev];
                                      newInv.splice(idx, 1);
                                      return newInv;
                                    });
                                  }
                                  setSelectedItemIdx(null);
                                }}
                                className="w-full py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-900/50 transition-colors"
                              >
                                Выбросить
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            <motion.button 
              onClick={() => setPage(3)}
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.95 }} 
              className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md py-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm"
            >
              <ArrowLeft className="w-5 h-5" /> Назад
            </motion.button>
          </motion.div>
        )}
        {page === 9 && (
          <motion.div
            key="page9"
            className="min-h-screen flex flex-col p-6 text-stone-100 w-full max-w-md mx-auto"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center mb-8 relative mt-4">
              <button 
                onClick={() => setPage(2)} 
                className="absolute left-0 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold uppercase tracking-widest w-full text-center text-amber-400">Сюжетные миссии</h2>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <p className="text-stone-400 text-center mb-4">Выберите доступную главу сюжета:</p>
              
              <motion.button
                onClick={() => setPage(6)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className={`w-full py-5 px-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 flex items-center justify-between ${
                  forestProgress < 4
                    ? "bg-green-900/20 border-green-500/30 text-green-100 hover:bg-green-900/40 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                    : "bg-stone-900/50 border-stone-800 text-stone-500 opacity-70"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${forestProgress < 4 ? 'bg-green-500/20 text-green-400' : 'bg-stone-800 text-stone-600'}`}>
                    <TreePine className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">Темный Лес</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">
                      {forestProgress < 4 ? "Глава 1: В процессе" : "Глава 1: Завершено"}
                    </span>
                  </div>
                </div>
                {forestProgress < 4 ? <ChevronRight className="w-5 h-5 text-green-500/50" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
              </motion.button>

              <motion.button
                disabled={forestProgress < 4}
                whileHover={forestProgress >= 4 ? { scale: 1.02 } : {}}
                whileTap={forestProgress >= 4 ? { scale: 0.95 } : {}}
                className={`w-full py-5 px-6 rounded-2xl backdrop-blur-sm border transition-all duration-300 flex items-center justify-between ${
                  forestProgress >= 4
                    ? "bg-stone-800/40 border-stone-400/30 text-stone-200 hover:bg-stone-700/40"
                    : "bg-black/40 border-white/5 text-stone-700 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${forestProgress >= 4 ? 'bg-stone-700/40 text-stone-300' : 'bg-stone-900 text-stone-800'}`}>
                    <Mountain className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-lg">Поход в горы</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-60">
                      {forestProgress >= 4 ? "Глава 2: Доступно" : "Глава 2: Заблокировано"}
                    </span>
                  </div>
                </div>
                {forestProgress >= 4 ? <ChevronRight className="w-5 h-5 text-stone-500" /> : <Lock className="w-5 h-5 text-stone-800" />}
              </motion.button>

              <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-xs text-stone-500 italic">Новые главы будут открываться по мере прохождения сюжета...</p>
              </div>
            </div>

            <motion.button 
              onClick={() => setPage(2)}
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.95 }} 
              className="mt-auto py-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm"
            >
              <ArrowLeft className="w-5 h-5" /> В город
            </motion.button>
          </motion.div>
        )}
        {page === 10 && (
          <motion.div
            key="page10"
            className="min-h-screen flex flex-col p-6 text-stone-100 w-full max-w-md mx-auto"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="flex items-center mb-8 relative mt-4">
              <button 
                onClick={() => setPage(2)} 
                className="absolute left-0 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold uppercase tracking-widest w-full text-center text-amber-400">Мой клан</h2>
            </div>

            <div className="flex-1 flex flex-col gap-6">
              {clanName ? (
                <div className="flex flex-col h-full">
                  {/* Clan Tabs */}
                  <div className="flex gap-2 mb-6">
                    <button 
                      onClick={() => setClanTab("info")}
                      className={`flex-1 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        clanTab === "info" ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-white/5 border-white/10 text-stone-500"
                      }`}
                    >
                      Инфо
                    </button>
                    <button 
                      onClick={() => setClanTab("members")}
                      className={`flex-1 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                        clanTab === "members" ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-white/5 border-white/10 text-stone-500"
                      }`}
                    >
                      Участники
                    </button>
                    {(clanRole === "Лидер" || clanRole === "Зам") && (
                      <button 
                        onClick={() => setClanTab("manage")}
                        className={`flex-1 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                          clanTab === "manage" ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-white/5 border-white/10 text-stone-500"
                        }`}
                      >
                        Управление
                      </button>
                    )}
                  </div>

                  {clanTab === "info" && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="w-20 h-20 rounded-full bg-amber-900/20 border-2 border-amber-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                        <Shield className="w-10 h-10 text-amber-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-1">{clanName}</h3>
                      <div className="flex items-center gap-2 mb-6">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${
                          clanRole === "Лидер" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                          clanRole === "Зам лидера" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                          clanRole === "Майоры" ? "bg-purple-500/10 border-purple-500/30 text-purple-400" :
                          clanRole === "Офицеры" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                          clanRole === "Воины" ? "bg-green-500/10 border-green-500/30 text-green-400" :
                          "bg-stone-500/10 border-stone-500/30 text-stone-400"
                        }`}>
                          {clanRole}
                        </span>
                      </div>
                      
                      <div className="w-full grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                          <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">Участники</div>
                          <div className="text-lg font-bold text-white">{clanMembers.length + 1} / 50</div>
                        </div>
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                          <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">Рейтинг</div>
                          <div className="text-lg font-bold text-white">#999</div>
                        </div>
                      </div>

                      {!showClanLeaveConfirm ? (
                        <button 
                          onClick={() => setShowClanLeaveConfirm(true)}
                          className="text-red-400 text-xs font-bold uppercase tracking-widest hover:text-red-300 transition-colors flex items-center gap-2"
                        >
                          <Lock className="w-3 h-3" /> Покинуть клан
                        </button>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <p className="text-red-400 text-xs font-bold">Вы уверены?</p>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => {
                                if (clanRole === "Лидер") {
                                  const hasDeputy = clanMembers.some(m => m.role === "Зам лидера");
                                  if (!hasDeputy) {
                                    alert("Сначала передайте права клана заместителю!");
                                    setShowClanLeaveConfirm(false);
                                    return;
                                  }
                                }
                                setExistingClans(prev => prev.map(c => 
                                  c.name === clanName ? { ...c, members: c.members - 1 } : c
                                ).filter(c => c.members > 0));
                                setClanName(null);
                                setClanRole("Новобранец");
                                setClanMembers([]);
                                setShowClanLeaveConfirm(false);
                              }}
                              className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/30 transition-all"
                            >
                              Да, покинуть
                            </button>
                            <button 
                              onClick={() => setShowClanLeaveConfirm(false)}
                              className="px-4 py-2 bg-stone-800 border border-white/10 rounded-lg text-stone-300 text-[10px] font-bold uppercase tracking-widest hover:bg-stone-700 transition-all"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {clanTab === "members" && (
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                      {/* Self */}
                      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs border border-amber-500/30">
                            {playerName[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-white flex items-center gap-1">
                              {playerName} <span className="text-[10px] text-amber-400">(Вы)</span>
                            </span>
                            <span className="text-[9px] text-stone-500 uppercase tracking-widest">Ур. {currentLevel} • {clanRole}</span>
                          </div>
                        </div>
                        <Crown className="w-4 h-4 text-amber-400" />
                      </div>

                      {clanMembers.map((member, idx) => (
                        <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 font-bold text-xs border border-white/5">
                              {member.name[0]}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-stone-200">{member.name}</span>
                              <span className="text-[9px] text-stone-500 uppercase tracking-widest">Ур. {member.level} • {member.role}</span>
                            </div>
                          </div>
                          {member.role === "Лидер" && <Crown className="w-4 h-4 text-red-400" />}
                          {member.role === "Зам" && <Shield className="w-4 h-4 text-amber-400" />}
                          {member.role === "Майор" && <Shield className="w-4 h-4 text-purple-400" />}
                          {member.role === "Офицер" && <Shield className="w-4 h-4 text-blue-400" />}
                          {member.role === "Новичок" && <User className="w-4 h-4 text-stone-500" />}
                          {member.role === "Проверенный" && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        </div>
                      ))}
                    </div>
                  )}

                  {clanTab === "manage" && (
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <h4 className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-2">Настройки клана</h4>
                        <p className="text-[10px] text-stone-600 italic">Дополнительные настройки будут доступны в следующих обновлениях...</p>
                      </div>
                      <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-4">
                        <h4 className="text-[10px] uppercase tracking-widest text-red-400 font-bold mb-4 flex items-center gap-2">
                          <Settings className="w-3 h-3" /> Управление составом
                        </h4>
                        
                        <div className="space-y-2">
                          {clanMembers.map((member, idx) => (
                            <div key={idx} className="flex flex-col gap-2 p-3 bg-black/20 rounded-xl border border-white/5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm">{member.name}</span>
                                  <span className="text-[9px] text-stone-500 uppercase">{member.role}</span>
                                </div>
                                <button 
                                  onClick={() => setSelectedMemberIdx(selectedMemberIdx === idx ? null : idx)}
                                  className="p-1 hover:bg-white/10 rounded transition-colors"
                                >
                                  <Settings className="w-4 h-4 text-stone-500" />
                                </button>
                              </div>

                              {selectedMemberIdx === idx && (
                                <div className="grid grid-cols-2 gap-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                  {(clanRole === "Лидер" || clanRole === "Зам") && (
                                    <>
                                      <button 
                                        onClick={() => {
                                          const newMembers = [...clanMembers];
                                          newMembers[idx].role = "Лидер";
                                          setClanMembers(newMembers);
                                          setClanRole("Проверенный"); // Current user steps down
                                          setClanTab("info");
                                          setSelectedMemberIdx(null);
                                        }}
                                        className="py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-[9px] font-bold uppercase text-red-200"
                                      >
                                        Передать права
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const newMembers = [...clanMembers];
                                          newMembers[idx].role = "Зам";
                                          setClanMembers(newMembers);
                                          setSelectedMemberIdx(null);
                                        }}
                                        className="py-2 bg-amber-500/20 border border-amber-500/50 rounded-lg text-[9px] font-bold uppercase text-amber-200"
                                      >
                                        Дать Зама
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    onClick={() => {
                                      const newMembers = [...clanMembers];
                                      newMembers[idx].role = "Майор";
                                      setClanMembers(newMembers);
                                      setSelectedMemberIdx(null);
                                    }}
                                    className="py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg text-[9px] font-bold uppercase text-purple-200"
                                  >
                                    Дать Майора
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const newMembers = [...clanMembers];
                                      newMembers[idx].role = "Офицер";
                                      setClanMembers(newMembers);
                                      setSelectedMemberIdx(null);
                                    }}
                                    className="py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-[9px] font-bold uppercase text-blue-200"
                                  >
                                    Дать Офицера
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const newMembers = [...clanMembers];
                                      newMembers[idx].role = "Проверенный";
                                      setClanMembers(newMembers);
                                      setSelectedMemberIdx(null);
                                    }}
                                    className="py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-[9px] font-bold uppercase text-green-200"
                                  >
                                    Проверенный
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const newMembers = [...clanMembers];
                                      newMembers[idx].role = "Новичок";
                                      setClanMembers(newMembers);
                                      setSelectedMemberIdx(null);
                                    }}
                                    className="py-2 bg-stone-500/20 border border-stone-500/50 rounded-lg text-[9px] font-bold uppercase text-stone-200"
                                  >
                                    Новичок
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setClanMembers(prev => prev.filter((_, i) => i !== idx));
                                      setSelectedMemberIdx(null);
                                    }}
                                    className="col-span-2 py-2 bg-stone-800 border border-red-500/30 rounded-lg text-[9px] font-bold uppercase text-red-400"
                                  >
                                    Выгнать
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-stone-800 border border-white/10 flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-stone-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Вы не состоите в клане</h3>
                    <p className="text-stone-400 text-sm">Вступайте в клан, чтобы участвовать в битвах и получать бонусы!</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {isCreatingClan ? (
                      // ... (existing creation UI)
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Название клана</label>
                          <input 
                            type="text"
                            value={newClanNameInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setNewClanNameInput(val);
                                return;
                              }
                              if (val.length > 20) return;
                              if ((val.match(/ /g) || []).length > 5) return;
                              if (!/^[A-Za-zА-Яа-яЁё\s]+$/.test(val)) return;
                              const hasEnglish = /[A-Za-z]/.test(val);
                              const hasRussian = /[А-Яа-яЁё]/.test(val);
                              if (hasEnglish && hasRussian) return;
                              setNewClanNameInput(val);
                            }}
                            placeholder="Введите название..."
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                          />
                          {newClanNameInput.length > 0 && newClanNameInput.replace(/ /g, '').length < 5 && (
                            <p className="text-red-400 text-[10px]">Минимум 5 букв</p>
                          )}
                          {existingClans.some(c => c.name.toLowerCase() === newClanNameInput.trim().toLowerCase()) && (
                            <p className="text-amber-400 text-[10px]">Клан с таким названием уже существует. Вы можете вступить в него бесплатно через поиск.</p>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              const name = newClanNameInput.trim();
                              if (name.replace(/ /g, '').length >= 5) {
                                if (existingClans.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                                  // Already exists, just close creation and maybe open join?
                                  setIsCreatingClan(false);
                                  setIsJoiningClan(true);
                                  setClanSearchQuery(name);
                                  return;
                                }
                                if (silver >= 1000) {
                                  setSilver(prev => prev - 1000);
                                  setClanName(name);
                                  setClanRole("Leader");
                                  setClanMembers([]); // New clan starts empty (except leader who is implicit)
                                  setExistingClans(prev => [...prev, { name, members: 1 }]);
                                  setIsCreatingClan(false);
                                  setNewClanNameInput("");
                                }
                              }
                            }}
                            disabled={(silver < 1000 && !existingClans.some(c => c.name.toLowerCase() === newClanNameInput.trim().toLowerCase())) || newClanNameInput.replace(/ /g, '').length < 5}
                            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                              (silver >= 1000 || existingClans.some(c => c.name.toLowerCase() === newClanNameInput.trim().toLowerCase())) && newClanNameInput.replace(/ /g, '').length >= 5
                                ? "bg-amber-500 text-amber-950 hover:bg-amber-400"
                                : "bg-stone-800 text-stone-600 cursor-not-allowed"
                            }`}
                          >
                            {existingClans.some(c => c.name.toLowerCase() === newClanNameInput.trim().toLowerCase()) ? "Найти клан" : "Создать (1000 С)"}
                          </button>
                          <button 
                            onClick={() => {
                              setIsCreatingClan(false);
                              setNewClanNameInput("");
                            }}
                            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-stone-300 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                          >
                            Отмена
                          </button>
                        </div>
                        {silver < 1000 && (
                          <p className="text-red-400 text-[10px] text-center">Недостаточно серебра</p>
                        )}
                      </div>
                    ) : isJoiningClan ? (
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <h4 className="text-stone-400 text-xs font-bold uppercase tracking-widest">Поиск клана</h4>
                          <input 
                            type="text"
                            value={clanSearchQuery}
                            onChange={(e) => setClanSearchQuery(e.target.value)}
                            placeholder="Название клана..."
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-green-500/50 transition-colors"
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto pr-2 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-white/10">
                          {existingClans
                            .filter(c => c.name.toLowerCase().includes(clanSearchQuery.toLowerCase()))
                            .map((clan, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setExistingClans(prev => prev.map(c => 
                                  c.name === clan.name ? { ...c, members: c.members + 1 } : c
                                ));
                                setClanName(clan.name);
                                setClanRole("Member");
                                setClanMembers([]);
                                setIsJoiningClan(false);
                                setClanSearchQuery("");
                              }}
                              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-left hover:bg-white/10 hover:border-green-500/30 transition-all group flex items-center justify-between"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-white group-hover:text-green-400 transition-colors">{clan.name}</span>
                                <span className="text-[10px] text-stone-500 flex items-center gap-1">
                                  <Users className="w-2 h-2" /> {clan.members} участников
                                </span>
                              </div>
                              <Shield className="w-4 h-4 text-stone-600 group-hover:text-green-500 transition-colors" />
                            </button>
                          ))}
                          {existingClans.filter(c => c.name.toLowerCase().includes(clanSearchQuery.toLowerCase())).length === 0 && (
                            <p className="text-stone-500 text-xs text-center py-4 italic">Кланы не найдены</p>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            setIsJoiningClan(false);
                            setClanSearchQuery("");
                          }}
                          className="w-full py-3 bg-stone-800 border border-white/10 rounded-xl text-stone-300 text-xs font-bold uppercase tracking-widest hover:bg-stone-700 transition-all"
                        >
                          Назад
                        </button>
                      </div>
                    ) : (
                      <>
                        <motion.button
                          onClick={() => setIsJoiningClan(true)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-full py-5 px-6 rounded-2xl bg-green-900/20 border border-green-500/30 text-green-100 hover:bg-green-900/40 transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                        >
                          <Users className="w-6 h-6 text-green-400" />
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-lg text-left">Вступить в клан</span>
                            <span className="text-[10px] uppercase tracking-widest opacity-60 text-left">Выбрать из существующих</span>
                          </div>
                        </motion.button>

                        <motion.button
                          onClick={() => setIsCreatingClan(true)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-full py-5 px-6 rounded-2xl bg-amber-900/20 border border-amber-500/30 text-amber-100 hover:bg-amber-900/40 transition-all flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                        >
                          <PlusCircle className="w-6 h-6 text-amber-400" />
                          <div className="flex flex-col items-start">
                            <span className="font-bold text-lg text-left">Создать клан</span>
                            <span className="text-[10px] uppercase tracking-widest opacity-60 text-left">Стоимость: 1000 Серебра</span>
                          </div>
                        </motion.button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <motion.button 
              onClick={() => setPage(2)}
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.95 }} 
              className="mt-auto py-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm"
            >
              <ArrowLeft className="w-5 h-5" /> Назад
            </motion.button>
          </motion.div>
        )}

        {page === 11 && (
          <motion.div
            key="page11"
            className="min-h-screen flex flex-col p-6 text-stone-100 w-full max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center mb-8 relative mt-4">
              <button 
                onClick={() => setPage(3)} 
                className="absolute left-0 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold uppercase tracking-widest w-full text-center text-stone-300">Настройки</h2>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pb-20">
              {/* Admin Panel Section */}
              <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-red-500/20 rounded-lg text-red-400">
                    <Settings className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold uppercase tracking-widest text-red-400">Админ Панель</h3>
                </div>

                <div className="space-y-6">
                  {/* Badges Toggle */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-stone-500 mb-3">Управление значками</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'verified', label: 'Верификация', icon: CheckCircle2, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { id: 'admin', label: 'Админ', icon: Crown, color: 'text-red-400', bg: 'bg-red-500/10' },
                        { id: 'mod', label: 'Модератор', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { id: 'support', label: 'Поддержка', icon: LifeBuoy, color: 'text-green-400', bg: 'bg-green-500/10' },
                      ].map(badge => (
                        <button
                          key={badge.id}
                          onClick={() => {
                            setPlayerBadges(prev => 
                              prev.includes(badge.id) 
                                ? prev.filter(b => b !== badge.id) 
                                : [...prev, badge.id]
                            );
                          }}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                            playerBadges.includes(badge.id)
                              ? `${badge.bg} border-red-500/50 ${badge.color}`
                              : "bg-black/20 border-white/5 text-stone-500"
                          }`}
                        >
                          <badge.icon className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">{badge.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Toggle */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-stone-500 mb-3">Статус аккаунта</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'banned', label: 'Бан', icon: Ban, color: 'text-red-600' },
                        { id: 'blocked', label: 'Блок', icon: Lock, color: 'text-stone-400' },
                        { id: 'frozen', label: 'Заморозка', icon: Snowflake, color: 'text-blue-300' },
                        { id: 'muted', label: 'Мут', icon: MicOff, color: 'text-stone-500' },
                      ].map(status => (
                        <button
                          key={status.id}
                          onClick={() => {
                            setPlayerStatus(prev => prev === status.id ? null : status.id);
                          }}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                            playerStatus === status.id
                              ? `bg-stone-800 border-red-500/50 ${status.color}`
                              : "bg-black/20 border-white/5 text-stone-500"
                          }`}
                        >
                          <status.icon className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">{status.label}</span>
                        </button>
                      ))}
                    </div>
                    {playerStatus && (
                      <button 
                        onClick={() => setPlayerStatus(null)}
                        className="w-full mt-3 py-2 text-[10px] text-stone-500 hover:text-stone-300 transition-colors uppercase tracking-widest font-bold"
                      >
                        Сбросить статус
                      </button>
                    )}
                  </div>

                  {/* Resource Giving */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-stone-500 mb-3">Выдача ресурсов</h4>
                    
                    <div className="mb-4">
                      <label className="text-[9px] uppercase tracking-widest text-stone-600 mb-1 block">Количество</label>
                      <input 
                        type="number" 
                        value={adminResourceAmount}
                        onChange={(e) => setAdminResourceAmount(Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50 transition-colors"
                        placeholder="Введите количество..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Железо', icon: Hexagon, color: 'text-stone-400', action: () => setIron(prev => prev + adminResourceAmount) },
                        { label: 'Серебро', icon: Circle, color: 'text-zinc-300', action: () => setSilver(prev => prev + adminResourceAmount) },
                        { label: 'Золото', icon: Coins, color: 'text-yellow-400', action: () => setGold(prev => prev + adminResourceAmount) },
                        { label: 'Алмазы', icon: Gem, color: 'text-cyan-400', action: () => setDiamonds(prev => prev + adminResourceAmount) },
                      ].map(res => (
                        <button
                          key={res.label}
                          onClick={res.action}
                          className="flex items-center gap-2 p-3 rounded-xl border bg-black/20 border-white/5 text-stone-300 hover:bg-white/5 transition-all"
                        >
                          <res.icon className={`w-4 h-4 ${res.color}`} />
                          <span className="text-[10px] font-bold uppercase">{res.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold uppercase tracking-widest text-stone-400 mb-4">Общие настройки</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-300">Звуковые эффекты</span>
                    <div className="w-10 h-5 bg-green-500/20 border border-green-500/50 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-green-400 rounded-full" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-stone-300">Уведомления</span>
                    <div className="w-10 h-5 bg-green-500/20 border border-green-500/50 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-green-400 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold uppercase tracking-widest text-stone-400 mb-4">Ресурсы в интернете</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Официальная Вики', url: 'https://example.com/wiki' },
                    { label: 'Discord Сообщество', url: 'https://discord.gg/example' },
                    { label: 'Гайд для новичков', url: 'https://example.com/guide' },
                    { label: 'Техподдержка', url: 'https://example.com/support' },
                  ].map((link, idx) => (
                    <a 
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-all group"
                    >
                      <span className="text-sm text-stone-300 group-hover:text-white transition-colors">{link.label}</span>
                      <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-amber-400 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold uppercase tracking-widest text-stone-400 mb-4">Аккаунт</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="w-full py-3 bg-stone-800 border border-white/10 rounded-xl text-stone-300 text-xs font-bold uppercase tracking-widest hover:bg-stone-700 transition-all"
                  >
                    Выйти
                  </button>
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="w-full py-3 bg-red-900/20 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-900/40 transition-all"
                  >
                    Удалить аккаунт
                  </button>
                  {isDeleteConfirmOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
                      <div className="bg-stone-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">Подтверждение удаления</h3>
                        <p className="text-sm text-stone-400 mb-6">Вы уверены, что хотите удалить аккаунт? Это действие необратимо.</p>
                        <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => setIsDeleteConfirmOpen(false)} className="py-2 bg-stone-800 rounded-lg">Отмена</button>
                          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="py-2 bg-red-600 rounded-lg">Подтверждаю</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <motion.button 
              onClick={() => setPage(3)}
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.95 }} 
              className="mt-auto w-full py-4 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm"
            >
              <ArrowLeft className="w-5 h-5" /> Назад к профилю
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-stone-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Редактировать анкету</h2>
                  <p className="text-stone-400 text-sm">Обновите свои личные данные.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Раса героя</label>
                    <select
                      value={tempRace}
                      onChange={(e) => setTempRace(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 appearance-none"
                    >
                      <option value="Человек">Человек</option>
                      <option value="Эльф">Эльф</option>
                      <option value="Гном">Гном</option>
                      <option value="Орк">Орк</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">{playerGender === 'male' ? 'Имя героя' : 'Имя героини'}</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={tempRealName}
                        onChange={(e) => setTempRealName(e.target.value)}
                        placeholder="Ваше имя..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-amber-500/50"
                      />
                      <button 
                        onClick={() => setIsNameHidden(!isNameHidden)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        {isNameHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Возраст</label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={tempAge}
                        onChange={(e) => setTempAge(parseInt(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-amber-500/50"
                      />
                      <button 
                        onClick={() => setIsAgeHidden(!isAgeHidden)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        {isAgeHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Страна</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={tempCountry}
                        onChange={(e) => setTempCountry(e.target.value)}
                        placeholder="Ваша страна..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-amber-500/50"
                      />
                      <button 
                        onClick={() => setIsCountryHidden(!isCountryHidden)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        {isCountryHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">Статус персонажа</label>
                    <textarea 
                      value={tempStatus}
                      onChange={(e) => setTempStatus(e.target.value)}
                      placeholder="Ваш статус..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 h-20 resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="w-full py-3 rounded-xl bg-stone-800 text-stone-400 font-bold uppercase tracking-widest hover:bg-stone-700 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      const regex = /^[a-zA-Z]+$|^[а-яА-ЯёЁ]+$/;
                      if (!regex.test(tempRealName)) {
                        alert("Имя должно содержать только буквы (либо русский, либо английский)");
                        return;
                      }
                      setRealName(tempRealName);
                      setPlayerRace(tempRace);
                      setPlayerAge(tempAge);
                      setCountry(tempCountry);
                      setCharacterStatus(tempStatus);
                      setIsEditingProfile(false);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 text-amber-950 font-bold uppercase tracking-widest hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
