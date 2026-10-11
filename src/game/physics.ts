import { CarState, TrackData, CarSpecs, TireCompound, AIDriverProfile } from '../types/game';
import { getClosestTrackPoint, getTrackPointAtDistance } from '../utils/trackGenerator';

export interface PlayerControls {
  throttle: boolean;
  brake: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  drs: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

export function createCarState(
  id: string,
  isPlayer: boolean,
  driverName: string,
  driverNumber: number,
  teamName: string,
  teamColor: string,
  accentColor: string,
  specs: CarSpecs,
  track: TrackData,
  gridPosition: number, // 0 is pole (P1), 21 is P22
  tireCompound: TireCompound = 'MEDIUM'
): CarState {
  // Stagger grid slots along start-finish straight
  // F1 grid slots: P1 left/right, P2 staggered behind by ~75px, etc.
  const slotSpacing = 72;
  const startDist = track.totalLength - (gridPosition + 1) * slotSpacing;
  const startPt = getTrackPointAtDistance(track, startDist);

  // Stagger laterally across wider grid
  const isLeft = gridPosition % 2 === 0;
  const lateralOffset = isLeft ? -45 : 45;
  const normX = -Math.sin(startPt.angle);
  const normY = Math.cos(startPt.angle);

  const posX = startPt.x + normX * lateralOffset;
  const posY = startPt.y + normY * lateralOffset;

  return {
    id,
    isPlayer,
    driverName,
    driverNumber,
    teamName,
    teamColor,
    accentColor,
    x: posX,
    y: posY,
    vx: 0,
    vy: 0,
    speed: 0,
    angle: startPt.angle,
    steerAngle: 0,
    targetAngle: startPt.angle,
    angularVelocity: 0,
    trackDistance: startDist,
    lap: 0,
    currentSector: 1,
    sectorTimes: [0, 0, 0],
    currentLapTime: 0,
    bestLapTime: null,
    lastLapTime: null,
    totalRaceTime: 0,
    finished: false,
    finishPosition: null,
    drsAvailable: false,
    drsActive: false,
    ersBattery: 100,
    tireCompound,
    tireWear: 0,
    isBraking: false,
    isOffTrack: false,
    slipstreamActive: false,
    aiTargetOffset: (gridPosition % 2 === 0 ? -0.3 : 0.3),
    aiAggressionTimer: Math.random() * 5,
    aiDefending: false,
    specs,
  };
}

export function updatePhysics(
  cars: CarState[],
  track: TrackData,
  playerControls: PlayerControls,
  deltaTime: number, // in seconds (e.g. 0.016)
  particles: Particle[],
  skidmarks: SkidMark[],
  totalLaps: number,
  aiProfiles: Map<string, AIDriverProfile>
): {
  leaderboard: CarState[];
  overtakesThisFrame: number;
  contactThisFrame: boolean;
  offTrackThisFrame: boolean;
} {
  let overtakesCount = 0;
  let contactOccurred = false;
  let playerOffTrack = false;

  // Sort cars by total progression to evaluate gaps & DRS eligibility
  const sortedByRaceDistance = [...cars].sort((a, b) => {
    const distA = a.lap * track.totalLength + a.trackDistance;
    const distB = b.lap * track.totalLength + b.trackDistance;
    return distB - distA;
  });

  cars.forEach((car) => {
    if (car.finished) {
      // Slow down finished car smoothly
      car.speed = Math.max(car.speed - 120 * deltaTime, 0);
      car.vx = Math.cos(car.angle) * (car.speed / 3.6);
      car.vy = Math.sin(car.angle) * (car.speed / 3.6);
      car.x += car.vx * deltaTime;
      car.y += car.vy * deltaTime;
      return;
    }

    car.totalRaceTime += deltaTime;
    car.currentLapTime += deltaTime;

    // Track position lookup
    const { point: closestPt, distToCenter } = getClosestTrackPoint(track, car.x, car.y);
    const previousTrackDist = car.trackDistance;
    car.trackDistance = closestPt.distance;
    car.currentSector = closestPt.sector;

    // Check if off-track (outside track width / 2)
    const halfWidth = (closestPt.width / 2);
    const wasOff = car.isOffTrack;
    car.isOffTrack = distToCenter > halfWidth;

    if (car.isPlayer && car.isOffTrack) {
      playerOffTrack = true;
      if (!wasOff) {
        // Kick up gravel dust particles
        for (let i = 0; i < 4; i++) {
          particles.push({
            x: car.x + (Math.random() - 0.5) * 20,
            y: car.y + (Math.random() - 0.5) * 20,
            vx: -Math.cos(car.angle) * 30 + (Math.random() - 0.5) * 20,
            vy: -Math.sin(car.angle) * 30 + (Math.random() - 0.5) * 20,
            life: 0.6,
            maxLife: 0.6,
            color: '#B5885C', // dust/gravel color
            size: Math.random() * 5 + 3,
          });
        }
      }
    }

    // Evaluate DRS Eligibility
    // In F1, car must be in DRS Zone and within 1.0 second behind the car ahead
    const carRank = sortedByRaceDistance.findIndex((c) => c.id === car.id);
    let canUseDRS = false;
    if (closestPt.isDRSZone && carRank > 0) {
      const carAhead = sortedByRaceDistance[carRank - 1];
      const gapMeters = (carAhead.lap * track.totalLength + carAhead.trackDistance) - (car.lap * track.totalLength + car.trackDistance);
      // Roughly within 60 meters (~1 second gap at 200+ km/h)
      if (gapMeters > 5 && gapMeters < 95) {
        canUseDRS = true;
      }
    }
    car.drsAvailable = canUseDRS;

    // Evaluate Slipstream / Tow effect
    let slipstream = false;
    if (carRank > 0) {
      const carAhead = sortedByRaceDistance[carRank - 1];
      const dx = carAhead.x - car.x;
      const dy = carAhead.y - car.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 25 && dist < 130) {
        // Check if car is directly behind
        const angleToAhead = Math.atan2(dy, dx);
        let angleDiff = Math.abs(car.angle - angleToAhead);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (Math.abs(angleDiff) < 0.35) {
          slipstream = true;
        }
      }
    }
    car.slipstreamActive = slipstream;

    // PLAYER CAR PHYSICS
    if (car.isPlayer) {
      car.isBraking = playerControls.brake;

      // DRS toggle
      if (playerControls.drs && car.drsAvailable) {
        car.drsActive = true;
      } else {
        car.drsActive = false;
      }

      // Max top speed with DRS & slipstream bonuses
      let maxSpeed = car.specs.topSpeed;
      if (car.drsActive) maxSpeed += car.specs.drsBoost;
      if (car.slipstreamActive) maxSpeed += 12;

      // Off-track penalty
      if (car.isOffTrack) {
        maxSpeed = Math.min(maxSpeed, 140);
      }

      // Steering with progressive response & high-speed downforce stability
      let steerInput = 0;
      if (playerControls.steerLeft) steerInput -= 1;
      if (playerControls.steerRight) steerInput += 1;

      // Speed-dependent steering curve: High responsiveness in corners, stable on straights
      const speedKmH = car.speed;
      const minSpeedFactor = Math.min(Math.max(speedKmH / 30, 0.42), 1.0);
      const highSpeedStability = 1.0 / (1.0 + Math.max(speedKmH - 180, 0) * 0.0018);
      const turnRate = (3.15 * car.specs.corneringGrip * minSpeedFactor * highSpeedStability) * deltaTime;
      car.angle += steerInput * turnRate;

      // Smooth front wheel steering angle (max ~28 degrees = 0.48 rad)
      const targetSteerAngle = steerInput * 0.48;
      car.steerAngle += (targetSteerAngle - car.steerAngle) * Math.min(deltaTime * 20, 1.0);

      // Titanium floor block sparks on high downforce cornering or braking
      if ((car.speed > 220 && Math.abs(steerInput) > 0.4) || (car.speed > 270 && Math.random() < 0.25)) {
        for (let s = 0; s < 2; s++) {
          particles.push({
            x: car.x - Math.cos(car.angle) * 22 + (Math.random() - 0.5) * 6,
            y: car.y - Math.sin(car.angle) * 22 + (Math.random() - 0.5) * 6,
            vx: -Math.cos(car.angle) * (50 + Math.random() * 50) + (Math.random() - 0.5) * 30,
            vy: -Math.sin(car.angle) * (50 + Math.random() * 50) + (Math.random() - 0.5) * 30,
            life: 0.22,
            maxLife: 0.22,
            color: '#FFB800',
            size: Math.random() * 3.5 + 1.5,
          });
        }
      }

      // Acceleration & Braking (F1 1000+ HP instant hybrid electric torque punch)
      if (playerControls.throttle && !playerControls.brake) {
        // Power curve: fierce low-end electric torque plus ferocious high-rev V6 turbo boost
        const accelForce = (car.specs.acceleration * 58) * (1 - car.speed / (maxSpeed * 1.12));
        car.speed += accelForce * deltaTime;
        if (car.speed > maxSpeed) {
          car.speed = Math.max(car.speed - 30 * deltaTime, maxSpeed);
        }
      } else if (playerControls.brake) {
        // Heavy carbon-ceramic braking
        const brakeDecel = (car.specs.brakingPower * 42) * deltaTime;
        car.speed = Math.max(car.speed - brakeDecel, 0);

        // Braking skidmarks & smoke
        if (car.speed > 130) {
          skidmarks.push({
            x1: car.x - Math.cos(car.angle) * 15,
            y1: car.y - Math.sin(car.angle) * 15,
            x2: car.x,
            y2: car.y,
            alpha: 0.6,
          });
          if (Math.random() < 0.4) {
            particles.push({
              x: car.x - Math.cos(car.angle) * 18,
              y: car.y - Math.sin(car.angle) * 18,
              vx: (Math.random() - 0.5) * 15,
              vy: (Math.random() - 0.5) * 15,
              life: 0.35,
              maxLife: 0.35,
              color: 'rgba(230, 230, 230, 0.7)',
              size: 4 + Math.random() * 3,
            });
          }
        }
      } else {
        // Rolling resistance / engine drag
        const drag = (car.isOffTrack ? 140 : 38) * deltaTime;
        car.speed = Math.max(car.speed - drag, 0);
      }

      // Lateral slip & grip calculation with calibrated 1.35x world speed scale
      // This converts km/h into screen-world velocity that feels blazingly fast
      const SPEED_SCALE = 1.35;
      const speedMs = (car.speed / 3.6) * SPEED_SCALE;
      car.vx = Math.cos(car.angle) * speedMs;
      car.vy = Math.sin(car.angle) * speedMs;

      car.x += car.vx * deltaTime;
      car.y += car.vy * deltaTime;

    } else {
      // AI CAR SIMULATION
      const profile = aiProfiles.get(car.id);
      const skill = profile?.skill || 0.95;
      const aggression = profile?.aggression || 0.85;

      // Predict target point ahead on track
      const lookaheadDistance = Math.max(45, car.speed * 0.45);
      const targetTrackPt = getTrackPointAtDistance(track, car.trackDistance + lookaheadDistance);

      // AI racing line lateral offset
      car.aiAggressionTimer -= deltaTime;
      if (car.aiAggressionTimer <= 0) {
        car.aiAggressionTimer = 2.0 + Math.random() * 3.0;
        // Shift line slightly to overtake or defend
        car.aiTargetOffset = (Math.random() - 0.5) * 0.6 * aggression;
      }

      const lateralDisplacement = car.aiTargetOffset * (targetTrackPt.width * 0.35);
      const normX = -Math.sin(targetTrackPt.angle);
      const normY = Math.cos(targetTrackPt.angle);
      const targetWorldX = targetTrackPt.x + normX * lateralDisplacement;
      const targetWorldY = targetTrackPt.y + normY * lateralDisplacement;

      // Calculate steering toward target
      const angleToTarget = Math.atan2(targetWorldY - car.y, targetWorldX - car.x);
      let steerAngleDiff = angleToTarget - car.angle;
      while (steerAngleDiff > Math.PI) steerAngleDiff -= Math.PI * 2;
      while (steerAngleDiff < -Math.PI) steerAngleDiff += Math.PI * 2;

      // Smooth steering response
      const steerSpeed = (3.5 * skill) * deltaTime;
      const appliedSteer = Math.max(-steerSpeed, Math.min(steerSpeed, steerAngleDiff));
      car.angle += appliedSteer;
      car.steerAngle = Math.max(-0.45, Math.min(0.45, steerAngleDiff * 1.5));

      // Calculate safe cornering speed based on upcoming curvature
      // Real F1 cars slow down before sharp corners
      let maxCornerSpeed = 340;
      if (targetTrackPt.curvature > 0.005) {
        maxCornerSpeed = 160 + (1 - targetTrackPt.curvature * 120) * 80;
      } else if (targetTrackPt.curvature > 0.002) {
        maxCornerSpeed = 230;
      }
      maxCornerSpeed *= skill;

      // AI DRS usage
      if (car.drsAvailable && Math.random() < 0.9) {
        car.drsActive = true;
        maxCornerSpeed += car.specs.drsBoost;
      } else {
        car.drsActive = false;
      }

      // Throttle / Brake
      if (car.speed < maxCornerSpeed) {
        car.isBraking = false;
        const accelForce = (car.specs.acceleration * 52 * skill) * (1 - car.speed / 360);
        car.speed = Math.min(car.speed + accelForce * deltaTime, maxCornerSpeed);
      } else {
        car.isBraking = true;
        const brakeForce = (car.specs.brakingPower * 36) * deltaTime;
        car.speed = Math.max(car.speed - brakeForce, maxCornerSpeed);
      }

      const SPEED_SCALE = 1.35;
      const speedMs = (car.speed / 3.6) * SPEED_SCALE;
      car.vx = Math.cos(car.angle) * speedMs;
      car.vy = Math.sin(car.angle) * speedMs;

      car.x += car.vx * deltaTime;
      car.y += car.vy * deltaTime;
    }

    // Lap counting & Finish detection
    // Detect crossing start/finish line (distance wraps from ~totalLength to 0)
    if (closestPt.distance < 200 && previousTrackDist > track.totalLength - 380) {
      car.lap += 1;
      car.lastLapTime = car.currentLapTime;
      if (car.bestLapTime === null || car.currentLapTime < car.bestLapTime) {
        car.bestLapTime = car.currentLapTime;
      }
      car.currentLapTime = 0;

      if (car.lap >= totalLaps && !car.finished) {
        car.finished = true;
        // Count how many have finished before
        const finishedCount = cars.filter((c) => c.finished).length;
        car.finishPosition = finishedCount;
      }
    }
  });

