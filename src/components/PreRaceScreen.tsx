import React from 'react';
import { TrackData, TireCompound, TrackCategory, PlayerDrivingDNA } from '../types/game';
import { Play, RotateCw, Sparkles, Compass, ShieldCheck, Flame } from 'lucide-react';

interface PreRaceScreenProps {
  track: TrackData;
  playerDNA: PlayerDrivingDNA;
  selectedTire: TireCompound;
  onSelectTire: (tire: TireCompound) => void;
  totalLaps: number;
  onChangeLaps: (laps: number) => void;
  trackCategory: TrackCategory;
  onChangeCategory: (cat: TrackCategory) => void;
  onRegenerateTrack: () => void;
  onStartRace: () => void;
  userCoins: number;
}

export const PreRaceScreen: React.FC<PreRaceScreenProps> = ({
  track,
  playerDNA,
  selectedTire,
  onSelectTire,
  totalLaps,
  onChangeLaps,
  trackCategory,
  onChangeCategory,
  onRegenerateTrack,
  onStartRace,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 p-4">
      {/* Track Headline Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{track.flag}</span>
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-white uppercase">
              {track.name}
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Formula 1 World Championship • 22 Cars Grid • Procedurally Generated Circuit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRegenerateTrack}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold text-sm border border-zinc-700 transition"
          >
            <RotateCw className="w-4 h-4" />
            New Circuit Seed
          </button>
          <button
            onClick={onStartRace}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-zinc-950 font-black italic tracking-wide text-lg rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.5)] transition transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-5 h-5 fill-zinc-950" />
            START GRAND PRIX
          </button>
        </div>
      </div>

      {/* Grid: Track Profile & Adaptive AI Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Circuit Stats & Telemetry Adaptations */}
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Circuit Engineering Notice */}
          {track.adaptationReason ? (
            <div className="bg-indigo-950/40 border border-indigo-500/50 rounded-2xl p-5 shadow-lg flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-1 flex items-center gap-2">
                  <span>Adaptive Championship Circuit Tuning</span>
                  <span className="bg-indigo-500/30 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    TIER {playerDNA.aiAdaptationLevel}
                  </span>
                </div>
                <p className="text-sm text-indigo-100 leading-relaxed">
                  {track.adaptationReason}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex items-start gap-3">
              <Compass className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Active Track Category: {track.category.replace('_', ' ')}
                </div>
                <p className="text-sm text-zinc-300">
                  Rivals calibrated to track characteristics. Utilize the 2 DRS zones to draft down long straights.
                </p>
              </div>
            </div>
          )}

          {/* Circuit Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Circuit Length</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {(track.totalLength / 1000).toFixed(2)} km
              </div>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">DRS Activation</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {track.drsZones.length} Zones
              </div>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Sharp Turns</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {track.curvatureProfile.sharpTurns} Apexes
              </div>
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Avg Speed Rating</span>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                {track.curvatureProfile.avgSpeedRating} km/h
              </div>
            </div>
          </div>

          {/* Track Category Selector */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-3">
              Track Generation Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'ADAPTIVE', label: 'Adaptive GP', icon: Sparkles, desc: 'Tailored to challenge weak points' },
                  { id: 'TEMPLE_OF_SPEED', label: 'Temple of Speed', icon: Flame, desc: 'Monza straights & slipstreams' },
                  { id: 'TECHNICAL_FLOW', label: 'Technical Flow', icon: Compass, desc: 'Suzuka rhythm & S-curves' },
                  { id: 'STREET_CIRCUIT', label: 'Street Circuit', icon: ShieldCheck, desc: 'Monaco tight walls & hairpins' },
                  { id: 'ROLLERCOASTER', label: 'Rollercoaster', icon: Sparkles, desc: 'Spa elevation & sweepers' },
                ] as const
              ).map((cat) => {
                const Icon = cat.icon;
                const active = trackCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => onChangeCategory(cat.id)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition ${
                      active
                        ? 'bg-red-950/50 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-1">
                      <Icon className={`w-3.5 h-3.5 ${active ? 'text-red-400' : 'text-zinc-500'}`} />
                      <span>{cat.label}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 leading-tight">{cat.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Race Configuration (Tires & Laps) */}
        <div className="flex flex-col gap-6">
          {/* Tire Strategy Selector */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-3">
              Tire Compound Strategy
            </span>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  {
                    type: 'SOFT' as const,
                    name: 'Pirelli Soft (C5)',
                    color: 'text-red-400 border-red-500 bg-red-950/30',
                    dot: 'bg-red-500',
                    desc: 'Maximum grip & launch speed. Ideal for sprint overtakes.',
                  },
                  {
                    type: 'MEDIUM' as const,
                    name: 'Pirelli Medium (C3)',
                    color: 'text-yellow-400 border-yellow-500 bg-yellow-950/30',
                    dot: 'bg-yellow-400',
                    desc: 'Optimal balance of cornering grip and straight-line stability.',
                  },
                  {
                    type: 'HARD' as const,
                    name: 'Pirelli Hard (C1)',
                    color: 'text-zinc-200 border-zinc-400 bg-zinc-800/40',
                    dot: 'bg-zinc-200',
                    desc: 'Durable construction with high curb absorption.',
                  },
                ]
              ).map((tire) => {
                const active = selectedTire === tire.type;
                return (
                  <button
                    key={tire.type}
                    onClick={() => onSelectTire(tire.type)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition ${
                      active
                        ? `${tire.color} shadow-md`
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full mt-1 shrink-0 ${tire.dot}`} />
                    <div>
                      <div className="font-bold text-xs">{tire.name}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{tire.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lap Count Selection */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-3">
              Race Distance
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((laps) => (
                <button
                  key={laps}
                  onClick={() => onChangeLaps(laps)}
                  className={`py-2.5 px-3 rounded-xl font-mono font-bold text-sm border transition text-center ${
                    totalLaps === laps
                      ? 'bg-yellow-500 text-zinc-950 border-yellow-400 shadow-md'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  {laps} {laps === 1 ? 'Lap' : 'Laps'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Controls Hint */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-4 text-xs text-zinc-400 space-y-1.5">
            <div className="font-bold text-zinc-300 uppercase tracking-wider text-[11px] mb-1">
              Race Controls & Driving Features
            </div>
            <div><span className="text-cyan-400 font-mono font-bold">C / VIEW Button:</span> Switch Cockpit, T-Cam, Chase, Nose & Overhead views</div>
            <div><span className="text-emerald-400 font-mono font-bold">Dynamic Racing Line:</span> Green = Full Throttle • Yellow = Coast • Red = Hard Brake before apex</div>
            <div><span className="text-white font-mono font-bold">Touchscreen:</span> Left/Right steering pads & Gas/Brake/DRS pedals on screen</div>
            <div><span className="text-emerald-400 font-mono font-bold">Auto Gas:</span> Tap AUTO GAS on the top bar for assisted cruising</div>
            <div><span className="text-white font-mono font-bold">W / ↑ :</span> Throttle • <span className="text-white font-mono font-bold">S / ↓ :</span> Brake • <span className="text-white font-mono font-bold">A / D / ← / → :</span> Steering</div>
            <div><span className="text-emerald-400 font-mono font-bold">SPACE / DRS Pad:</span> Open DRS flap in DRS zones (within 1.0s of car ahead)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
