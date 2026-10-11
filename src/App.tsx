import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrackCategory,
  TrackData,
  TireCompound,
  CarUpgradeLevels,
  CarCustomization,
  CarState,
  AIDriverProfile,
  PlayerDrivingDNA,
  CarModel,
  CameraMode,
} from './types/game';
import { AI_DRIVERS, CAR_MODELS, calculateEffectiveSpecs } from './game/garageData';
import { generateProceduralTrack } from './utils/trackGenerator';
import { loadPlayerDNA, analyzeRaceAndAdapt } from './utils/aiLearner';
import { createCarState, PlayerControls } from './game/physics';
import { sound } from './utils/audio';

import { RaceCanvas } from './components/RaceCanvas';
import { F1Hud } from './components/F1Hud';
import { LeaderboardTower } from './components/LeaderboardTower';
import { PreRaceScreen } from './components/PreRaceScreen';
import { GarageView } from './components/GarageView';
import { AILearningDashboard } from './components/AILearningDashboard';
import { RaceResultsModal } from './components/RaceResultsModal';

import { Flag, Wrench, Brain, Play, Volume2, VolumeX, Coins, RotateCw, Smartphone } from 'lucide-react';

type AppScreen = 'PRE_RACE' | 'RACING' | 'GARAGE' | 'TELEMETRY';

const INITIAL_UPGRADES: CarUpgradeLevels = {
  engine: 1,
  hybridMgu: 1,
  aeroDownforce: 1,
  brakes: 1,
  chassis: 1,
  drsWing: 1,
};

const INITIAL_CUSTOMIZATION: CarCustomization = {
  primaryColor: '#6366F1', // Indigo / Apex
  secondaryColor: '#10B981', // Emerald
  accentColor: '#F59E0B', // Amber
  haloColor: '#18181B',
  teamName: 'Apex Grand Prix Racing',
  driverName: 'You (Champion)',
  driverNumber: 99,
  sponsorName: 'Pirelli Motorsport',
};