  // CAR-TO-CAR COLLISIONS & SPARK PARTICLES
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const c1 = cars[i];
      const c2 = cars[j];

      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const dist = Math.hypot(dx, dy);
      const minDistance = 24; // collision radius

      if (dist < minDistance && dist > 0.001) {
        if (c1.isPlayer || c2.isPlayer) {
          contactOccurred = true;
        }

        // Push apart
        const overlap = (minDistance - dist) * 0.5;
        const nx = dx / dist;
        const ny = dy / dist;

        c1.x -= nx * overlap;
        c1.y -= ny * overlap;
        c2.x += nx * overlap;
        c2.y += ny * overlap;

        // Equalize some speed & add slight deflection
        const avgSpeed = (c1.speed + c2.speed) * 0.48;
        c1.speed = avgSpeed;
        c2.speed = avgSpeed;

        // Titanium skid plate sparks
        for (let k = 0; k < 3; k++) {
          particles.push({
            x: (c1.x + c2.x) / 2,
            y: (c1.y + c2.y) / 2,
            vx: (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 60,
            life: 0.25,
            maxLife: 0.25,
            color: '#FFB800',
            size: Math.random() * 3 + 2,
          });
        }
      }
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    p.life -= deltaTime;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Fade skidmarks
  for (let i = skidmarks.length - 1; i >= 0; i--) {
    const sm = skidmarks[i];
    sm.alpha -= deltaTime * 0.05;
    if (sm.alpha <= 0) {
      skidmarks.splice(i, 1);
    }
  }
  if (skidmarks.length > 250) {
    skidmarks.splice(0, skidmarks.length - 250);
  }

  // Compute live leaderboard (P1 to P22)
  const leaderboard = [...cars].sort((a, b) => {
    // If finished, rank by finish position
    if (a.finished && b.finished) {
      return (a.finishPosition || 99) - (b.finishPosition || 99);
    }
    if (a.finished) return -1;
    if (b.finished) return 1;

    // By total completed distance
    const totalDistA = a.lap * track.totalLength + a.trackDistance;
    const totalDistB = b.lap * track.totalLength + b.trackDistance;
    return totalDistB - totalDistA;
  });

  return {
    leaderboard,
    overtakesThisFrame: overtakesCount,
    contactThisFrame: contactOccurred,
    offTrackThisFrame: playerOffTrack,
  };
}
