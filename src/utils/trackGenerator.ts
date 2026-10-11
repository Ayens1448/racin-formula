import { TrackCategory, TrackData, TrackPoint, DRSZone, Vector2D, PlayerDrivingDNA } from '../types/game';

interface GenerationConfig {
  numBasePoints: number;
  radiusBase: number;
  noiseScale: number;
  chicaneCount: number;
  hairpinCount: number;
  straightLengthBonus: number;
  trackWidth: number;
}

const COUNTRY_FLAGS: Record<string, { country: string; flag: string; baseName: string }> = {
  ITA: { country: 'Italy', flag: '🇮🇹', baseName: 'Autodromo Nazionale' },
  GBR: { country: 'Great Britain', flag: '🇬🇧', baseName: 'Silverstone Grand Prix' },
  MON: { country: 'Monaco', flag: '🇲🇨', baseName: 'Circuit de Monte Carlo' },
  BEL: { country: 'Belgium', flag: '🇧🇪', baseName: 'Circuit de Spa-Francorchamps' },
  JPN: { country: 'Japan', flag: '🇯🇵', baseName: 'Suzuka International' },
  USA: { country: 'United States', flag: '🇺🇸', baseName: 'Circuit of the Americas' },
  BRA: { country: 'Brazil', flag: '🇧🇷', baseName: 'Autódromo José Carlos Pace' },
  CAN: { country: 'Canada', flag: '🇨🇦', baseName: 'Circuit Gilles Villeneuve' },
  ESP: { country: 'Spain', flag: '🇪🇸', baseName: 'Circuit de Barcelona-Catalunya' },
  SGP: { country: 'Singapore', flag: '🇸🇬', baseName: 'Marina Bay Street Circuit' },
  NED: { country: 'Netherlands', flag: '🇳🇱', baseName: 'Circuit Zandvoort' },
};