export default function App() {
  // Screen State
  const [screen, setScreen] = useState<AppScreen>('PRE_RACE');
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  // Economy & Garage State (Stored in localStorage)
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem('apex_coins');
    return saved !== null ? Number(saved) : 1500; // start with 1500 coins for initial upgrades
  });

  const [selectedCarId, setSelectedCarId] = useState<string>(() => {
    return localStorage.getItem('apex_selected_car') || 'car_c42';
  });

  const [unlockedCarIds, setUnlockedCarIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('apex_unlocked_cars');
    return saved ? JSON.parse(saved) : ['car_c42'];
  });

  const [upgrades, setUpgrades] = useState<CarUpgradeLevels>(() => {
    const saved = localStorage.getItem('apex_upgrades');
    return saved ? JSON.parse(saved) : INITIAL_UPGRADES;
  });

  const [customization, setCustomization] = useState<CarCustomization>(() => {
    const saved = localStorage.getItem('apex_customization');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMIZATION;
  });

  // AI Learning State
  const [playerDNA, setPlayerDNA] = useState<PlayerDrivingDNA>(() => loadPlayerDNA());

  // Monoposto Camera Mode (CHASE, T_CAM, NOSE, OVERHEAD)
  const [cameraMode, setCameraMode] = useState<CameraMode>('CHASE');

  const handleCycleCamera = useCallback(() => {
    setCameraMode((prev) => {
      if (prev === 'CHASE') return 'T_CAM';
      if (prev === 'T_CAM') return 'COCKPIT';
      if (prev === 'COCKPIT') return 'NOSE';
      if (prev === 'NOSE') return 'OVERHEAD';
      return 'CHASE';
    });
    sound.playDrsChirp();
  }, []);

  // Race Config
  const [trackCategory, setTrackCategory] = useState<TrackCategory>('ADAPTIVE');
  const [selectedTire, setSelectedTire] = useState<TireCompound>('SOFT');
  const [totalLaps, setTotalLaps] = useState<number>(2);

  // Generated Track
  const [track, setTrack] = useState<TrackData>(() =>
    generateProceduralTrack(trackCategory, Math.random(), playerDNA)
  );

  // Live Race Simulation Cars & State
  const [cars, setCars] = useState<CarState[]>([]);
  const [leaderboard, setLeaderboard] = useState<CarState[]>([]);
  const [playerCar, setPlayerCar] = useState<CarState | null>(null);

  // Results Modal State
  const [showResultsModal, setShowResultsModal] = useState<boolean>(false);
  const [raceRewardCoins, setRaceRewardCoins] = useState<number>(0);
  const [raceOvertakes, setRaceOvertakes] = useState<number>(0);
  const [fastestLapName, setFastestLapName] = useState<string>('Max Verstappen');
  const [raceSessionId, setRaceSessionId] = useState<number>(0);

  // Mobile Landscape Orientation Detection
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);
  const [dismissOrientationWarning, setDismissOrientationWarning] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 900 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(isMobile && isPortrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Keyboard and Virtual Controls
  const [controls, setControls] = useState<PlayerControls>({
    throttle: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
    drs: false,
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('apex_coins', String(coins));
  }, [coins]);

  useEffect(() => {
    localStorage.setItem('apex_selected_car', selectedCarId);
  }, [selectedCarId]);

  useEffect(() => {
    localStorage.setItem('apex_unlocked_cars', JSON.stringify(unlockedCarIds));
  }, [unlockedCarIds]);

  useEffect(() => {
    localStorage.setItem('apex_upgrades', JSON.stringify(upgrades));
  }, [upgrades]);

  useEffect(() => {
    localStorage.setItem('apex_customization', JSON.stringify(customization));
  }, [customization]);

  // AI Drivers Map
  const aiProfilesMap = useMemo(() => {
    const map = new Map<string, AIDriverProfile>();
    AI_DRIVERS.forEach((d) => map.set(d.id, d));
    return map;
  }, []);

  // Keyboard Event Listeners for smooth racing controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'RACING') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setControls((prev) => ({ ...prev, throttle: true }));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setControls((prev) => ({ ...prev, brake: true }));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setControls((prev) => ({ ...prev, steerLeft: true }));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setControls((prev) => ({ ...prev, steerRight: true }));
      } else if (e.key === 'c' || e.key === 'C') {
        handleCycleCamera();
      } else if (e.key === ' ') {
        e.preventDefault();
        setControls((prev) => ({ ...prev, drs: true }));
        sound.playDrsChirp();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setControls((prev) => ({ ...prev, throttle: false }));
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setControls((prev) => ({ ...prev, brake: false }));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setControls((prev) => ({ ...prev, steerLeft: false }));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setControls((prev) => ({ ...prev, steerRight: false }));
      } else if (e.key === ' ') {
        setControls((prev) => ({ ...prev, drs: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen]);

  // Touch controls callback
  const handleTouchControl = useCallback((control: keyof PlayerControls, active: boolean) => {
    setControls((prev) => {
      if (control === 'drs' && active) {
        sound.playDrsChirp();
      }
      return { ...prev, [control]: active };
    });
  }, []);

  // Regenerate Procedural Track
  const handleRegenerateTrack = useCallback(() => {
    const newTrack = generateProceduralTrack(trackCategory, Math.random(), playerDNA);
    setTrack(newTrack);
  }, [trackCategory, playerDNA]);

  // Category switch
  const handleChangeCategory = useCallback((cat: TrackCategory) => {
    setTrackCategory(cat);
    const newTrack = generateProceduralTrack(cat, Math.random(), playerDNA);
    setTrack(newTrack);
  }, [playerDNA]);

  // Launch Grand Prix (Build 22 Cars Grid)
  const handleStartRace = useCallback(() => {
    setShowResultsModal(false);
    setRaceSessionId((prev) => prev + 1);
    // Find selected player car model & calculate specs
    const activeCarModel = CAR_MODELS.find((c) => c.id === selectedCarId) || CAR_MODELS[0];
    const playerSpecs = calculateEffectiveSpecs(activeCarModel.baseSpecs, upgrades);

    // Apply tire compound modifier
    if (selectedTire === 'SOFT') {
      playerSpecs.corneringGrip *= 1.08;
      playerSpecs.acceleration *= 1.06;
    } else if (selectedTire === 'HARD') {
      playerSpecs.aeroStability *= 1.15;
    }

    // Grid placement: Player starts around P10 (midfield) so player can battle through the field!
    const playerGridPos = 9;

    // Create Player Car State
    const playerState = createCarState(
      'car_player',
      true,
      customization.driverName,
      customization.driverNumber,
      customization.teamName,
      customization.primaryColor,
      customization.accentColor,
      playerSpecs,
      track,
      playerGridPos,
      selectedTire
    );

    // Create 21 AI Cars States
    const allCars: CarState[] = [];
    let currentSlot = 0;

    // Grid positions 0 to 21
    for (let pos = 0; pos < 22; pos++) {
      if (pos === playerGridPos) {
        allCars.push(playerState);
      } else {
        const aiDriver = AI_DRIVERS[currentSlot % AI_DRIVERS.length];
        currentSlot++;

        // Baseline specs scaled by AI skill
        const aiSpecs = {
          topSpeed: 326 * aiDriver.skill,
          acceleration: 3.8 * aiDriver.skill,
          corneringGrip: 2.35 * aiDriver.skill,
          brakingPower: 9.4 * aiDriver.skill,
          drsBoost: 26,
          aeroStability: 2.3,
        };

        const aiState = createCarState(
          aiDriver.id,
          false,
          aiDriver.name,
          aiDriver.number,
          aiDriver.team,
          aiDriver.teamColor,
          aiDriver.accentColor,
          aiSpecs,
          track,
          pos,
          'MEDIUM'
        );
        allCars.push(aiState);
      }
    }

    setCars(allCars);
    setLeaderboard(allCars);
    setPlayerCar(playerState);
    setScreen('RACING');
  }, [selectedCarId, upgrades, selectedTire, customization, track]);

  // Race Finish Callback
  const handleRaceFinish = useCallback((
    finalLeaderboard: CarState[],
    telemetry: {
      overtakes: number;
      offTrackCount: number;
      avgApexRatio: number;
      brakingLateCount: number;
      drsUsageCount: number;
      hadContact: boolean;
    }
  ) => {
    const playerRank = finalLeaderboard.findIndex((c) => c.isPlayer) + 1;
    const finalRank = playerRank > 0 ? playerRank : 22;

    // Calculate Coin Prize
    // P1: 2500, P2: 1800, P3: 1400, P4-P10: 1000 - (rank*60), P11-22: 400
    let baseReward = 400;
    if (finalRank === 1) baseReward = 2800;
    else if (finalRank === 2) baseReward = 2000;
    else if (finalRank === 3) baseReward = 1500;
    else if (finalRank <= 10) baseReward = 1200 - finalRank * 50;

    const overtakeBonus = telemetry.overtakes * 90;
    const adaptationBonus = playerDNA.aiAdaptationLevel * 120;
    const totalPrize = baseReward + overtakeBonus + adaptationBonus;

    setCoins((prev) => prev + totalPrize);
    setRaceRewardCoins(totalPrize);
    setRaceOvertakes(telemetry.overtakes);

    // Identify fastest lap driver
    let fastestLapDriver = 'Max Verstappen';
    let minLapTime = Infinity;
    finalLeaderboard.forEach((c) => {
      if (c.bestLapTime && c.bestLapTime < minLapTime) {
        minLapTime = c.bestLapTime;
        fastestLapDriver = `${c.driverName} (${(minLapTime).toFixed(2)}s)`;
      }
    });
    setFastestLapName(fastestLapDriver);

    // Evolve Driver DNA using neural telemetry!
    const updatedDNA = analyzeRaceAndAdapt(playerDNA, {
      finishedPosition: finalRank,
      totalOvertakes: telemetry.overtakes,
      offTrackIncidents: telemetry.offTrackCount,
      avgApexSpeedRatio: telemetry.avgApexRatio,
      brakingLateCount: telemetry.brakingLateCount,
      drsSuccessRate: telemetry.drsUsageCount > 0 ? 0.8 : 0.2,
      avgSpeedKmH: 240,
      bestLapTime: minLapTime,
      hadContact: telemetry.hadContact,
      lapConsistencyDelta: 0.8,
    });
    setPlayerDNA(updatedDNA);

    setShowResultsModal(true);
  }, [playerDNA]);

  // Race Again Callback (Re-launch on the current track immediately!)
  const handleRaceAgain = useCallback(() => {
    setShowResultsModal(false);
    handleStartRace();
  }, [handleStartRace]);

  // Next Race Callback (Advance to next procedural circuit)
  const handleNextRace = useCallback(() => {
    const nextCircuit = generateProceduralTrack(
      trackCategory === 'ADAPTIVE' ? 'ADAPTIVE' : trackCategory,
      Math.random(),
      playerDNA
    );
    setTrack(nextCircuit);
    setShowResultsModal(false);
    setScreen('PRE_RACE');
  }, [trackCategory, playerDNA]);

  // Upgrade part
  const handleUpgradePart = useCallback((partKey: keyof CarUpgradeLevels, cost: number) => {
    if (coins < cost) return;
    setCoins((c) => c - cost);
    setUpgrades((prev) => ({
      ...prev,
      [partKey]: Math.min(prev[partKey] + 1, 6),
    }));
    sound.playDrsChirp();
  }, [coins]);

  // Buy new car chassis
  const handleBuyCar = useCallback((car: CarModel) => {
    if (coins < car.price) return;
    setCoins((c) => c - car.price);
    setUnlockedCarIds((prev) => [...prev, car.id]);
    setSelectedCarId(car.id);
    sound.playCheer();
  }, [coins]);

  return (
    <div className="flex flex-col w-screen h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Global Top Navigation Header (hidden during race to maximize viewport) */}
      {screen !== 'RACING' && (
        <header className="flex items-center justify-between px-6 py-3 bg-zinc-950/90 border-b border-zinc-800 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black italic text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]">
              F1
            </div>
            <div>
              <span className="text-lg font-black italic tracking-tight text-white uppercase">
                APEX GP
              </span>
              <span className="text-xs text-red-500 font-mono font-bold ml-2 hidden sm:inline">
                WORLD FORMULA CHAMPIONSHIP
              </span>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setScreen('PRE_RACE')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                screen === 'PRE_RACE'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Flag className="w-4 h-4 text-emerald-400" />
              <span>Grand Prix</span>
            </button>

            <button
              onClick={() => setScreen('GARAGE')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                screen === 'GARAGE'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Wrench className="w-4 h-4 text-yellow-400" />
              <span>Garage & Upgrades</span>
            </button>

            <button
              onClick={() => setScreen('TELEMETRY')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                screen === 'TELEMETRY'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Brain className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">Telemetry & DNA</span>
            </button>
          </div>

          {/* Coins Counter & Sound Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-900 border border-yellow-500/30 px-3 py-1.5 rounded-xl font-mono">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="font-bold text-yellow-400 text-sm">
                {coins.toLocaleString()}
              </span>
            </div>

            <button
              onClick={() => setIsMuted(sound.toggleMute())}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {screen === 'PRE_RACE' && (
          <div className="w-full h-full overflow-y-auto py-4">
            <PreRaceScreen
              track={track}
              playerDNA={playerDNA}
              selectedTire={selectedTire}
              onSelectTire={setSelectedTire}
              totalLaps={totalLaps}
              onChangeLaps={setTotalLaps}
              trackCategory={trackCategory}
              onChangeCategory={handleChangeCategory}
              onRegenerateTrack={handleRegenerateTrack}
              onStartRace={handleStartRace}
              userCoins={coins}
            />
          </div>
        )}

        {screen === 'RACING' && (
          <div className="relative w-full h-full">
            {/* 60FPS Canvas World */}
            <RaceCanvas
              key={raceSessionId}
              track={track}
              cars={cars}
              aiProfiles={aiProfilesMap}
              playerDNA={playerDNA}
              totalLaps={totalLaps}
              cameraMode={cameraMode}
              onRaceFinish={handleRaceFinish}
              onUpdateLeaderboard={setLeaderboard}
              onUpdatePlayerCar={setPlayerCar}
              controlsState={controls}
            />

            {/* F1 Timing Tower on Left */}
            <LeaderboardTower
              leaderboard={leaderboard}
              playerCarId="car_player"
            />

            {/* F1 Telemetry HUD Overlay & Mobile Touch Controls */}
            {playerCar && (
              <F1Hud
                playerCar={playerCar}
                track={track}
                totalLaps={totalLaps}
                leaderboard={leaderboard}
                isMuted={isMuted}
                cameraMode={cameraMode}
                onCycleCamera={handleCycleCamera}
                onSelectCameraMode={setCameraMode}
                onToggleMute={() => setIsMuted(sound.toggleMute())}
                onAbandonRace={() => setScreen('PRE_RACE')}
                onTouchControlChange={handleTouchControl}
              />
            )}
          </div>
        )}

        {screen === 'GARAGE' && (
          <div className="w-full h-full overflow-y-auto py-4">
            <GarageView
              coins={coins}
              selectedCarId={selectedCarId}
              unlockedCarIds={unlockedCarIds}
              upgrades={upgrades}
              customization={customization}
              onBuyCar={handleBuyCar}
              onSelectCar={setSelectedCarId}
              onUpgradePart={handleUpgradePart}
              onUpdateCustomization={setCustomization}
            />
          </div>
        )}

        {screen === 'TELEMETRY' && (
          <div className="w-full h-full overflow-y-auto py-4">
            <AILearningDashboard
              playerDNA={playerDNA}
              onSelectCategoryForNextRace={handleChangeCategory}
            />
          </div>
        )}
      </main>

      {/* Race Results & Podium Celebration Modal */}
      {showResultsModal && (
        <RaceResultsModal
          leaderboard={leaderboard}
          playerCarId="car_player"
          playerDNA={playerDNA}
          coinsEarned={raceRewardCoins}
          overtakesCount={raceOvertakes}
          fastestLapDriverName={fastestLapName}
          onRaceAgain={handleRaceAgain}
          onNextRace={handleNextRace}
          onOpenGarage={() => {
            setShowResultsModal(false);
            setScreen('GARAGE');
          }}
          onOpenTelemetry={() => {
            setShowResultsModal(false);
            setScreen('TELEMETRY');
          }}
        />
      )}

      {/* Mobile Portrait Landscape Recommendation Modal */}
      {isPortraitMobile && !dismissOrientationWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none">
          <div className="w-full max-w-sm bg-zinc-950 border-2 border-red-500/60 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 bg-red-600/20 border border-red-500/40 rounded-full text-red-500 animate-bounce">
              <Smartphone className="w-10 h-10 rotate-90" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-red-400 mb-1">
                Landscape Mode Recommended
              </div>
              <h2 className="text-2xl font-black italic text-white uppercase">
                ROTATE YOUR PHONE
              </h2>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Apex GP is optimized for landscape racing. Turn your phone sideways for wide tracks, high speeds, and precision steering touch controls!
              </p>
            </div>
            <button
              onClick={() => setDismissOrientationWarning(true)}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black italic tracking-wider rounded-xl shadow-lg transition cursor-pointer"
            >
              CONTINUE IN PORTRAIT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
