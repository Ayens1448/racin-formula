import React, { useState } from 'react';
import { CarModel, CarUpgradeLevels, CarCustomization } from '../types/game';
import { CAR_MODELS, UPGRADE_METADATA, calculateEffectiveSpecs } from '../game/garageData';
import { Coins, Zap, Shield, Gauge, Check, ShoppingBag, Palette } from 'lucide-react';

interface GarageViewProps {
  coins: number;
  selectedCarId: string;
  unlockedCarIds: string[];
  upgrades: CarUpgradeLevels;
  customization: CarCustomization;
  onBuyCar: (car: CarModel) => void;
  onSelectCar: (carId: string) => void;
  onUpgradePart: (partKey: keyof CarUpgradeLevels, cost: number) => void;
  onUpdateCustomization: (customization: CarCustomization) => void;
}

export const GarageView: React.FC<GarageViewProps> = ({
  coins,
  selectedCarId,
  unlockedCarIds,
  upgrades,
  customization,
  onBuyCar,
  onSelectCar,
  onUpgradePart,
  onUpdateCustomization,
}) => {
  const [activeTab, setActiveTab] = useState<'SHOWROOM' | 'RD_UPGRADES' | 'LIVERY'>('RD_UPGRADES');
  const [viewedCarId, setViewedCarId] = useState<string>(selectedCarId);

  const viewedCar = CAR_MODELS.find((c) => c.id === viewedCarId) || CAR_MODELS[0];
  const effectiveSpecs = calculateEffectiveSpecs(viewedCar.baseSpecs, upgrades);
  const isViewedUnlocked = unlockedCarIds.includes(viewedCar.id);
  const isViewedSelected = selectedCarId === viewedCar.id;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 p-4">
      {/* Top Header & Coin Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-2xl md:text-3xl font-black italic tracking-tight text-white uppercase">
            F1 Paddock & R&D Center
          </h1>
          <p className="text-sm text-zinc-400">
            Tune aerodynamics, upgrade power units, and customize liveries
          </p>
        </div>

        {/* Coin Balance Pill */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-yellow-500/30 px-5 py-3 rounded-2xl shadow-inner">
          <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Coins className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Credits Balance</div>
            <div className="text-2xl font-black font-mono text-yellow-400">
              {coins.toLocaleString()} <span className="text-xs text-yellow-500/80">CR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {(
          [
            { id: 'RD_UPGRADES', label: 'R&D Upgrades', icon: Zap },
            { id: 'SHOWROOM', label: 'Car Showroom', icon: ShoppingBag },
            { id: 'LIVERY', label: 'Livery & Customization', icon: Palette },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
                active
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: R&D UPGRADES */}
      {activeTab === 'RD_UPGRADES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(UPGRADE_METADATA) as Array<keyof CarUpgradeLevels>).map((key) => {
            const meta = UPGRADE_METADATA[key];
            const currentLvl = upgrades[key];
            const isMax = currentLvl >= meta.maxLevel;
            const nextCost = isMax ? 0 : meta.costPerLevel[currentLvl - 1];
            const canAfford = coins >= nextCost && !isMax;

            return (
              <div
                key={key}
                className="flex flex-col justify-between bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-lg hover:border-zinc-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono">
                      {meta.category}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Tier {currentLvl} / {meta.maxLevel}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white mb-1">{meta.name}</h3>
                  <p className="text-xs text-zinc-400 mb-3">{meta.description}</p>

                  <div className="text-[11px] font-semibold text-emerald-400 mb-4">
                    Gain: {meta.statGain}
                  </div>

                  {/* Level Progress Bars */}
                  <div className="grid grid-cols-6 gap-1.5 mb-4">
                    {Array.from({ length: meta.maxLevel }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 rounded-xs transition ${
                          idx < currentLvl
                            ? 'bg-gradient-to-r from-red-500 to-amber-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                            : 'bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                  <div className="text-sm font-mono font-bold text-yellow-400">
                    {isMax ? 'MAX LEVEL' : `${nextCost.toLocaleString()} CR`}
                  </div>

                  <button
                    disabled={isMax || !canAfford}
                    onClick={() => onUpgradePart(key, nextCost)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isMax
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : canAfford
                        ? 'bg-yellow-500 hover:bg-yellow-400 text-zinc-950 shadow-md font-black'
                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {isMax ? 'Fully Developed' : 'Upgrade Component'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: CAR SHOWROOM */}
      {activeTab === 'SHOWROOM' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chassis Selection List */}
          <div className="flex flex-col gap-3">
            {CAR_MODELS.map((car) => {
              const unlocked = unlockedCarIds.includes(car.id);
              const selected = selectedCarId === car.id;
              const isViewing = viewedCarId === car.id;

              return (
                <div
                  key={car.id}
                  onClick={() => setViewedCarId(car.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    isViewing
                      ? 'bg-zinc-800/90 border-red-500 shadow-md'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-500">Tier {car.tier}</span>
                      {selected && (
                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-1.5 py-0.2 rounded font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="font-black text-sm text-white mt-0.5">{car.name}</div>
                  </div>

                  <div className="text-right">
                    {unlocked ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Owned
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-yellow-400">
                        {car.price.toLocaleString()} CR
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Car Detailed Specs & Action */}
          <div className="md:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-bold uppercase text-red-500 tracking-wider">
                    Chassis Specification • Tier {viewedCar.tier}
                  </span>
                  <h2 className="text-2xl font-black text-white mt-1">{viewedCar.name}</h2>
                  <p className="text-xs text-zinc-400 mt-1">{viewedCar.description}</p>
                </div>

                {/* Status Badge */}
                <div>
                  {isViewedSelected ? (
                    <span className="px-3 py-1 bg-yellow-500 text-zinc-950 font-black text-xs rounded-lg uppercase">
                      Race Selected
                    </span>
                  ) : isViewedUnlocked ? (
                    <button
                      onClick={() => onSelectCar(viewedCar.id)}
                      className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-lg border border-zinc-700 transition"
                    >
                      Select Car
                    </button>
                  ) : (
                    <button
                      disabled={coins < viewedCar.price}
                      onClick={() => onBuyCar(viewedCar)}
                      className={`px-5 py-2 font-black text-xs rounded-xl shadow-lg transition ${
                        coins >= viewedCar.price
                          ? 'bg-yellow-500 hover:bg-yellow-400 text-zinc-950'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      Unlock for {viewedCar.price.toLocaleString()} CR
                    </button>
                  )}
                </div>
              </div>

              {/* Specs Bars */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-red-400" /> Top Speed
                    </span>
                    <span className="font-mono text-white font-bold">{Math.round(effectiveSpecs.topSpeed)} km/h</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min((effectiveSpecs.topSpeed / 370) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" /> Acceleration (0-100)
                    </span>
                    <span className="font-mono text-white font-bold">{effectiveSpecs.acceleration.toFixed(1)}s power</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-yellow-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min((effectiveSpecs.acceleration / 5.5) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" /> Cornering Downforce
                    </span>
                    <span className="font-mono text-white font-bold">{effectiveSpecs.corneringGrip.toFixed(2)}G</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min((effectiveSpecs.corneringGrip / 3.8) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                  <div className="flex justify-between text-xs mb-1.5 font-semibold">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" /> DRS Boost Delta
                    </span>
                    <span className="font-mono text-white font-bold">+{Math.round(effectiveSpecs.drsBoost)} km/h</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min((effectiveSpecs.drsBoost / 45) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVERY & CUSTOMIZATION */}
      {activeTab === 'LIVERY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
          {/* Customization Inputs */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Driver Name
              </label>
              <input
                type="text"
                value={customization.driverName}
                onChange={(e) => onUpdateCustomization({ ...customization, driverName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                maxLength={20}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Racing Number (1 - 99)
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={customization.driverNumber}
                onChange={(e) => onUpdateCustomization({ ...customization, driverNumber: Number(e.target.value) || 1 })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:border-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Constructor Team Name
              </label>
              <input
                type="text"
                value={customization.teamName}
                onChange={(e) => onUpdateCustomization({ ...customization, teamName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                maxLength={24}
              />
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Primary Livery</label>
                <input
                  type="color"
                  value={customization.primaryColor}
                  onChange={(e) => onUpdateCustomization({ ...customization, primaryColor: e.target.value })}
                  className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer p-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Secondary / Wing</label>
                <input
                  type="color"
                  value={customization.secondaryColor}
                  onChange={(e) => onUpdateCustomization({ ...customization, secondaryColor: e.target.value })}
                  className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer p-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Accent Strip</label>
                <input
                  type="color"
                  value={customization.accentColor}
                  onChange={(e) => onUpdateCustomization({ ...customization, accentColor: e.target.value })}
                  className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer p-1"
                />
              </div>
            </div>
          </div>

          {/* Visual Live Livery Car Preview */}
          <div className="flex flex-col items-center justify-center bg-zinc-950/80 border border-zinc-800 rounded-2xl p-6">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
              Livery Wind Tunnel Preview
            </span>
            <div className="relative w-40 h-64 flex items-center justify-center">
              {/* Top-down Car Silhouette */}
              <svg viewBox="0 0 100 160" className="w-full h-full drop-shadow-2xl">
                {/* Wheels */}
                <rect x="12" y="22" width="14" height="26" rx="3" fill="#18181B" />
                <rect x="74" y="22" width="14" height="26" rx="3" fill="#18181B" />
                <rect x="10" y="112" width="16" height="30" rx="3" fill="#18181B" />
                <rect x="74" y="112" width="16" height="30" rx="3" fill="#18181B" />

                {/* Front Wing */}
                <path d="M 16 20 Q 50 14 84 20 L 84 28 Q 50 24 16 28 Z" fill={customization.secondaryColor} />

                {/* Nosecone */}
                <polygon points="50,14 42,48 58,48" fill={customization.primaryColor} />

                {/* Sidepods & Monocoque Body */}
                <path
                  d="M 42 48 L 30 70 L 32 120 L 40 134 L 60 134 L 68 120 L 70 70 L 58 48 Z"
                  fill={customization.primaryColor}
                />

                {/* Accent Stripes */}
                <path d="M 40 70 L 32 118 L 38 118 L 44 70 Z" fill={customization.accentColor} />
                <path d="M 60 70 L 68 118 L 62 118 L 56 70 Z" fill={customization.accentColor} />

                {/* Cockpit & Halo */}
                <ellipse cx="50" cy="80" rx="7" ry="14" fill="#09090B" />
                <circle cx="50" cy="78" r="4.5" fill="#FACC15" />
                <path d="M 45 72 Q 50 67 55 72 L 55 86 Q 50 90 45 86 Z" fill="none" stroke="#27272A" strokeWidth="2.5" />

                {/* Rear Wing */}
                <rect x="18" y="138" width="64" height="12" rx="2" fill={customization.secondaryColor} />

                {/* Number */}
                <text x="50" y="110" fill="#FFFFFF" fontSize="11" fontWeight="bold" textAnchor="middle">
                  {customization.driverNumber}
                </text>
              </svg>
            </div>
            <div className="mt-4 text-center">
              <div className="text-white font-black text-sm">{customization.teamName}</div>
              <div className="text-xs text-zinc-400 font-mono">#{customization.driverNumber} {customization.driverName}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
