"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Wallet, Shuffle, RotateCcw, Copy, List } from "lucide-react";

const STORAGE_KEY = "golf-naegitong-v8";
const playersDefault = ["", "", "", ""];
const SCORE_OPTIONS = [-2, -1, 0, 1, 2, 3, 4, 5];
const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);

type TeamKey = "A" | "B";
type TeamValue = TeamKey | "";
type TeamColor = "blue" | "rose" | "emerald" | "amber";
type Tab = "game" | "history";

type TeamSettings = {
  A: { color: TeamColor };
  B: { color: TeamColor };
};

type HoleHistoryItem = {
  hole: number;
  par: number;
  teamA: string[];
  teamB: string[];
  teamAName: string;
  teamBName: string;
  joker: string;
  actualDiffs: Record<string, number>;
  bettingDiffs: Record<string, number>;
  aScore: number;
  bScore: number;
  losers: string[];
  stakePerLoser: number;
  carryCount: number;
};

const teamColorNames = {
  blue: "파랑팀",
  rose: "빨강팀",
  emerald: "초록팀",
  amber: "노랑팀",
};

const colorClass = {
  blue: { bg: "bg-blue-600", light: "bg-blue-50", text: "text-blue-900" },
  rose: { bg: "bg-rose-600", light: "bg-rose-50", text: "text-rose-900" },
  emerald: { bg: "bg-emerald-600", light: "bg-emerald-50", text: "text-emerald-900" },
  amber: { bg: "bg-amber-400", light: "bg-amber-50", text: "text-amber-900" },
};

