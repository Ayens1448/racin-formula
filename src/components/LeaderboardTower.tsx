import React, { useState } from 'react';
import { CarState } from '../types/game';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LeaderboardTowerProps {
  leaderboard: CarState[];
  playerCarId: string;
}

export const LeaderboardTower: React.FC<LeaderboardTowerProps> = ({
  leaderboard,
  playerCarId,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : false;
  });

  const getDriverCode = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return parts[parts.length - 1].slice(0, 3).toUpperCase();
    }
    return name.slice(0, 3).toUpperCase();
  };

  const leader = leaderboard[0];

  return (
    <div className="absolute left-3 top-16 z-20 pointer-events-auto select-none">
      <div className="flex flex-col bg-zinc-950/90 border border-zinc-800 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden max-w-[210px]">
        {/* Tower Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/80 transition"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-zinc-200 uppercase">
              F1 LIVE TIMING
            </span>
          </div>
          <button className="text-zinc-400 hover:text-white">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Drivers List */}
        {isExpanded && (
          <div className="flex flex-col max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-zinc-900/80 scrollbar-thin">
            {leaderboard.map((car, index) => {
              const isPlayer = car.id === playerCarId;
              const position = index + 1;
              const driverCode = getDriverCode(car.driverName);

              // Calculate interval/gap
              let gapText = 'LEADER';
              if (index > 0 && leader) {
                const distBehind = (leader.lap * 3000 + leader.trackDistance) - (car.lap * 3000 + car.trackDistance);
                const gapSeconds = Math.max(distBehind / 65, 0.1);
                gapText = `+${gapSeconds.toFixed(1)}s`;
              }

              return (
                <div
                  key={car.id}
                  className={`flex items-center justify-between px-2 py-1 text-xs transition ${
                    isPlayer
                      ? 'bg-yellow-500/20 text-yellow-300 font-bold border-l-2 border-yellow-400'
                      : 'hover:bg-zinc-900 text-zinc-300'
                  }`}
                >
                  {/* Position & Team Color bar & Name */}
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="w-4 text-center font-mono font-bold text-[11px] text-zinc-400">
                      {position}
                    </span>

                    {/* Team Color Strip */}
                    <div
                      className="w-1 h-3.5 rounded-full"
                      style={{ backgroundColor: car.teamColor || '#94A3B8' }}
                    />

                    <span className="font-mono font-bold tracking-tight text-[11px] truncate max-w-[55px]">
                      {driverCode}
                    </span>
                  </div>

                  {/* Interval / Tire / DRS status */}
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    {car.drsActive && (
                      <span className="text-[8px] bg-emerald-500 text-zinc-950 font-black px-1 rounded">
                        DRS
                      </span>
                    )}

                    <span className="text-zinc-400 font-semibold">
                      {gapText}
                    </span>

                    {/* Tire Compound badge */}
                    <span
                      className={`text-[8px] font-bold px-1 rounded uppercase ${
                        car.tireCompound === 'SOFT'
                          ? 'bg-red-950 text-red-400 border border-red-700'
                          : car.tireCompound === 'HARD'
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-600'
                          : 'bg-yellow-950 text-yellow-400 border border-yellow-600'
                      }`}
                    >
                      {car.tireCompound?.[0] || 'M'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
