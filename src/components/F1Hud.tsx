import React, { useState } from 'react';
import { CarState, TrackData, CameraMode } from '../types/game';
import { Volume2, VolumeX, Zap, AlertTriangle, Flag, Gauge, Camera } from 'lucide-react';

interface F1HudProps {
  playerCar: CarState;
  track: TrackData;
  totalLaps: number;
  leaderboard: CarState[];
  isMuted: boolean;
  cameraMode: CameraMode;
  onCycleCamera: () => void;
  onSelectCameraMode?: (mode: CameraMode) => void;
  onToggleMute: () => void;
  onAbandonRace: () => void;
  onTouchControlChange: (control: 'throttle' | 'brake' | 'steerLeft' | 'steerRight' | 'drs', active: boolean) => void;
}

export const F1Hud: React.FC<F1HudProps> = ({
  playerCar,
  totalLaps,
  leaderboard,
  isMuted,
  cameraMode,
  onCycleCamera,
  onSelectCameraMode,
  onToggleMute,
  onAbandonRace,
  onTouchControlChange,
}) => {
  const currentRank = leaderboard.findIndex((c) => c.id === playerCar.id) + 1;
  const [autoGas, setAutoGas] = useState<boolean>(false);
  const [activeTouches, setActiveTouches] = useState<{
    steerLeft: boolean;
    steerRight: boolean;
    throttle: boolean;
    brake: boolean;
  }>({
    steerLeft: false,
    steerRight: false,
    throttle: false,
    brake: false,
  });

  // Trigger haptic pulse on mobile if supported
  const triggerHaptic = (ms: number = 15) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {
      // ignore
    }
  };

  const handleTouchStart = (control: 'throttle' | 'brake' | 'steerLeft' | 'steerRight') => {
    triggerHaptic(20);
    setActiveTouches((prev) => ({ ...prev, [control]: true }));
    onTouchControlChange(control, true);
  };

  const handleTouchEnd = (control: 'throttle' | 'brake' | 'steerLeft' | 'steerRight') => {
    setActiveTouches((prev) => ({ ...prev, [control]: false }));
    onTouchControlChange(control, false);
  };

  // Toggle Auto-Gas Assist
  const handleToggleAutoGas = () => {
    triggerHaptic(25);
    const next = !autoGas;
    setAutoGas(next);
    onTouchControlChange('throttle', next);
  };

  // Calculate simulated gear based on speed
  const getGear = (speedKmH: number): { gear: string; rpmPercent: number } => {
    if (speedKmH < 15) return { gear: '1', rpmPercent: speedKmH / 70 };
    if (speedKmH < 95) return { gear: '2', rpmPercent: (speedKmH - 15) / 80 };
    if (speedKmH < 150) return { gear: '3', rpmPercent: (speedKmH - 95) / 55 };
    if (speedKmH < 205) return { gear: '4', rpmPercent: (speedKmH - 150) / 55 };
    if (speedKmH < 255) return { gear: '5', rpmPercent: (speedKmH - 205) / 50 };
    if (speedKmH < 295) return { gear: '6', rpmPercent: (speedKmH - 255) / 40 };
    if (speedKmH < 330) return { gear: '7', rpmPercent: (speedKmH - 295) / 35 };
    return { gear: '8', rpmPercent: Math.min((speedKmH - 330) / 35, 1) };
  };

  const { gear, rpmPercent } = getGear(playerCar.speed);

  // Format time mm:ss.sss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-4 select-none touch-none overflow-hidden">
      {/* Top Header Row */}
      <div className="flex items-center justify-between w-full">
        {/* Current Position & Lap Banner */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Position Pill */}
          <div className="flex items-center bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-2xl backdrop-blur-md">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-400 font-semibold mr-1.5 sm:mr-2">POS</span>
            <span className="text-xl sm:text-2xl font-black italic tracking-tighter text-yellow-400">
              P{currentRank > 0 ? currentRank : 22}
            </span>
            <span className="text-[10px] sm:text-xs text-zinc-500 ml-1 font-mono">/ 22</span>
          </div>

          {/* Lap Counter */}
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-2xl backdrop-blur-md">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-400 font-semibold mr-1.5 sm:mr-2">LAP</span>
            <span className="text-base sm:text-xl font-bold font-mono text-white">
              {Math.min(playerCar.lap + 1, totalLaps)} / {totalLaps}
            </span>
          </div>

          {/* Timing Telemetry Pill */}
          <div className="hidden md:flex flex-col bg-zinc-950/90 border border-zinc-800 rounded-xl px-3 py-1 text-xs font-mono backdrop-blur-md">
            <span className="text-zinc-400 text-[10px]">TIME {formatTime(playerCar.currentLapTime)}</span>
            <span className="text-purple-400 text-[10px]">BEST {playerCar.bestLapTime ? formatTime(playerCar.bestLapTime) : '--:--.---'}</span>
          </div>
        </div>

        {/* Top Controls: Camera View, Sound, Auto-Gas, Abandon */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Monoposto Camera Switcher Button */}
          <button
            onClick={() => {
              triggerHaptic(20);
              onCycleCamera();
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1.5 backdrop-blur-md shadow-lg"
            title="Switch Monoposto Camera View (C)"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">VIEW:</span>
            <span className="text-cyan-300 font-mono text-[10px] sm:text-[11px]">
              {cameraMode === 'T_CAM' ? 'T-CAM' : cameraMode}
            </span>
          </button>

          {/* Auto-Gas Assist button for touchscreen convenience */}
          <button
            onClick={handleToggleAutoGas}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1.5 backdrop-blur-md ${
              autoGas
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Auto Acceleration"
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">AUTO GAS:</span>
            <span>{autoGas ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={onToggleMute}
            className="p-2 sm:p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition backdrop-blur-md"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onAbandonRace}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-red-600 text-zinc-400 hover:text-red-400 transition backdrop-blur-md"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Center Alert Notifications (DRS, Slipstream, Off-track) */}
      <div className="flex flex-col items-center gap-1.5 -mt-6">
        {playerCar.drsActive && (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-black tracking-widest text-xs sm:text-sm shadow-[0_0_25px_rgba(34,197,94,0.7)] animate-bounce">
            <Zap className="w-4 h-4 fill-zinc-950" />
            DRS ACTIVE (+{playerCar.specs.drsBoost} KM/H)
          </div>
        )}

        {playerCar.drsAvailable && !playerCar.drsActive && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-bold tracking-wider text-xs animate-pulse backdrop-blur-md">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            TAP DRS BUTTON TO OPEN WING!
          </div>
        )}

        {playerCar.slipstreamActive && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500 text-cyan-300 font-semibold text-xs backdrop-blur-md">
            SLIPSTREAM TOW (+12 KM/H)
          </div>
        )}

        {playerCar.isOffTrack && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-950/90 border border-amber-500 text-amber-300 font-bold text-xs backdrop-blur-md">
            <AlertTriangle className="w-3.5 h-3.5" />
            GRAVEL RUNOFF PENALTY
          </div>
        )}

        {playerCar.finished && (
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 border-2 border-yellow-400 text-yellow-400 font-black text-base sm:text-lg shadow-2xl animate-pulse">
            <Flag className="w-5 h-5 text-yellow-400" />
            CHECKERED FLAG • P{playerCar.finishPosition || currentRank}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS & HUD AREA - FULL TOUCHSCREEN OPTIMIZED */}
      <div className="flex items-end justify-between w-full gap-2 sm:gap-4 pb-1 sm:pb-2">
        {/* LEFT THUMB ZONE: DEDICATED STEERING CONTROLS */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 z-30">
          {/* Steer Left Button */}
          <button
            onPointerDown={(e) => { e.preventDefault(); handleTouchStart('steerLeft'); }}
            onPointerUp={(e) => { e.preventDefault(); handleTouchEnd('steerLeft'); }}
            onPointerLeave={() => activeTouches.steerLeft && handleTouchEnd('steerLeft')}
            onPointerCancel={() => activeTouches.steerLeft && handleTouchEnd('steerLeft')}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-black select-none touch-none shadow-2xl transition-all transform active:scale-90 ${
              activeTouches.steerLeft
                ? 'bg-yellow-500 border-yellow-300 text-zinc-950 shadow-[0_0_25px_rgba(234,179,8,0.7)] scale-95'
                : 'bg-zinc-950/85 border-zinc-700/90 text-white backdrop-blur-md hover:border-zinc-500'
            }`}
          >
            <span className="text-2xl sm:text-3xl font-mono leading-none">◀</span>
            <span className="text-[9px] sm:text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-1">LEFT</span>
          </button>

          {/* Steer Right Button */}
          <button
            onPointerDown={(e) => { e.preventDefault(); handleTouchStart('steerRight'); }}
            onPointerUp={(e) => { e.preventDefault(); handleTouchEnd('steerRight'); }}
            onPointerLeave={() => activeTouches.steerRight && handleTouchEnd('steerRight')}
            onPointerCancel={() => activeTouches.steerRight && handleTouchEnd('steerRight')}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center font-black select-none touch-none shadow-2xl transition-all transform active:scale-90 ${
              activeTouches.steerRight
                ? 'bg-yellow-500 border-yellow-300 text-zinc-950 shadow-[0_0_25px_rgba(234,179,8,0.7)] scale-95'
                : 'bg-zinc-950/85 border-zinc-700/90 text-white backdrop-blur-md hover:border-zinc-500'
            }`}
          >
            <span className="text-2xl sm:text-3xl font-mono leading-none">▶</span>
            <span className="text-[9px] sm:text-[10px] tracking-widest uppercase font-bold text-zinc-400 mt-1">RIGHT</span>
          </button>
        </div>

        {/* CENTER DASHBOARD: COMPACT DIGITAL TELEMETRY (Hidden in COCKPIT mode since wheel has OLED dash) */}
        {cameraMode !== 'COCKPIT' ? (
          <div className="flex flex-col items-center bg-zinc-950/90 border border-zinc-800 rounded-2xl px-3 sm:px-6 py-2 shadow-2xl backdrop-blur-lg shrink-0">
            {/* F1 Rev Lights */}
            <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
              {Array.from({ length: 15 }).map((_, idx) => {
                const active = idx / 15 <= rpmPercent;
                let color = 'bg-zinc-800';
                if (active) {
                  if (idx < 5) color = 'bg-emerald-500 shadow-[0_0_8px_#10B981]';
                  else if (idx < 10) color = 'bg-red-500 shadow-[0_0_8px_#EF4444]';
                  else color = 'bg-purple-500 shadow-[0_0_8px_#A855F7] animate-pulse';
                }
                return (
                  <div
                    key={idx}
                    className={`w-1.5 sm:w-2.5 h-2.5 sm:h-3.5 rounded-xs transition-colors duration-75 ${color}`}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              {/* Gear */}
              <div className="flex flex-col items-center">
                <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest">GEAR</span>
                <span className="text-2xl sm:text-4xl font-black font-mono text-yellow-400 leading-none">
                  {gear}
                </span>
              </div>

              {/* Speed */}
              <div className="flex flex-col items-center">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-4xl font-black font-mono tracking-tighter text-white leading-none">
                    {Math.round(playerCar.speed)}
                  </span>
                  <span className="text-[9px] sm:text-xs font-bold text-zinc-400 uppercase font-mono">KM/H</span>
                </div>
              </div>

              {/* DRS Status */}
              <div className="flex flex-col items-center">
                <span className="text-[8px] sm:text-[9px] font-bold text-zinc-500 uppercase tracking-widest">DRS</span>
                <div
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[10px] sm:text-xs font-black tracking-wider uppercase ${
                    playerCar.drsActive
                      ? 'bg-emerald-500 text-black shadow-[0_0_12px_#10B981]'
                      : playerCar.drsAvailable
                      ? 'bg-emerald-950 border border-emerald-500 text-emerald-400'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {playerCar.drsActive ? 'ON' : playerCar.drsAvailable ? 'RDY' : 'OFF'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-500/80 bg-zinc-950/70 px-3 py-1 rounded-full border border-zinc-800/80 backdrop-blur-sm">
            COCKPIT ONBOARD • WHEEL DASH ACTIVE
          </div>
        )}

        {/* RIGHT THUMB ZONE: BRAKE, GAS & PROMINENT DRS BUTTON */}
        <div className="pointer-events-auto flex items-end gap-2 sm:gap-3 z-30">
          {/* Brake & DRS stack */}
          <div className="flex flex-col gap-2">
            {/* Large DRS Trigger Button */}
            <button
              onClick={() => {
                triggerHaptic(25);
                onTouchControlChange('drs', !playerCar.drsActive);
              }}
              className={`w-14 sm:w-16 h-10 sm:h-11 rounded-xl border flex items-center justify-center font-black text-xs select-none touch-none shadow-xl transition-all transform active:scale-90 ${
                playerCar.drsActive
                  ? 'bg-emerald-500 border-white text-zinc-950 shadow-[0_0_20px_#10B981]'
                  : playerCar.drsAvailable
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-zinc-900/80 border-zinc-700/80 text-zinc-500'
              }`}
            >
              <Zap className="w-3.5 h-3.5 mr-1" />
              DRS
            </button>

            {/* Brake Pedal */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleTouchStart('brake'); }}
              onPointerUp={(e) => { e.preventDefault(); handleTouchEnd('brake'); }}
              onPointerLeave={() => activeTouches.brake && handleTouchEnd('brake')}
              onPointerCancel={() => activeTouches.brake && handleTouchEnd('brake')}
              className={`w-14 sm:w-16 h-14 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-black select-none touch-none shadow-2xl transition-all transform active:scale-90 ${
                activeTouches.brake
                  ? 'bg-red-600 border-red-300 text-white shadow-[0_0_25px_rgba(239,68,68,0.8)] scale-95'
                  : 'bg-red-950/60 border-red-700/80 text-red-300 backdrop-blur-md hover:bg-red-900/60'
              }`}
            >
              <span className="text-xs sm:text-sm font-bold">STOP</span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-red-400 mt-0.5">BRAKE</span>
            </button>
          </div>

          {/* Large Gas Pedal (Accelerator) */}
          <button
            onPointerDown={(e) => { e.preventDefault(); handleTouchStart('throttle'); }}
            onPointerUp={(e) => { e.preventDefault(); handleTouchEnd('throttle'); }}
            onPointerLeave={() => activeTouches.throttle && handleTouchEnd('throttle')}
            onPointerCancel={() => activeTouches.throttle && handleTouchEnd('throttle')}
            className={`w-16 sm:w-20 h-24 sm:h-28 rounded-2xl border-2 flex flex-col items-center justify-center font-black select-none touch-none shadow-2xl transition-all transform active:scale-95 ${
              activeTouches.throttle || autoGas
                ? 'bg-emerald-500 border-emerald-300 text-zinc-950 shadow-[0_0_30px_rgba(16,185,129,0.8)] scale-95'
                : 'bg-emerald-950/70 border-emerald-600/80 text-emerald-300 backdrop-blur-md hover:bg-emerald-900/70'
            }`}
          >
            <div className="flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-black">▲</span>
              <span className="text-xs sm:text-sm font-black tracking-wider uppercase mt-1">
                {autoGas ? 'AUTO' : 'GAS'}
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-emerald-400">
                THROTTLE
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

