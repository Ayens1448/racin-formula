import { PlayerDrivingDNA, TrackCategory } from '../types/game';

const STORAGE_KEY = 'apex_driver_dna_v1';

export const INITIAL_DRIVING_DNA: PlayerDrivingDNA = {
  totalRaces: 0,
  totalWins: 0,
  totalPodiums: 0,
  cleanOvertakes: 0,
  corneringMastery: 50,
  brakingAccuracy: 50,
  throttleDiscipline: 50,
  straightLineSpeed: 50,
  racingLineConsistency: 50,
  aggressionScore: 50,
  playerWeakness: 'CHICANES',
  aiAdaptationLevel: 1,
  lastLearnedNote: 'Initial calibration Grand Prix. Race engineers logging baseline braking and apex speeds.',
  recommendedCategory: 'ADAPTIVE',
};

export function loadPlayerDNA(): PlayerDrivingDNA {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...INITIAL_DRIVING_DNA, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return INITIAL_DRIVING_DNA;
}

export function savePlayerDNA(dna: PlayerDrivingDNA): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dna));
  } catch {
    // ignore
  }
}

export interface RaceTelemetrySummary {
  finishedPosition: number;
  totalOvertakes: number;
  offTrackIncidents: number;
  avgApexSpeedRatio: number; // 0.0 to 1.5 (ratio compared to optimal apex speed)
  brakingLateCount: number;  // overshoot turns
  drsSuccessRate: number;    // % DRS used when available
  avgSpeedKmH: number;
  bestLapTime: number;
  hadContact: boolean;
  lapConsistencyDelta: number; // delta between laps
}

/**
 * Analyzes race telemetry and evolves the player's Driving DNA.
 * The AI uses this to alter track generator parameters and tune rival behavior.
 */
export function analyzeRaceAndAdapt(currentDNA: PlayerDrivingDNA, telemetry: RaceTelemetrySummary): PlayerDrivingDNA {
  const updated: PlayerDrivingDNA = { ...currentDNA };

  updated.totalRaces += 1;
  if (telemetry.finishedPosition === 1) updated.totalWins += 1;
  if (telemetry.finishedPosition <= 3) updated.totalPodiums += 1;
  updated.cleanOvertakes += telemetry.totalOvertakes;

  // 1. Evaluate Cornering Mastery
  if (telemetry.avgApexSpeedRatio >= 0.85 && telemetry.avgApexSpeedRatio <= 1.05 && telemetry.offTrackIncidents === 0) {
    updated.corneringMastery = Math.min(updated.corneringMastery + 6, 100);
  } else if (telemetry.offTrackIncidents > 3) {
    updated.corneringMastery = Math.max(updated.corneringMastery - 5, 20);
  } else {
    updated.corneringMastery = Math.min(updated.corneringMastery + 2, 100);
  }

  // 2. Evaluate Braking Accuracy
  if (telemetry.brakingLateCount > 3) {
    updated.brakingAccuracy = Math.max(updated.brakingAccuracy - 6, 20);
  } else if (telemetry.brakingLateCount === 0) {
    updated.brakingAccuracy = Math.min(updated.brakingAccuracy + 5, 100);
  }

  // 3. Evaluate Throttle & Straight Line Speed
  if (telemetry.avgSpeedKmH > 220 && telemetry.drsSuccessRate > 0.6) {
    updated.straightLineSpeed = Math.min(updated.straightLineSpeed + 6, 100);
  }

  // 4. Evaluate Racing Line Consistency
  if (telemetry.lapConsistencyDelta < 1.5 && telemetry.offTrackIncidents <= 1) {
    updated.racingLineConsistency = Math.min(updated.racingLineConsistency + 6, 100);
  } else if (telemetry.lapConsistencyDelta > 3.0) {
    updated.racingLineConsistency = Math.max(updated.racingLineConsistency - 4, 25);
  }

  // 5. Aggression Score
  if (telemetry.totalOvertakes > 4 || telemetry.hadContact) {
    updated.aggressionScore = Math.min(updated.aggressionScore + 8, 100);
  } else if (telemetry.totalOvertakes <= 1) {
    updated.aggressionScore = Math.max(updated.aggressionScore - 4, 30);
  }

  // 6. Identify Current Weakness
  const scores = [
    { type: 'CHICANES' as const, val: updated.racingLineConsistency },
    { type: 'BRAKING_ZONES' as const, val: updated.brakingAccuracy },
    { type: 'HIGH_SPEED_TURNS' as const, val: updated.corneringMastery },
    { type: 'HAIRPINS' as const, val: (updated.brakingAccuracy + updated.corneringMastery) / 2 },
  ];
  scores.sort((a, b) => a.val - b.val);
  updated.playerWeakness = scores[0].type;

  // 7. Calculate Adaptation Level
  const avgSkill = (updated.corneringMastery + updated.brakingAccuracy + updated.straightLineSpeed + updated.racingLineConsistency) / 4;
  updated.aiAdaptationLevel = Math.min(Math.max(Math.floor(avgSkill / 10), 1), 10);

  // 8. Generate Contextual Race Engineer Debrief
  let note = '';
  let recCategory: TrackCategory = 'ADAPTIVE';

  if (telemetry.finishedPosition <= 3) {
    if (updated.playerWeakness === 'CHICANES') {
      note = `Podium pace recorded! Telemetry analysis identified minor hesitation in chicane transitions. Next circuit will feature rapid S-curve sequences to test your precision.`;
      recCategory = 'TECHNICAL_FLOW';
    } else if (updated.playerWeakness === 'BRAKING_ZONES') {
      note = `Outstanding finish! Telemetry shows deep trail-braking advantage. Next circuit will feature extended Monza-grade straights terminating in heavy hairpin braking.`;
      recCategory = 'TEMPLE_OF_SPEED';
    } else {
      note = `Championship-tier performance (P${telemetry.finishedPosition}). Rivals have sharpened defensive apex coverage by +15%. Next circuit will feature an elevation roller-coaster layout.`;
      recCategory = 'ROLLERCOASTER';
    }
  } else {
    if (telemetry.offTrackIncidents > 2) {
      note = `Warning: ${telemetry.offTrackIncidents} off-track excursions detected. Race engineers have mapped wider runoff buffers and softened kerb penalties for the upcoming Grand Prix.`;
    } else if (telemetry.totalOvertakes < 2) {
      note = `Rivals defended the inside line effectively. Next circuit will feature an additional DRS straight with extended tow slipstreams to encourage overtaking.`;
      recCategory = 'TEMPLE_OF_SPEED';
    } else {
      note = `P${telemetry.finishedPosition} finish. Telemetry calibrated rival pace closer to your split times for intense wheel-to-wheel battles.`;
    }
  }

  updated.lastLearnedNote = note;
  updated.recommendedCategory = recCategory;

  savePlayerDNA(updated);
  return updated;
}
