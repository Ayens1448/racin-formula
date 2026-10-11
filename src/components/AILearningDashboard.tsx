import React from 'react';
import { PlayerDrivingDNA } from '../types/game';
import { Brain, Sparkles, Trophy, Award, Zap, Compass, TrendingUp } from 'lucide-react';

interface AILearningDashboardProps {
  playerDNA: PlayerDrivingDNA;
  onSelectCategoryForNextRace: (category: any) => void;
}

export const AILearningDashboard: React.FC<AILearningDashboardProps> = ({
  playerDNA,
}) => {
  // Compute overall Driver Grade
  const avgSkill = (
    playerDNA.corneringMastery +
    playerDNA.brakingAccuracy +
    playerDNA.straightLineSpeed +
    playerDNA.racingLineConsistency
  ) / 4;

  let driverGrade = 'C';
  let gradeColor = 'text-zinc-400 border-zinc-700 bg-zinc-900';
  if (avgSkill >= 88) {
    driverGrade = 'S+';
    gradeColor = 'text-yellow-400 border-yellow-500 bg-yellow-950/40 shadow-[0_0_20px_rgba(234,179,8,0.3)]';
  } else if (avgSkill >= 75) {
    driverGrade = 'A';
    gradeColor = 'text-emerald-400 border-emerald-500 bg-emerald-950/40';
  } else if (avgSkill >= 60) {
    driverGrade = 'B';
    gradeColor = 'text-blue-400 border-blue-500 bg-blue-950/40';
  }

  const skills = [
    { label: 'Cornering Mastery', value: playerDNA.corneringMastery, color: 'bg-emerald-500', desc: 'Apex carry-speed and precision' },
    { label: 'Braking Accuracy', value: playerDNA.brakingAccuracy, color: 'bg-red-500', desc: 'Stopping power without lockups or running wide' },
    { label: 'Straight-Line Efficiency', value: playerDNA.straightLineSpeed, color: 'bg-cyan-500', desc: 'DRS deployment & slipstream tow management' },
    { label: 'Racing Line Consistency', value: playerDNA.racingLineConsistency, color: 'bg-purple-500', desc: 'Envelope adherence and lap-to-lap delta' },
    { label: 'Wheel-to-Wheel Aggression', value: playerDNA.aggressionScore, color: 'bg-amber-500', desc: 'Overtaking boldness and inside dives' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 p-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-white uppercase">
              Driver DNA & Performance Telemetry
            </h1>
          </div>
          <p className="text-sm text-zinc-400">
            Real-time telemetry performance model that analyzes your racing lines, apex speeds, and dynamically tunes circuit difficulty.
          </p>
        </div>

        {/* Grade Badge */}
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${gradeColor}`}>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Driver License</div>
            <div className="text-3xl font-black font-mono leading-none mt-1">GRADE {driverGrade}</div>
          </div>
        </div>
      </div>

      {/* Career Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-800 text-zinc-300">
            <Compass className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-500">Total Grands Prix</div>
            <div className="text-2xl font-black font-mono text-white mt-0.5">{playerDNA.totalRaces}</div>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-500">Grand Prix Wins (P1)</div>
            <div className="text-2xl font-black font-mono text-yellow-400 mt-0.5">{playerDNA.totalWins}</div>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-500">Podiums (Top 3)</div>
            <div className="text-2xl font-black font-mono text-purple-400 mt-0.5">{playerDNA.totalPodiums}</div>
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-500">Clean Overtakes</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">{playerDNA.cleanOvertakes}</div>
          </div>
        </div>
      </div>

      {/* Grid: AI Analysis & Skill Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: AI Learning Insights & Adaptation Log */}
        <div className="flex flex-col gap-4">
          <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-black text-white uppercase tracking-wide">
                Race Engineering Feedback
              </h2>
            </div>

            <p className="text-sm text-indigo-200 leading-relaxed mb-4">
              {playerDNA.lastLearnedNote}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-indigo-900/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400">Identified Vulnerability</span>
                <div className="text-base font-black font-mono text-amber-300 mt-0.5">
                  {playerDNA.playerWeakness.replace('_', ' ')}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400">Rival Pace Scaling</span>
                <div className="text-base font-black font-mono text-emerald-300 mt-0.5">
                  Tier {playerDNA.aiAdaptationLevel} / 10
                </div>
              </div>
            </div>
          </div>

          {/* How track generation reacts */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Dynamic Circuit Engineering
            </h3>
            <ul className="text-xs text-zinc-400 space-y-2 leading-relaxed">
              <li>• <strong className="text-zinc-200">Sector Curvatures:</strong> Generated automatically to challenge your braking points and apex commitment.</li>
              <li>• <strong className="text-zinc-200">DRS Straights:</strong> Positioned dynamically to reward clean exits out of technical corners.</li>
              <li>• <strong className="text-zinc-200">21 Championship Competitors:</strong> Continuously tuning their aggression, defensive lines, and reaction speeds to match your evolving pace.</li>
            </ul>
          </div>
        </div>

        {/* Right: Telemetry Mastery Bars */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wide mb-4">
              Driver Skill Telemetry
            </h2>

            <div className="flex flex-col gap-4">
              {skills.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-bold text-zinc-300">{s.label}</span>
                    <span className="text-xs font-mono font-bold text-white">{Math.round(s.value)}%</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${s.color}`}
                      style={{ width: `${s.value}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
