/**
 * Types for Apex GP - Formula AI Grand Prix
 */

export type CameraMode = 'CHASE' | 'T_CAM' | 'COCKPIT' | 'NOSE' | 'OVERHEAD';

export interface Vector2D {
  x: number;
  y: number;
}

export type TrackCategory = 
  | 'ADAPTIVE'          // Procedurally tailored to challenge the player's learning profile
  | 'TEMPLE_OF_SPEED'   // Monza-style high-speed straights & heavy braking
  | 'STREET_CIRCUIT'    // Monaco/Baku-style tight corners, barriers & hairpins
  | 'TECHNICAL_FLOW'    // Suzuka/Silverstone-style flowing esses & chicane complexes
  | 'ROLLERCOASTER';    // Spa-style mixed sweepers, fast curves & elevation feel

export interface TrackPoint {
  x: number;
  y: number;
  width: number;
  angle: number;
  curvature: number;
  distance: number;
  sector: 1 | 2 | 3;
  isDRSZone?: boolean;
  hasCurbs?: boolean;
}

export interface DRSZone {
  detectionDist: number;
  startDist: number;
  endDist: number;
  name: string;
}

export interface TrackData {
  id: string;
  name: string;
  country: string;
  flag: string;
  category: TrackCategory;
  points: TrackPoint[];
  totalLength: number;
  drsZones: DRSZone[];
  startPosition: Vector2D;
  startAngle: number;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  difficultyScore: number; // 1 to 10
  curvatureProfile: {
    sharpTurns: number;
    straights: number;
    chicanes: number;
    avgSpeedRating: number;
  };
  adaptationReason?: string;
}

export type TireCompound = 'SOFT' | 'MEDIUM' | 'HARD';

export interface CarSpecs {
  topSpeed: number;        // in km/h (e.g. 310 - 360)
  acceleration: number;    // 0-100 time factor (higher = faster)
  corneringGrip: number;   // lateral grip multiplier
  brakingPower: number;    // deceleration rate
  drsBoost: number;        // top speed bonus with DRS active
  aeroStability: number;   // stability at high speeds & curbs
}

export interface CarCustomization {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  haloColor: string;
  teamName: string;
  driverName: string;
  driverNumber: number;
  sponsorName: string;
}

export interface CarModel {
  id: string;
  name: string;
  tier: number;
  price: number;
  description: string;
  baseSpecs: CarSpecs;
  unlocked: boolean;
}

export interface CarUpgradeLevels {
  engine: number;       // 1 to 6
  hybridMgu: number;    // 1 to 6
  aeroDownforce: number;// 1 to 6
  brakes: number;       // 1 to 6
  chassis: number;      // 1 to 6
  drsWing: number;      // 1 to 6
}

export interface AIDriverProfile {
  id: string;
  name: string;
  number: number;
  team: string;
  teamColor: string;
  accentColor: string;
  country: string;
  skill: number;            // 0.70 to 1.05
  aggression: number;       // 0.2 to 0.95
  consistency: number;      // 0.75 to 0.98
  defenseRating: number;    // 0.5 to 1.0
  overtakeTendency: number; // 0.4 to 1.0
}

export interface CarState {
  id: string;
  isPlayer: boolean;
  driverName: string;
  driverNumber: number;
  teamName: string;
  teamColor: string;
  accentColor: string;
  
  // Position & Dynamics
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;            // Current speed in km/h
  angle: number;            // Heading in radians
  steerAngle: number;       // Front wheels steering angle in radians
  targetAngle: number;
  angularVelocity: number;
  
  // Track Progression
  trackDistance: number;    // Distance along track centerline
  lap: number;
  currentSector: 1 | 2 | 3;
  sectorTimes: [number, number, number];
  currentLapTime: number;
  bestLapTime: number | null;
  lastLapTime: number | null;
  totalRaceTime: number;
  finished: boolean;
  finishPosition: number | null;
  
  // F1 Systems
  drsAvailable: boolean;
  drsActive: boolean;
  ersBattery: number;       // 0 to 100%
  tireCompound: TireCompound;
  tireWear: number;         // 0 (fresh) to 100 (blown)
  isBraking: boolean;
  isOffTrack: boolean;
  slipstreamActive: boolean;
  
  // AI State
  aiTargetOffset: number;   // Lateral offset from racing line (-1 left, +1 right)
  aiAggressionTimer: number;
  aiDefending: boolean;
  
  // Specs
  specs: CarSpecs;
}

export interface PlayerDrivingDNA {
  totalRaces: number;
  totalWins: number;
  totalPodiums: number;
  cleanOvertakes: number;
  
  // Learned Skill Metrics (0 to 100)
  corneringMastery: number;     // How well player handles tight corners & apexes
  brakingAccuracy: number;      // Smooth braking vs lockups / overshoot
  throttleDiscipline: number;   // Early throttle without spinning out
  straightLineSpeed: number;    // Max speed efficiency & DRS utilization
  racingLineConsistency: number;// Keeping to optimal track envelope
  aggressionScore: number;      // Wheel-to-wheel boldness
  
  // AI Learning Insights
  playerWeakness: 'HAIRPINS' | 'CHICANES' | 'HIGH_SPEED_TURNS' | 'BRAKING_ZONES' | 'TIRE_MANAGEMENT';
  aiAdaptationLevel: number;    // 1 to 10
  lastLearnedNote: string;
  recommendedCategory: TrackCategory;
}

export interface RaceSettings {
  totalLaps: number;
  trackCategory: TrackCategory;
  difficultyScale: number; // 0.8 to 1.3
  weather: 'DRY' | 'SLIGHT_DRIZZLE';
}

export interface RaceTelemetryEvent {
  time: number;
  type: 'OVERTAKE' | 'FASTEST_LAP' | 'OFF_TRACK' | 'DRS_ACTIVATED' | 'CONTACT';
  text: string;
}