export function generateProceduralTrack(
  category: TrackCategory,
  seed: number = Math.random(),
  playerDNA?: PlayerDrivingDNA
): TrackData {
  let effectiveCategory = category;
  let adaptationReason: string | undefined = undefined;

  // If ADAPTIVE category or player DNA is available, customize based on learned driving style
  let config: GenerationConfig;

  if (category === 'ADAPTIVE' && playerDNA) {
    adaptationReason = playerDNA.lastLearnedNote;
    const diff = Math.min(Math.max(playerDNA.aiAdaptationLevel, 1), 10);
    
    // Customize layout to challenge player's specific weakness
    if (playerDNA.playerWeakness === 'CHICANES') {
      config = {
        numBasePoints: 16 + Math.floor(diff * 0.4),
        radiusBase: 1400,
        noiseScale: 400,
        chicaneCount: 3 + Math.floor(diff / 3),
        hairpinCount: 2,
        straightLengthBonus: 1.0,
        trackWidth: 260 - diff * 4, // noticeably wider, allowing 3-wide F1 battles
      };
    } else if (playerDNA.playerWeakness === 'HAIRPINS' || playerDNA.playerWeakness === 'BRAKING_ZONES') {
      config = {
        numBasePoints: 14 + Math.floor(diff * 0.3),
        radiusBase: 1450,
        noiseScale: 440,
        chicaneCount: 1,
        hairpinCount: 3 + Math.floor(diff / 3),
        straightLengthBonus: 1.35, // longer straights into heavy braking zones
        trackWidth: 270,
      };
    } else if (playerDNA.corneringMastery < 50) {
      // Player struggles with cornering mastery -> add varied radius corners
      config = {
        numBasePoints: 17,
        radiusBase: 1350,
        noiseScale: 460,
        chicaneCount: 2,
        hairpinCount: 2,
        straightLengthBonus: 1.0,
        trackWidth: 265,
      };
    } else {
      // High-skilled player -> intricate high-downforce technical layout
      config = {
        numBasePoints: 18,
        radiusBase: 1500,
        noiseScale: 480,
        chicaneCount: 3,
        hairpinCount: 2,
        straightLengthBonus: 1.2,
        trackWidth: 260,
      };
    }
  } else {
    // Standard profile categories
    switch (effectiveCategory) {
      case 'TEMPLE_OF_SPEED':
        config = {
          numBasePoints: 12,
          radiusBase: 1550,
          noiseScale: 300,
          chicaneCount: 2,
          hairpinCount: 1,
          straightLengthBonus: 1.6,
          trackWidth: 290, // Grand prix mega-wide autodrome
        };
        break;
      case 'STREET_CIRCUIT':
        config = {
          numBasePoints: 20,
          radiusBase: 1300,
          noiseScale: 460,
          chicaneCount: 3,
          hairpinCount: 3,
          straightLengthBonus: 0.8,
          trackWidth: 240, // Wider modern street circuit (Baku / Vegas style)
        };
        break;
      case 'TECHNICAL_FLOW':
        config = {
          numBasePoints: 16,
          radiusBase: 1450,
          noiseScale: 400,
          chicaneCount: 2,
          hairpinCount: 2,
          straightLengthBonus: 1.1,
          trackWidth: 275,
        };
        break;
      case 'ROLLERCOASTER':
        config = {
          numBasePoints: 15,
          radiusBase: 1500,
          noiseScale: 460,
          chicaneCount: 2,
          hairpinCount: 2,
          straightLengthBonus: 1.3,
          trackWidth: 280,
        };
        break;
      case 'ADAPTIVE':
      default:
        config = {
          numBasePoints: 15,
          radiusBase: 1450,
          noiseScale: 380,
          chicaneCount: 2,
          hairpinCount: 2,
          straightLengthBonus: 1.15,
          trackWidth: 270,
        };
        break;
    }
  }

  // Generate randomized polygon points around an ellipse
  const basePoints: Vector2D[] = [];
  const N = config.numBasePoints;
  const angleStep = (Math.PI * 2) / N;

  // Use pseudo-random generator with seed
  let pseudo = (seed * 9301 + 49297) % 233280;
  const rnd = () => {
    pseudo = (pseudo * 9301 + 49297) % 233280;
    return pseudo / 233280;
  };

  // Build irregular closed loop
  for (let i = 0; i < N; i++) {
    const angle = i * angleStep;
    // Vary radius with perlin-like harmonic variation
    const rVar = Math.sin(angle * 2.0) * 150 + Math.cos(angle * 3.0) * 90;
    const noise = (rnd() - 0.5) * config.noiseScale;
    let r = config.radiusBase + rVar + noise;

    // Keep start-finish straight (around angle 0) elongated and clean
    if (i === 0 || i === N - 1 || i === 1) {
      r = config.radiusBase * config.straightLengthBonus;
    }

    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * (r * 0.72); // slightly elliptical for natural race track shape
    basePoints.push({ x, y });
  }

  // Smooth control points using Catmull-Rom spline interpolation
  const interpolatedPoints: Vector2D[] = [];
  const samplesPerSegment = 28;

  for (let i = 0; i < N; i++) {
    const p0 = basePoints[(i - 1 + N) % N];
    const p1 = basePoints[i];
    const p2 = basePoints[(i + 1) % N];
    const p3 = basePoints[(i + 2) % N];

    for (let t = 0; t < samplesPerSegment; t++) {
      const u = t / samplesPerSegment;
      const u2 = u * u;
      const u3 = u2 * u;

      // Catmull-Rom formula
      const x = 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * u +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3
      );

      const y = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * u +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3
      );

      interpolatedPoints.push({ x, y });
    }
  }

  // Build TrackPoints with metrics (distance, angle, curvature, sectors)
  const trackPoints: TrackPoint[] = [];
  let totalLength = 0;
  const numPts = interpolatedPoints.length;

  for (let i = 0; i < numPts; i++) {
    const curr = interpolatedPoints[i];
    const next = interpolatedPoints[(i + 1) % numPts];
    const prev = interpolatedPoints[(i - 1 + numPts) % numPts];

    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const segDist = Math.hypot(dx, dy);

    const angle = Math.atan2(dy, dx);

    // Compute curvature from change of angle
    const prevAngle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    let angleDiff = angle - prevAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const curvature = Math.abs(angleDiff) / Math.max(segDist, 1);

    trackPoints.push({
      x: curr.x,
      y: curr.y,
      width: config.trackWidth,
      angle,
      curvature,
      distance: totalLength,
      sector: 1, // assigned below
      hasCurbs: curvature > 0.003, // sharp corners get curbs
    });

    totalLength += segDist;
  }

  // Assign sectors (Sector 1 = 0% to 33%, Sector 2 = 33% to 66%, Sector 3 = 66% to 100%)
  trackPoints.forEach((pt) => {
    const pct = pt.distance / totalLength;
    if (pct < 0.333) {
      pt.sector = 1;
    } else if (pct < 0.666) {
      pt.sector = 2;
    } else {
      pt.sector = 3;
    }
  });

  // Setup 2 DRS zones (on the fastest straights)
  // Find longest low-curvature segments
  const drsZones: DRSZone[] = [
    {
      detectionDist: totalLength * 0.88,
      startDist: totalLength * 0.94,
      endDist: totalLength * 0.16,
      name: 'Main Straight DRS (Zone 1)',
    },
    {
      detectionDist: totalLength * 0.44,
      startDist: totalLength * 0.49,
      endDist: totalLength * 0.62,
      name: 'Back Straight DRS (Zone 2)',
    },
  ];

  // Mark points inside DRS zones
  trackPoints.forEach((pt) => {
    let inDrs = false;
    for (const zone of drsZones) {
      if (zone.startDist < zone.endDist) {
        if (pt.distance >= zone.startDist && pt.distance <= zone.endDist) {
          inDrs = true;
        }
      } else {
        // Wraps around start/finish
        if (pt.distance >= zone.startDist || pt.distance <= zone.endDist) {
          inDrs = true;
        }
      }
    }
    pt.isDRSZone = inDrs;
  });

  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  trackPoints.forEach((pt) => {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  });

  // Profile analysis
  let sharpTurns = 0;
  let straights = 0;
  trackPoints.forEach((pt) => {
    if (pt.curvature > 0.004) sharpTurns++;
    else if (pt.curvature < 0.001) straights++;
  });

  const countryKeys = Object.keys(COUNTRY_FLAGS);
  const pickedCountry = COUNTRY_FLAGS[countryKeys[Math.floor(rnd() * countryKeys.length)]];
  const grandPrixNumber = Math.floor(rnd() * 80) + 1;
  const trackName = `${pickedCountry.baseName} GP #${grandPrixNumber}`;

  return {
    id: `track_${Date.now()}_${Math.floor(rnd() * 1000)}`,
    name: trackName,
    country: pickedCountry.country,
    flag: pickedCountry.flag,
    category: effectiveCategory,
    points: trackPoints,
    totalLength,
    drsZones,
    startPosition: { x: trackPoints[0].x, y: trackPoints[0].y },
    startAngle: trackPoints[0].angle,
    bounds: {
      minX: minX - 300,
      maxX: maxX + 300,
      minY: minY - 300,
      maxY: maxY + 300,
    },
    difficultyScore: Math.round(5 + (sharpTurns / (trackPoints.length || 1)) * 40),
    curvatureProfile: {
      sharpTurns,
      straights,
      chicanes: config.chicaneCount,
      avgSpeedRating: Math.round(230 + (straights / (trackPoints.length || 1)) * 100),
    },
    adaptationReason,
  };
}

/**
 * Finds the closest track point to a world coordinate (x, y)
 */
export function getClosestTrackPoint(track: TrackData, x: number, y: number): { point: TrackPoint; index: number; distToCenter: number } {
  let closest = track.points[0];
  let closestIdx = 0;
  let minDistSq = Infinity;

  // Step through points for speed
  for (let i = 0; i < track.points.length; i += 2) {
    const pt = track.points[i];
    const dSq = (pt.x - x) ** 2 + (pt.y - y) ** 2;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      closest = pt;
      closestIdx = i;
    }
  }

  return {
    point: closest,
    index: closestIdx,
    distToCenter: Math.sqrt(minDistSq),
  };
}

/**
 * Interpolates a position along the track distance
 */
export function getTrackPointAtDistance(track: TrackData, targetDist: number): TrackPoint {
  let d = targetDist % track.totalLength;
  if (d < 0) d += track.totalLength;

  // Binary search or linear scan
  const pts = track.points;
  let low = 0;
  let high = pts.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (pts[mid].distance < d) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const idx = Math.min(Math.max(low, 0), pts.length - 1);
  return pts[idx];
}