function formatWon(value?: number) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function scoreLabel(value: number) {
  if (value === 0) return "E";
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function displayScore(score: number | undefined, isJoker: boolean) {
  if (score === undefined) return "-";
  return isJoker ? `${scoreLabel(score)}(J)` : scoreLabel(score);
}

function shuffle(array: string[]) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function Page() {
  const [players, setPlayers] = useState(playersDefault);
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState<Tab>("game");

  const [hole, setHole] = useState(1);
  const [fine, setFine] = useState(5000);
  const [par, setPar] = useState(4);

  const [teamSettings, setTeamSettings] = useState<TeamSettings>({
    A: { color: "blue" },
    B: { color: "rose" },
  });

  const [teams, setTeams] = useState<Record<string, TeamValue>>({});
  const [joker, setJoker] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [penalties, setPenalties] = useState<Record<string, number>>({});
  const [holeResults, setHoleResults] = useState<Record<number, string[]>>({});
  const [holeHistory, setHoleHistory] = useState<Record<number, HoleHistoryItem>>({});
  const [result, setResult] = useState("");
  const [editingHole, setEditingHole] = useState<number | null>(null);

  const activePlayers = players.filter(Boolean);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const parsed = JSON.parse(saved);

    setPlayers(parsed.players || playersDefault);
    setStarted(parsed.started || false);
    setHole(parsed.hole || 1);
    setFine(parsed.fine || 5000);
    setPenalties(parsed.penalties || {});
    setHoleResults(parsed.holeResults || {});
    setHoleHistory(parsed.holeHistory || {});
    setTeamSettings(
      parsed.teamSettings || {
        A: { color: "blue" },
        B: { color: "rose" },
      }
    );
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        players,
        started,
        hole,
        fine,
        penalties,
        holeResults,
        holeHistory,
        teamSettings,
      })
    );
  }, [players, started, hole, fine, penalties, holeResults, holeHistory, teamSettings]);

  const totalPot = useMemo(() => {
    return Object.values(penalties).reduce((a, b) => a + b, 0);
  }, [penalties]);

  function startGame() {
    if (activePlayers.length !== 4) {
      alert("플레이어 4명을 입력해주세요.");
      return;
    }

    setPenalties(Object.fromEntries(activePlayers.map((p) => [p, 0])));
    setTeams(Object.fromEntries(activePlayers.map((p) => [p, ""])));
    setScores(Object.fromEntries(activePlayers.map((p) => [p, 0])));
    setHoleResults({});
    setHoleHistory({});
    setJoker(activePlayers[0]);
    setStarted(true);
    setHole(1);
    setResult("");
  }

  function randomFill() {
    const shuffled = shuffle(activePlayers);
    const nextTeams: Record<string, TeamValue> = {};

    shuffled.forEach((player, index) => {
      nextTeams[player] = index < 2 ? "A" : "B";
    });

    setTeams(nextTeams);
    setJoker(shuffled[Math.floor(Math.random() * shuffled.length)]);
    setScores(Object.fromEntries(activePlayers.map((p) => [p, 0])));
    setResult("");
  }

  function setPlayerTeam(player: string, team: TeamKey) {
    const current = teams[player];
    const nextValue: TeamValue = current === team ? "" : team;
    const nextTeams = { ...teams, [player]: nextValue };

    const aCount = activePlayers.filter((p) => nextTeams[p] === "A").length;
    const bCount = activePlayers.filter((p) => nextTeams[p] === "B").length;

    if (aCount > 2 || bCount > 2) {
      alert("각 팀은 2명까지만 선택할 수 있어요.");
      return;
    }

    setTeams(nextTeams);
    setResult("");
  }

  function rebuildMoney(history: Record<number, HoleHistoryItem>) {
    const nextPenalties: Record<string, number> = {};
    const nextResults: Record<number, string[]> = {};
    const nextHistory: Record<number, HoleHistoryItem> = { ...history };

    activePlayers.forEach((player) => {
      nextPenalties[player] = 0;
    });

    let carryCount = 0;

    HOLES.forEach((h) => {
      const item = nextHistory[h];
      if (!item) return;

      if (item.losers.length === 0) {
        nextHistory[h] = {
          ...item,
          stakePerLoser: 0,
          carryCount,
        };

        nextResults[h] = [];

        if (h !== 18) {
          carryCount += 1;
        }

        return;
      }

      const stakePerLoser = fine * (carryCount + 1);

      item.losers.forEach((player) => {
        nextPenalties[player] = (nextPenalties[player] || 0) + stakePerLoser;
      });

      nextHistory[h] = {
        ...item,
        stakePerLoser,
        carryCount,
      };

      nextResults[h] = item.losers;
      carryCount = 0;
    });

    setPenalties(nextPenalties);
    setHoleResults(nextResults);
    setHoleHistory(nextHistory);
  }

  function calculate() {
    const teamA = activePlayers.filter((p) => teams[p] === "A");
    const teamB = activePlayers.filter((p) => teams[p] === "B");

    if (teamA.length !== 2 || teamB.length !== 2) {
      alert("각 팀 2명씩 맞춰주세요.");
      return;
    }

    if (!joker) {
      alert("조커를 선택해주세요.");
      return;
    }

    const actualDiffs: Record<string, number> = {};
    const bettingDiffs: Record<string, number> = {};

    activePlayers.forEach((player) => {
      const actual = Number(scores[player] ?? 0);
      actualDiffs[player] = actual;
      bettingDiffs[player] = player === joker ? 1 : actual;
    });

    const aScore = teamA.reduce((sum, player) => sum + bettingDiffs[player], 0);
    const bScore = teamB.reduce((sum, player) => sum + bettingDiffs[player], 0);
    const loserTeam = aScore === bScore ? [] : aScore > bScore ? teamA : teamB;

    const newItem: HoleHistoryItem = {
      hole,
      par,
      teamA,
      teamB,
      teamAName: teamColorNames[teamSettings.A.color],
      teamBName: teamColorNames[teamSettings.B.color],
      joker,
      actualDiffs,
      bettingDiffs,
      aScore,
      bScore,
      losers: loserTeam,
      stakePerLoser: 0,
      carryCount: 0,
    };

    const nextHistory = {
      ...holeHistory,
      [hole]: newItem,
    };

    rebuildMoney(nextHistory);
    setTab("game");

    const previousCarryCount = getCarryCountBeforeHole(nextHistory, hole);
    const currentStake = loserTeam.length === 0 ? 0 : fine * (previousCarryCount + 1);
    const nextStake = hole === 18 ? 0 : fine * (previousCarryCount + 2);

    if (aScore === bScore) {
      setResult(
        hole === 18
          ? `무승부 · 18홀은 0원 처리`
          : `무승부 · 다음 홀 1인 ${formatWon(nextStake)}판`
      );
      setEditingHole(null);
      return;
    }

    setResult(
      `패배팀: ${loserTeam.join(" / ")} · 1인 ${formatWon(currentStake)} · ${teamColorNames[teamSettings.A.color]} ${scoreLabel(aScore)} / ${teamColorNames[teamSettings.B.color]} ${scoreLabel(bScore)}`
    );

    setEditingHole(null);
  }

  function getCarryCountBeforeHole(history: Record<number, HoleHistoryItem>, targetHole: number) {
    let count = 0;

    for (let h = targetHole - 1; h >= 1; h--) {
      const item = history[h];
      if (!item) continue;

      if (item.losers.length === 0) {
        count += 1;
      } else {
        break;
      }
    }

    return count;
  }

  function nextHole() {
    setHole((prev) => Math.min(prev + 1, 18));
    setTeams(Object.fromEntries(activePlayers.map((p) => [p, ""])));
    setScores(Object.fromEntries(activePlayers.map((p) => [p, 0])));
    setResult("");
    setEditingHole(null);
    setTab("game");
  }

  function loadHole(h: number) {
    const item = holeHistory[h];

    if (!item) return;

    setEditingHole(h);

    const restoredTeams: Record<string, TeamValue> = {};

    item.teamA.forEach((p) => {
      restoredTeams[p] = "A";
    });

    item.teamB.forEach((p) => {
      restoredTeams[p] = "B";
    });

    setHole(h);
    setTeams(restoredTeams);
    setJoker(item.joker);
    setPar(item.par);

    setScores(item.actualDiffs);

    setEditingHole(h);

    setTab("game");

    setResult(`${h}홀 수정중`);
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  async function copyResult() {
    const playedHoles = HOLES.filter((h) => holeHistory[h]);

    const moneyText = activePlayers
      .map((player) => `${player}: ${formatWon(penalties[player] || 0)}`)
      .join("\n");

    const holeResultText = playedHoles
      .map((h) => {
        const item = holeHistory[h];
        if (!item) return "";

        const resultText =
          item.losers.length === 0
            ? item.hole === 18
              ? "무승부 / 0원"
              : "무승부 / 이월"
            : `패배 ${item.losers.join(", ")} / 1인 ${formatWon(
                item.stakePerLoser
              )}`;

        return `${h}H · ${resultText}`;
      })
      .join("\n");

    const text = [
      "🏌️ 골프내기통 결과",
      "",
      "[최종 정산]",
      moneyText,
      "",
      `총 내기통: ${formatWon(totalPot)}`,
      "",
      "[홀별 결과]",
      holeResultText,
    ].join("\n");

    await navigator.clipboard.writeText(text);

    alert("카카오톡 공유용 결과 복사 완료!");
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 text-slate-950">
        <div className="mx-auto max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-white p-5 shadow-sm"
          >
            <h1 className="text-3xl font-black">골프내기통</h1>
            <p className="mt-1 text-sm text-slate-500">골프 벌금 적립 앱</p>

            <div className="mt-5 space-y-2">
              {players.map((player, idx) => (
                <input
                  key={idx}
                  value={player}
                  onChange={(e) => {
                    const copy = [...players];
                    copy[idx] = e.target.value;
                    setPlayers(copy);
                  }}
                  placeholder={`플레이어 ${idx + 1}`}
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 outline-none"
                />
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {(["A", "B"] as const).map((key, index) => (
                <div key={key} className="rounded-2xl bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black">{index + 1}팀 색상</span>
                    <span className={`text-sm font-black ${colorClass[teamSettings[key].color].text}`}>
                      {teamColorNames[teamSettings[key].color]}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(["blue", "rose", "emerald", "amber"] as TeamColor[]).map((color) => (
                      <button
                        key={color}
                        onClick={() =>
                          setTeamSettings((prev) => ({
                            ...prev,
                            [key]: { color },
                          }))
                        }
                        className={`h-11 rounded-2xl text-xs font-black ${
                          color === "amber" ? "text-slate-950" : "text-white"
                        } ${colorClass[color].bg} ${
                          teamSettings[key].color === color ? "ring-4 ring-slate-300" : "opacity-70"
                        }`}
                      >
                        {teamColorNames[color].replace("팀", "")}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium">패배자 기본 벌금</label>
              <input
                type="number"
                value={fine}
                onChange={(e) => setFine(Number(e.target.value))}
                className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 outline-none"
              />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="mb-2 font-black text-slate-950">룰 설명</div>

              <ul className="space-y-1">
                <li>• 매 홀 2:2 팀전</li>
                <li>• 조커 1명은 실제 스코어와 별개로 내기 계산은 +1</li>
                <li>• 팀 합산 점수가 높은 팀이 패배</li>
                <li>• 패배팀 2명이 벌금 납부</li>
                <li>• 무승부는 다음 홀로 이월</li>
                <li>• 18홀 무승부는 0원 처리</li>
              </ul>
            </div>
            
            <button
              onClick={startGame}
              className="mt-5 w-full rounded-2xl bg-slate-950 py-3 text-lg font-bold text-white"
            >
              게임 시작
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const teamA = activePlayers.filter((player) => teams[player] === "A");
  const teamB = activePlayers.filter((player) => teams[player] === "B");
  const currentHoleSaved = Boolean(holeResults[hole]);
  const teamAColor = colorClass[teamSettings.A.color];
  const teamBColor = colorClass[teamSettings.B.color];

  return (
    <div className="min-h-screen bg-slate-100 p-3 text-slate-950">
      <div className="mx-auto max-w-md space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-xs text-slate-500">현재 홀</p>
            <h1 className="text-3xl font-black">{hole}홀</h1>
          </div>

          <button onClick={resetAll} className="rounded-full bg-white p-3 shadow-sm">
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm">
          <button
            onClick={() => setTab("game")}
            className={`h-10 rounded-xl text-sm font-black ${
              tab === "game" ? "bg-slate-950 text-white" : "text-slate-500"
            }`}
          >
            경기 입력
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex h-10 items-center justify-center gap-1 rounded-xl text-sm font-black ${
              tab === "history" ? "bg-slate-950 text-white" : "text-slate-500"
            }`}
          >
            <List size={15} />
            홀별 결과
          </button>
        </div>

        {tab === "game" ? (
          <>
            <section className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black">팀 / 조커</h2>

                <button
                  onClick={randomFill}
                  className="flex items-center gap-1 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold"
                >
                  <Shuffle size={14} />
                  랜덤
                </button>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                <div className={`rounded-2xl px-3 py-2 ${teamAColor.light} ${teamAColor.text}`}>
                  <b>{teamColorNames[teamSettings.A.color]}</b> {teamA.join(" / ") || "-"} ({teamA.length}/2)
                </div>
                <div className={`rounded-2xl px-3 py-2 ${teamBColor.light} ${teamBColor.text}`}>
                  <b>{teamColorNames[teamSettings.B.color]}</b> {teamB.join(" / ") || "-"} ({teamB.length}/2)
                </div>
              </div>

              <div className="space-y-2">
                {activePlayers.map((player) => (
                  <div
                    key={player}
                    className="grid grid-cols-[64px_1fr_56px] items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2"
                  >
                    <div className="truncate text-base font-black">{player}</div>

                    <div className="grid grid-cols-2 gap-1">
                      {(["A", "B"] as const).map((team) => {
                        const setting = teamSettings[team];
                        const color = colorClass[setting.color];

                        return (
                          <button
                            key={team}
                            onClick={() => setPlayerTeam(player, team)}
                            className={`h-9 rounded-xl text-xs font-black ${
                              teams[player] === team ? `${color.bg} text-white` : "bg-white text-slate-400"
                            }`}
                          >
                            {teamColorNames[setting.color]}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setJoker(player);
                        setResult("");
                      }}
                      className={`h-9 rounded-xl text-xs font-black ${
                        joker === player ? "bg-amber-400 text-slate-950" : "bg-white text-slate-400"
                      }`}
                    >
                      조커
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <div className="mb-2 text-sm font-bold">홀 파</div>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => setPar(value)}
                      className={`h-10 rounded-2xl text-sm font-black ${
                        par === value ? "bg-slate-950 text-white" : "bg-slate-100"
                      }`}
                    >
                      파{value}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-black">스코어</h2>

              <div className="space-y-2">
                {activePlayers.map((player) => {
                  const isJoker = player === joker;
                  const selected = scores[player] ?? 0;

                  return (
                    <div
                      key={player}
                      className="grid grid-cols-[54px_1fr] items-center gap-2 rounded-2xl bg-slate-50 px-2 py-2"
                    >
                      <div>
                        <div className="truncate text-sm font-black">{player}</div>
                        <div className="text-[11px] font-bold text-slate-500">
                          {isJoker ? `${scoreLabel(selected)}(J) · 계산 +1` : scoreLabel(selected)}
                        </div>
                      </div>

                      <div className="grid grid-cols-8 gap-1">
                        {SCORE_OPTIONS.map((value) => (
                          <button
                            key={value}
                            onClick={() =>
                              setScores((prev) => ({
                                ...prev,
                                [player]: value,
                              }))
                            }
                            className={`h-9 rounded-lg text-[11px] font-black ${
                              selected === value ? "bg-emerald-600 text-white" : "bg-white text-slate-500"
                            }`}
                          >
                            {scoreLabel(value)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={calculate}
                className="mt-4 h-12 w-full rounded-2xl bg-emerald-600 text-base font-black text-white"
              >
                {editingHole ? `${editingHole}홀 수정 저장` : currentHoleSaved ? "결과 다시 계산" : "결과 계산"}
              </button>

              {result && (
                <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-emerald-900">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} />
                    <p className="text-sm font-bold">{result}</p>
                  </div>
                </div>
              )}

              {hole > 1 && (
                <button
                  onClick={() => loadHole(hole - 1)}
                  className="mt-2 h-11 w-full rounded-2xl bg-amber-100 text-sm font-black text-amber-900"
                >
                  이전 홀 수정
                </button>
              )}

              {hole < 18 ? (
                <button
                  onClick={nextHole}
                  className="mt-2 h-11 w-full rounded-2xl bg-slate-100 text-sm font-black"
                >
                  다음 홀
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!holeResults[18]) {
                      alert("18홀 결과 계산을 먼저 눌러주세요.");
                      return;
                    }
                    setTab("history");
                  }}
                  className="mt-2 h-11 w-full rounded-2xl bg-slate-950 text-sm font-black text-white"
                >
                  정산 완료 · 결과 보기
                </button>
              )}
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Wallet size={18} />
                <h2 className="text-lg font-black">현재 내기통</h2>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {activePlayers.map((player) => (
                  <div key={player} className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="truncate text-sm font-bold">{player}</p>
                    <p className="text-lg font-black">{formatWon(penalties[player] || 0)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl bg-slate-950 p-4 text-white">
                <p className="text-xs opacity-70">총 내기통</p>
                <p className="mt-1 text-3xl font-black">{formatWon(totalPot)}</p>
              </div>

              <button
                onClick={copyResult}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 text-sm font-black"
              >
                <Copy size={16} />
                카톡 공유용 복사
              </button>
            </section>
          </>
        ) : (
          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-black">홀별 결과표</h2>

            <div className="mb-4 overflow-x-auto rounded-2xl bg-slate-50 p-2">
              <table className="w-max min-w-full border-separate border-spacing-1 text-center text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 rounded-lg bg-slate-200 px-2 py-2 text-left">
                      이름
                    </th>
                    {HOLES.map((h) => (
                      <th key={h} className="rounded-lg bg-slate-200 px-2 py-2">
                        {h}H
                      </th>
                    ))}
                    <th className="sticky right-0 z-10 rounded-lg bg-slate-900 px-3 py-2 text-white">
                      합계
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.map((player) => {
                    const totalDiff = HOLES.reduce((sum, h) => {
                      const item = holeHistory[h];
                      if (!item) return sum;
                      return sum + (item.actualDiffs[player] ?? 0);
                    }, 0);

                    const playedPar = HOLES.reduce((sum, h) => {
                      const item = holeHistory[h];
                      if (!item) return sum;
                      return sum + item.par;
                    }, 0);

                    const totalScore = playedPar + totalDiff;

                    return (
                      <tr key={player}>
                        <td className="sticky left-0 z-10 rounded-lg bg-white px-2 py-2 text-left font-black">
                          {player}
                        </td>

                        {HOLES.map((h) => {
                          const item = holeHistory[h];

                          return (
                            <td
                              key={h}
                              className={`rounded-lg px-2 py-2 font-bold ${
                                item
                                  ? item.teamA.includes(player)
                                    ? `${colorClass[teamSettings.A.color].light} ${colorClass[teamSettings.A.color].text}`
                                    : `${colorClass[teamSettings.B.color].light} ${colorClass[teamSettings.B.color].text}`
                                  : "bg-white"
                              }`}
                            >
                              {item
                                ? displayScore(
                                    item.actualDiffs[player],
                                    player === item.joker
                                  )
                                : "-"}
                            </td>
                          );
                        })}

                        <td className="sticky right-0 z-10 rounded-lg bg-slate-900 px-3 py-2 font-black text-white">
                          {Object.keys(holeHistory).length === 0
                            ? "-"
                            : `${totalScore}타 (${scoreLabel(totalDiff)})`}
                        </td>
                      </tr>
                    );
                  })}

                  <tr>
                    <td className="sticky left-0 z-10 rounded-lg bg-slate-200 px-2 py-2 text-left font-black">
                      이긴팀
                    </td>

                    {HOLES.map((h) => {
                      const item = holeHistory[h];

                      if (!item) {
                        return (
                          <td
                            key={h}
                            className="rounded-lg bg-white px-2 py-2 font-bold text-slate-400"
                          >
                            -
                          </td>
                        );
                      }

                      if (item.losers.length === 0) {
                        return (
                          <td
                            key={h}
                            className="rounded-lg bg-white px-2 py-2 font-black text-slate-500"
                          >
                            무
                          </td>
                        );
                      }

                      const winnerKey =
                        item.losers.join("|") === item.teamA.join("|")
                          ? "B"
                          : "A";

                      const winnerColor =
                        winnerKey === "A"
                          ? teamSettings.A.color
                          : teamSettings.B.color;

                      const winnerName =
                        winnerKey === "A"
                          ? teamColorNames[teamSettings.A.color]
                          : teamColorNames[teamSettings.B.color];

                      return (
                        <td
                          key={h}
                          className={`rounded-lg px-2 py-2 font-black ${
                            colorClass[winnerColor].light
                          } ${colorClass[winnerColor].text}`}
                        >
                          {winnerName.replace("팀", "")}
                        </td>
                      );
                    })}

                    <td className="sticky right-0 z-10 rounded-lg bg-slate-900 px-3 py-2 font-black text-white">
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {Object.keys(holeHistory).length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">
                아직 저장된 홀 결과가 없어요.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.values(holeHistory)
                  .sort((a, b) => a.hole - b.hole)
                  .map((item) => (
                    <div key={item.hole} className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-base font-black">{item.hole}홀</div>
                        <div className="text-sm font-black">
                          {item.losers.length === 0 ? "무승부" : `패배: ${item.losers.join(" / ")}`}
                        </div>
                      </div>

                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {item.losers.length === 0
                          ? item.hole === 18
                            ? "무승부 · 18홀 0원 처리"
                            : "무승부 · 다음 홀 이월"
                          : `패배자 1인 ${formatWon(item.stakePerLoser)}`}
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className={`rounded-xl p-2 ${colorClass[teamSettings.A.color].light}`}>
                          <b className={colorClass[teamSettings.A.color].text}>{item.teamAName}</b>
                          <div>{item.teamA.join(" / ")}</div>
                          <div>계산합계 {scoreLabel(item.aScore)}</div>
                        </div>
                        <div className={`rounded-xl p-2 ${colorClass[teamSettings.B.color].light}`}>
                          <b className={colorClass[teamSettings.B.color].text}>{item.teamBName}</b>
                          <div>{item.teamB.join(" / ")}</div>
                          <div>계산합계 {scoreLabel(item.bScore)}</div>
                        </div>
                      </div>

                      <div className="mt-2 rounded-xl bg-white p-2 text-xs">
                        <div className="font-bold">조커: {item.joker}</div>
                        <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                          {activePlayers.map((player) => (
                            <div key={player}>
                              {player} : {displayScore(item.actualDiffs[player], player === item.joker)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}