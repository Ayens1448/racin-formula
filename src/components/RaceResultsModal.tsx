import React, { useEffect } from 'react';
import { CarState, PlayerDrivingDNA } from '../types/game';
import confetti from 'canvas-confetti';
import { Trophy, Coins, Zap, ArrowRight, Wrench, Brain, Award, RotateCcw } from 'lucide-react';

interface RaceResultsModalProps {
  leaderboard: CarState[];
  playerCarId: string;
  playerDNA: PlayerDrivingDNA;
  coinsEarned: number;
  overtakesCount: number;
  fastestLapDriverName: string;
  onRaceAgain: () => void;
  onNextRace: () => void;
  onOpenGarage: () => void;
  onOpenTelemetry: () => void;
}

export const RaceResultsModal: React.FC<RaceResultsModalProps> = ({
  leaderboard,
  playerCarId,
  playerDNA,
  coinsEarned,
  overtakesCount,
  fastestLapDriverName,
  onRaceAgain,
  onNextRace,
  onOpenGarage,
  onOpenTelemetry,
}) => {
  const playerRank = leaderboard.findIndex((c) => c.id === playerCarId) + 1;
  const isPodium = playerRank <= 3;
  const isWin = playerRank === 1;

  useEffect(() => {
    if (isPodium) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FACC15', '#EF4444', '#10B981', '#FFFFFF'],
        });
      } catch {
        // ignore
      }
    }
  }, [isPodium]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="w-full max-w-2xl bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header / Position Badge */}
        <div className="flex flex-col items-center text-center">
          {isWin ? (
            <div className="p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-full mb-3 text-yellow-400">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>
          ) : isPodium ? (
            <div className="p-3 bg-purple-500/20 border border-purple-500/40 rounded-full mb-3 text-purple-400">
              <Award className="w-10 h-10" />
            </div>
          ) : null}

          <div className="text-xs uppercase font-black tracking-widest text-zinc-500">
            Official FIA Grand Prix Classification
          </div>

          <h2 className="text-3xl md:text-4xl font-black italic tracking-tight text-white uppercase mt-1">
            {isWin
              ? 'GRAND PRIX VICTORY!'
              : isPodium
              ? `PODIUM FINISH • P${playerRank}`
              : `RACE CLASSIFICATION • P${playerRank}`}
          </h2>

          <p className="text-sm text-zinc-400 mt-1 max-w-md">
            Finished P{playerRank} out of 22 drivers after intense wheel-to-wheel battles.
          </p>
        </div>

        {/* Prize / Coin Rewards Breakdown */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Prize Winnings</span>
            <div className="flex items-center gap-1.5 text-yellow-400 font-mono font-black text-xl">
              <Coins className="w-5 h-5" />
              +{coinsEarned.toLocaleString()} CR
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Position Award</span>
              <span className="font-mono font-bold text-white text-sm">P{playerRank} Finish</span>
            </div>
            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Clean Overtakes</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">+{overtakesCount} Passes</span>
            </div>
            <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/60 col-span-2 sm:col-span-1">
              <span className="text-zinc-500 block text-[10px] uppercase font-bold">Fastest Lap</span>
              <span className="font-mono font-bold text-purple-400 text-sm truncate block">
                {fastestLapDriverName}
              </span>
            </div>
          </div>
        </div>

        {/* Race Engineering Debrief */}
        <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-2xl p-4 flex items-start gap-3">
          <Brain className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 mb-0.5">
              Race Engineering Debrief (Tier {playerDNA.aiAdaptationLevel})
            </div>
            <p className="text-xs text-indigo-200 leading-relaxed">
              {playerDNA.lastLearnedNote}
            </p>
          </div>
        </div>

        {/* Top 5 Final Classification */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-2">
            Top 5 Championship Points Scorers
          </div>
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            {leaderboard.slice(0, 5).map((car, idx) => {
              const isPlayer = car.id === playerCarId;
              return (
                <div
                  key={car.id}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${
                    isPlayer ? 'bg-yellow-500/20 text-yellow-300 font-bold' : 'text-zinc-300 bg-zinc-950/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 w-4 font-bold">P{idx + 1}</span>
                    <span className="w-1.5 h-3 rounded-full" style={{ backgroundColor: car.teamColor }} />
                    <span className="font-sans font-bold">{car.driverName}</span>
                  </div>
                  <span className="text-zinc-400 text-[11px] font-sans">{car.teamName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          {/* Primary Action Buttons: Race Again & Next Race */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button
              onClick={onRaceAgain}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl font-black italic tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.4)] transition transform hover:scale-[1.02] active:scale-[0.98] border border-red-400/40 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5 stroke-[2.5]" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-base font-black uppercase">RACE AGAIN</span>
                <span className="text-[10px] text-red-100 font-sans font-bold uppercase tracking-wider opacity-90">Instant Re-Match</span>
              </div>
            </button>

            <button
              onClick={onNextRace}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 rounded-2xl font-black italic tracking-wider shadow-[0_0_25px_rgba(234,179,8,0.35)] transition transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <div className="flex flex-col items-start leading-tight">
                <span className="text-base font-black uppercase">NEXT RACE</span>
                <span className="text-[10px] text-zinc-900 font-sans font-bold uppercase tracking-wider opacity-90">Championship Round</span>
              </div>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Secondary Navigation Hub: Garage & Driver DNA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button
              onClick={onOpenGarage}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl font-bold text-xs sm:text-sm border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              Spend Coins in Garage
            </button>

            <button
              onClick={onOpenTelemetry}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/90 hover:bg-zinc-800 text-indigo-300 hover:text-indigo-200 rounded-xl font-bold text-xs sm:text-sm border border-indigo-900/60 hover:border-indigo-700 transition cursor-pointer"
            >
              <Brain className="w-4 h-4 text-indigo-400" />
              View Driver DNA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
