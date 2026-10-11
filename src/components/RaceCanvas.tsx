import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TrackData, CarState, AIDriverProfile, PlayerDrivingDNA, CameraMode } from '../types/game';
import { PlayerControls, Particle, SkidMark, updatePhysics } from '../game/physics';
import { sound } from '../utils/audio';
import { getClosestTrackPoint } from '../utils/trackGenerator';

interface RaceCanvasProps {
  track: TrackData;
  cars: CarState[];
  aiProfiles: Map<string, AIDriverProfile>;
  playerDNA: PlayerDrivingDNA;
  totalLaps: number;
  cameraMode: CameraMode;
  onRaceFinish: (leaderboard: CarState[], telemetry: {
    overtakes: number;
    offTrackCount: number;
    avgApexRatio: number;
    brakingLateCount: number;
    drsUsageCount: number;
    hadContact: boolean;
  }) => void;
  onUpdateLeaderboard: (leaderboard: CarState[]) => void;
  onUpdatePlayerCar: (player: CarState) => void;
  controlsState: PlayerControls;
}

export const RaceCanvas: React.FC<RaceCanvasProps> = ({
  track,
  cars,
  aiProfiles,
  totalLaps,
  cameraMode,
  onRaceFinish,
  onUpdateLeaderboard,
  onUpdatePlayerCar,
  controlsState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Start Light Countdown sequence: 0 (pending), 1-5 (red lights), 6 (LIGHTS OUT!), 7 (racing)
  const [startLights, setStartLights] = useState<number>(0);
  const [isRacing, setIsRacing] = useState<boolean>(false);

  // Smooth camera state ref for Monoposto-style interpolated follow cam
  const camRef = useRef<{
    angle: number;
    x: number;
    y: number;
    zoom: number;
    apexLookAhead: number;
    initialized: boolean;
  }>({
    angle: 0,
    x: 0,
    y: 0,
    zoom: 1.0,
    apexLookAhead: 0,
    initialized: false,
  });

  // Telemetry trackers for driving analysis
  const telemetryRef = useRef({
    overtakes: 0,
    offTrackCount: 0,
    brakingLateCount: 0,
    drsUsageCount: 0,
    hadContact: false,
    lastPlayerRank: 22,
    finishedReported: false,
  });

  // Start sequence effect
  useEffect(() => {
    sound.startEngine();
    let currentLight = 0;
    const interval = setInterval(() => {
      currentLight++;
      if (currentLight <= 5) {
        setStartLights(currentLight);
        sound.playStartBeep(false);
      } else if (currentLight === 6) {
        setStartLights(6);
        sound.playStartBeep(true);
        setIsRacing(true);
        clearInterval(interval);
      }
    }, 850);

    return () => {
      clearInterval(interval);
      sound.stopEngine();
    };
  }, []);

  /**
   * Draw Aggressive 2024/2026 Ground-Effect F1 Car (Top-Down / World View)
   */
  const drawF1Car = useCallback((
    ctx: CanvasRenderingContext2D,
    car: CarState,
    isPlayer: boolean
  ) => {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // 0. Ambient Ground Effect Downforce Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(-28, -20, 58, 40, 8);
    ctx.fill();

    const compoundColor =
      car.tireCompound === 'SOFT'
        ? '#EF4444' // Pirelli Red
        : car.tireCompound === 'HARD'
        ? '#FFFFFF' // Pirelli White
        : '#FACC15'; // Pirelli Yellow

    // Helper: Draw detailed open-wheel tire with rim cover and compound ring
    const drawTire = (
      x: number,
      y: number,
      width: number,
      height: number,
      steer: number = 0,
      isRear: boolean = false
    ) => {
      ctx.save();
      ctx.translate(x, y);
      if (steer !== 0) ctx.rotate(steer);

      // Tire tread (Matte dark vulcanized rubber)
      ctx.fillStyle = '#141416';
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, 2.5);
      ctx.fill();

      // Tire sidewall compound stripe (Pirelli colors)
      ctx.strokeStyle = compoundColor;
      ctx.lineWidth = 1.3;
      ctx.strokeRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2);

      // Carbon-fiber aerodynamic wheel rim cover
      ctx.fillStyle = '#1C1C20';
      ctx.fillRect(-width / 2 + 2.5, -height / 2 + 2, width - 5, height - 4);

      // Center lock nut
      ctx.fillStyle = car.accentColor || '#E4E4E7';
      ctx.beginPath();
      ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Carbon-Ceramic Brake Disc (under heavy braking!)
      if (car.isBraking && car.speed > 70) {
        ctx.fillStyle = 'rgba(255, 95, 20, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Heat glow halo
        ctx.strokeStyle = 'rgba(255, 150, 40, 0.6)';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      ctx.restore();
    };

    // 1. Carbon-Fiber Exposed Suspension Double Wishbones
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    // Front suspension
    ctx.moveTo(15, -6); ctx.lineTo(17, -18);
    ctx.moveTo(9, -6);  ctx.lineTo(17, -18);
    ctx.moveTo(15, 6);  ctx.lineTo(17, 18);
    ctx.moveTo(9, 6);   ctx.lineTo(17, 18);
    // Rear suspension
    ctx.moveTo(-12, -7); ctx.lineTo(-19, -18);
    ctx.moveTo(-17, -7); ctx.lineTo(-19, -18);
    ctx.moveTo(-12, 7);  ctx.lineTo(-19, 18);
    ctx.moveTo(-17, 7);  ctx.lineTo(-19, 18);
    ctx.stroke();

    // 2. Four Open Wheels (Front steer dynamically!)
    drawTire(-19, -18, 15, 8.5, 0, true);
    drawTire(-19, 18, 15, 8.5, 0, true);

    const frontSteer = car.steerAngle || 0;
    drawTire(17, -18, 13.5, 7.5, frontSteer);
    drawTire(17, 18, 13.5, 7.5, frontSteer);

    // 3. Multi-Element Aggressive Front Wing (2024/2026 Ground Effect Specs)
    // Main front plane
    ctx.fillStyle = car.accentColor || '#18181B';
    ctx.beginPath();
    ctx.roundRect(23, -20, 6.5, 40, 2);
    ctx.fill();

    // Outwash endplates with vortex fins
    ctx.fillStyle = car.teamColor;
    ctx.fillRect(21, -21.5, 10, 2.8);
    ctx.fillRect(21, 18.7, 10, 2.8);

    // Front wing cascade flaps
    ctx.fillStyle = '#27272A';
    ctx.fillRect(25, -18, 2.2, 36);

    // Sharp Aerodynamic Tapered Nosecone
    ctx.fillStyle = car.teamColor;
    ctx.beginPath();
    ctx.moveTo(29, 0); // sharp nose tip
    ctx.lineTo(15, -6.5);
    ctx.lineTo(-5, -8.5);
    ctx.lineTo(-5, 8.5);
    ctx.lineTo(15, 6.5);
    ctx.closePath();
    ctx.fill();

    // Nosecone FIA camera pods
    ctx.fillStyle = '#18181B';
    ctx.fillRect(23, -5, 3.5, 1.6);
    ctx.fillRect(23, 3.4, 3.5, 1.6);

    // 4. Ground-Effect Venturi Floor Edge with Louvres
    ctx.fillStyle = '#111113';
    ctx.beginPath();
    ctx.roundRect(-18, -14, 28, 28, 2);
    ctx.fill();

    // Floor edge vortex generator louvres
    ctx.fillStyle = '#3F3F46';
    for (let lx = -14; lx <= 6; lx += 4) {
      ctx.fillRect(lx, -14.5, 2, 1);
      ctx.fillRect(lx, 13.5, 2, 1);
    }

    // Sculpted Undercut Sidepods (Shark-Gills aesthetic)
    ctx.fillStyle = car.teamColor;
    // Left sidepod
    ctx.beginPath();
    ctx.moveTo(11, -7.5);
    ctx.lineTo(9, -13);
    ctx.lineTo(-13, -12);
    ctx.lineTo(-19, -8.5);
    ctx.lineTo(-19, -5.5);
    ctx.lineTo(11, -5.5);
    ctx.closePath();
    ctx.fill();

    // Right sidepod
    ctx.beginPath();
    ctx.moveTo(11, 7.5);
    ctx.lineTo(9, 13);
    ctx.lineTo(-13, 12);
    ctx.lineTo(-19, 8.5);
    ctx.lineTo(-19, 5.5);
    ctx.lineTo(11, 5.5);
    ctx.closePath();
    ctx.fill();

    // Sidepod cooling louvres / gills
    ctx.fillStyle = '#09090B';
    for (let g = -8; g <= 4; g += 3) {
      ctx.fillRect(g, -11, 1.8, 4);
      ctx.fillRect(g, 7, 1.8, 4);
    }

    // Radiator inlet openings (Dark black mesh)
    ctx.fillStyle = '#050507';
    ctx.fillRect(8, -12, 2.8, 5.5);
    ctx.fillRect(8, 6.5, 2.8, 5.5);

    // 5. Cockpit Opening, Helmet, Visor & Titanium Halo
    ctx.fillStyle = '#09090B';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.5, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Driver Helmet & Head Tilt (tilts slightly into apex!)
    const headTilt = (car.steerAngle || 0) * 0.35;
    ctx.save();
    ctx.translate(-0.5, 0);
    ctx.rotate(headTilt);

    ctx.fillStyle = isPlayer ? '#FACC15' : car.accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();

    // Dark Visor with reflection
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(1.2, 0, 2.4, -Math.PI * 0.38, Math.PI * 0.38);
    ctx.fill();
    ctx.restore();

    // Titanium Halo Protection Arch
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(1.5, 0, 6.2, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();

    // Halo center pylon
    ctx.strokeStyle = '#18181B';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(8.5, 0);
    ctx.stroke();

    // Airbox Scoop & T-Camera Pod
    ctx.fillStyle = isPlayer ? '#FACC15' : '#18181B';
    ctx.fillRect(-6.5, -2, 3.8, 4);

    // 6. Engine Cover Dorsal Shark Fin
    ctx.fillStyle = car.teamColor;
    ctx.beginPath();
    ctx.moveTo(-6.5, -1);
    ctx.lineTo(-22, -0.6);
    ctx.lineTo(-22, 0.6);
    ctx.lineTo(-6.5, 1);
    ctx.closePath();
    ctx.fill();

    // Driver Racing Number
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(car.driverNumber), -13, 0);

    // 7. Swan-Neck Aggressive Rear Wing with VISIBLE DRS FLAP ANIMATION!
    ctx.fillStyle = car.teamColor;
    ctx.fillRect(-28, -18, 3.5, 36); // Wing endplates

    if (car.drsActive) {
      // DRS OPEN: Flap flips open wide with neon green actuator glow!
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(-25.5, -15, 2.2, 30);
      ctx.fillStyle = '#4ADE80';
      ctx.fillRect(-23.5, -13, 1.4, 26);

      // DRS Green LED Actuator Light
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(-26, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // DRS CLOSED: Solid aggressive wing plane
      ctx.fillStyle = car.accentColor || '#18181B';
      ctx.fillRect(-26.5, -16, 5, 32);
    }

    // Rear Diffuser aerodynamic strakes
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-24, -6.5, 4.5, 13);

    // 8. Flashing FIA Rear Rain / Safety LED Light
    const isFlashing = car.isBraking || Math.floor(Date.now() / 150) % 2 === 0;
    if (isFlashing) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(-28.5, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
      ctx.beginPath();
      ctx.arc(-28.5, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Highlight Beacon
    if (isPlayer) {
      ctx.strokeStyle = '#FACC15';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-30, -22, 60, 44);
    }

    ctx.restore();
  }, []);

  /**
   * Draw Track with Monoposto 3D Kerbs & Dynamic Racing Line with Braking Zones
   */
  const drawTrack = useCallback((
    ctx: CanvasRenderingContext2D,
    track: TrackData
  ) => {
    const pts = track.points;
    const len = pts.length;
    if (len < 3) return;

    // 1. Raked Gravel Trap Layer
    ctx.lineWidth = pts[0].width + 95;
    ctx.strokeStyle = '#3D342B'; // Rich gravel brown
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < len; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // 2. Astro-Turf Green Runoff Strip
    ctx.lineWidth = pts[0].width + 38;
    ctx.strokeStyle = '#155E38'; // Dark green astro-turf
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < len; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // 3. Monoposto 3D Sawtooth Beveled Kerbs (Apexes and Exits)
    ctx.lineWidth = pts[0].width + 22;
    for (let i = 0; i < len; i += 2) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % len];
      if (p1.hasCurbs) {
        ctx.strokeStyle = i % 4 === 0 ? '#DC2626' : '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // 4. Textured Circuit Asphalt Surface
    ctx.lineWidth = pts[0].width;
    ctx.strokeStyle = '#202227';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < len; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // 5. Heavy Rubbered Racing Line Groove
    ctx.lineWidth = pts[0].width * 0.48;
    ctx.strokeStyle = 'rgba(12, 13, 16, 0.55)';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < len; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // 6. MONOPOSTO DYNAMIC RACING LINE WITH BRAKING ZONES!
    // Green (Accelerate), Yellow (Lift/Coast), Glowing Red (Hard Braking before Apex)
    for (let i = 0; i < len; i += 3) {
      const p = pts[i];
      const pNext = pts[(i + 2) % len];

      // Evaluate upcoming corner severity within the next 15-25 points
      let maxUpcomingCurv = 0;
      let distToMaxCurv = 0;
      for (let k = 1; k <= 22; k++) {
        const lookPt = pts[(i + k) % len];
        if (lookPt.curvature > maxUpcomingCurv) {
          maxUpcomingCurv = lookPt.curvature;
          distToMaxCurv = k;
        }
      }

      let lineColor = 'rgba(34, 197, 94, 0.55)'; // Flat out Green
      let lineW = 3.2;

      if (maxUpcomingCurv > 0.0035) {
        // Heavy braking zone before sharp hairpin/chicane
        if (distToMaxCurv <= 10) {
          lineColor = 'rgba(239, 68, 68, 0.85)'; // Hard Brake Red!
          lineW = 4.2;
        } else if (distToMaxCurv <= 18) {
          lineColor = 'rgba(234, 179, 8, 0.75)'; // Lift / Coast Yellow!
          lineW = 3.6;
        }
      } else if (maxUpcomingCurv > 0.0022 && distToMaxCurv <= 12) {
        lineColor = 'rgba(234, 179, 8, 0.65)'; // Mild lift
      }

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(pNext.x, pNext.y);
      ctx.stroke();
    }

    // 7. Track Edge FIA White Boundary Lines
    const drawEdge = (offsetMult: number) => {
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#FAFAFA';
      ctx.beginPath();
      for (let i = 0; i < len; i++) {
        const p = pts[i];
        const nx = -Math.sin(p.angle);
        const ny = Math.cos(p.angle);
        const ex = p.x + nx * (p.width * 0.5 * offsetMult);
        const ey = p.y + ny * (p.width * 0.5 * offsetMult);
        if (i === 0) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.stroke();
    };
    drawEdge(1.0);
    drawEdge(-1.0);

    // 8. Distance Braking Boards (150m, 100m, 50m boards before heavy braking zones)
    for (let i = 0; i < len; i += 20) {
      const p = pts[i];
      if (p.curvature > 0.0035) {
        const boardDistances = [
          { offset: 24, label: '150' },
          { offset: 16, label: '100' },
          { offset: 8,  label: '50' },
        ];

        boardDistances.forEach(({ offset, label }) => {
          const boardPt = pts[(i - offset + len) % len];
          const nx = -Math.sin(boardPt.angle);
          const ny = Math.cos(boardPt.angle);
          const bx = boardPt.x + nx * (boardPt.width * 0.68);
          const by = boardPt.y + ny * (boardPt.width * 0.68);

          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(boardPt.angle);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-7, -4, 14, 8);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(-7, -4, 14, 8);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 6px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 0, 0);
          ctx.restore();
        });
      }
    }

    // 9. DRS Activation Zones (FIA Green Lines)
    track.drsZones.forEach((zone) => {
      const drsPt = pts.find((p) => Math.abs(p.distance - zone.startDist) < 35);
      if (drsPt) {
        ctx.save();
        ctx.translate(drsPt.x, drsPt.y);
        ctx.rotate(drsPt.angle);
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(-3, -drsPt.width / 2, 6, drsPt.width);
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#22C55E';
        ctx.fillText('DRS >>', 14, -drsPt.width / 2 - 8);
        ctx.restore();
      }
    });

    // 10. Start / Finish Line (Official Checkered Pattern & Gantry)
    const startPt = pts[0];
    ctx.save();
    ctx.translate(startPt.x, startPt.y);
    ctx.rotate(startPt.angle);
    const w = startPt.width;
    const numChecks = 18;
    const checkH = w / numChecks;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < numChecks; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#FFFFFF' : '#111111';
        ctx.fillRect(row * 8 - 8, -w / 2 + col * checkH, 8, checkH);
      }
    }
    ctx.restore();
  }, []);

  /**
   * Draw Minimap Overlay
   */
  const drawMinimap = useCallback((
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    track: TrackData,
    cars: CarState[]
  ) => {
    const mapW = 180;
    const mapH = 135;
    const pad = 16;
    const mapX = canvasW - mapW - pad;
    const mapY = pad;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapW, mapH, 8);
    ctx.fill();
    ctx.stroke();

    // Map Title
    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px monospace';
    ctx.fillText(`${track.flag} ${track.name}`, mapX + 8, mapY + 14);

    const bounds = track.bounds;
    const spanX = bounds.maxX - bounds.minX;
    const spanY = bounds.maxY - bounds.minY;
    const scale = Math.min((mapW - 24) / spanX, (mapH - 30) / spanY);
    const offsetX = mapX + 12 + ((mapW - 24) - spanX * scale) / 2;
    const offsetY = mapY + 20 + ((mapH - 30) - spanY * scale) / 2;

    const toMapX = (wx: number) => offsetX + (wx - bounds.minX) * scale;
    const toMapY = (wy: number) => offsetY + (wy - bounds.minY) * scale;

    // Track Outline
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    track.points.forEach((pt, i) => {
      const mx = toMapX(pt.x);
      const my = toMapY(pt.y);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    });
    ctx.closePath();
    ctx.stroke();

    // Cars on minimap
    cars.forEach((car) => {
      const mx = toMapX(car.x);
      const my = toMapY(car.y);

      if (car.isPlayer) {
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = car.teamColor || '#94A3B8';
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }, []);

  /**
   * First-Person Monoposto Driver Cockpit Rendering
   */
  const drawFirstPersonCockpit = (
    ctx: CanvasRenderingContext2D,
    viewW: number,
    viewH: number,
    playerCar: CarState,
    allCars: CarState[]
  ) => {
    ctx.save();
    const centerX = viewW / 2;
    const bottomY = viewH;
    const steerRot = (playerCar.steerAngle || 0) * 3.6;
    const brakeDip = playerCar.isBraking ? 10 : 0;

    // 1. Tapered Carbon Nosecone extending into the distance
    ctx.fillStyle = playerCar.teamColor;
    ctx.beginPath();
    ctx.moveTo(centerX - 45, bottomY - 140 + brakeDip);
    ctx.lineTo(centerX - 16, bottomY - 320 + brakeDip);
    ctx.lineTo(centerX + 16, bottomY - 320 + brakeDip);
    ctx.lineTo(centerX + 45, bottomY - 140 + brakeDip);
    ctx.closePath();
    ctx.fill();

    // Nosecone central ridge & sponsor stripe
    ctx.strokeStyle = playerCar.accentColor || '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX, bottomY - 140 + brakeDip);
    ctx.lineTo(centerX, bottomY - 315 + brakeDip);
    ctx.stroke();

    // Front Wing Endplates visible far ahead
    ctx.fillStyle = playerCar.teamColor;
    ctx.fillRect(centerX - 68, bottomY - 330 + brakeDip, 12, 16);
    ctx.fillRect(centerX + 56, bottomY - 330 + brakeDip, 12, 16);

    // Front Wheels turning in front of driver!
    const frontSteer = (playerCar.steerAngle || 0) * 1.5;
    const drawCockpitFrontWheel = (wx: number, wy: number) => {
      ctx.save();
      ctx.translate(wx, wy + brakeDip);
      ctx.rotate(frontSteer);
      ctx.fillStyle = '#141416';
      ctx.beginPath();
      ctx.roundRect(-9, -26, 18, 52, 4);
      ctx.fill();
      ctx.strokeStyle = playerCar.tireCompound === 'SOFT' ? '#EF4444' : playerCar.tireCompound === 'HARD' ? '#FFFFFF' : '#FACC15';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-8, -25, 16, 50);
      ctx.restore();
    };
    drawCockpitFrontWheel(centerX - 110, bottomY - 260);
    drawCockpitFrontWheel(centerX + 110, bottomY - 260);

    // 2. Titanium Halo Safety Arch
    // Central Pillar
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.moveTo(centerX - 6, bottomY - 100);
    ctx.lineTo(centerX - 10, bottomY - 275);
    ctx.lineTo(centerX + 10, bottomY - 275);
    ctx.lineTo(centerX + 6, bottomY - 100);
    ctx.closePath();
    ctx.fill();

    // Overhead Halo Hoop
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(centerX, bottomY - 275, 105, -Math.PI * 0.82, -Math.PI * 0.18);
    ctx.stroke();

    // 3. Dual Functional Rear-View Side Mirrors (Left & Right)
    const drawMirror = (mx: number, my: number, isLeft: boolean) => {
      ctx.save();
      ctx.translate(mx, my);

      // Mirror carbon casing
      ctx.fillStyle = '#18181B';
      ctx.strokeStyle = '#3F3F46';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(isLeft ? -45 : -5, -18, 50, 36, 6);
      ctx.fill();
      ctx.stroke();

      // Mirror reflective glass
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(isLeft ? -42 : -2, -15, 44, 30);

      // Render rearview track & trailing cars
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(isLeft ? -42 : -2, -6, 44, 21); // horizon road

      // Check trailing rivals behind player
      const trailingCars = allCars.filter((c) => !c.isPlayer && c.lap <= playerCar.lap);
      trailingCars.forEach((tc) => {
        const dx = tc.x - playerCar.x;
        const dy = tc.y - playerCar.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 15 && dist < 120) {
          // Inside mirror view
          const relX = (isLeft ? -20 : 20) + (dx * 0.08);
          ctx.fillStyle = tc.teamColor || '#EF4444';
          ctx.beginPath();
          ctx.roundRect(relX - 6, 2, 12, 8, 2);
          ctx.fill();
        }
      });

      // Mirror reflection sheen
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(isLeft ? -40 : 0, -12);
      ctx.lineTo(isLeft ? -10 : 35, 10);
      ctx.stroke();

      ctx.restore();
    };

    drawMirror(centerX - 125, bottomY - 170, true);
    drawMirror(centerX + 125, bottomY - 170, false);

    // 4. Formula 1 Butterfly Steering Wheel & Driver Racing Gloves
    const wheelY = bottomY - 40;
    ctx.save();
    ctx.translate(centerX, wheelY);
    ctx.rotate(steerRot);

    // Driver racing gloves gripped on sides
    ctx.fillStyle = '#27272A'; // Dark glove leather
    // Left hand
    ctx.beginPath();
    ctx.roundRect(-98, -32, 28, 64, 10);
    ctx.fill();
    ctx.fillStyle = playerCar.teamColor;
    ctx.fillRect(-94, -20, 6, 40); // Glove team accent stripe

    // Right hand
    ctx.fillStyle = '#27272A';
    ctx.beginPath();
    ctx.roundRect(70, -32, 28, 64, 10);
    ctx.fill();
    ctx.fillStyle = playerCar.teamColor;
    ctx.fillRect(88, -20, 6, 40);

    // Carbon fiber steering wheel body
    ctx.fillStyle = '#111113';
    ctx.beginPath();
    ctx.roundRect(-78, -48, 156, 96, 18);
    ctx.fill();

    // Ergonomic grips
    ctx.fillStyle = '#1E1E22';
    ctx.beginPath();
    ctx.roundRect(-82, -45, 22, 90, 8);
    ctx.roundRect(60, -45, 22, 90, 8);
    ctx.fill();

    // Central Digital OLED Display screen
    ctx.fillStyle = '#050508';
    ctx.fillRect(-42, -28, 84, 56);
    ctx.strokeStyle = '#3F3F46';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-42, -28, 84, 56);

    // LED Shift Lights across top of wheel
    const rpmRatio = Math.min(playerCar.speed / 340, 1.0);
    for (let i = 0; i < 11; i++) {
      const active = i / 11 <= rpmRatio;
      let ledColor = '#27272A';
      if (active) {
        ledColor = i < 4 ? '#10B981' : i < 8 ? '#EF4444' : '#A855F7';
      }
      ctx.fillStyle = ledColor;
      ctx.beginPath();
      ctx.arc(-35 + i * 7, -36, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // On-Wheel Gear & Speed readout
    ctx.fillStyle = '#FACC15';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const simulatedGear =
      playerCar.speed < 20 ? '1' :
      playerCar.speed < 90 ? '2' :
      playerCar.speed < 150 ? '3' :
      playerCar.speed < 210 ? '4' :
      playerCar.speed < 260 ? '5' :
      playerCar.speed < 300 ? '6' : '7';
    ctx.fillText(simulatedGear, 0, -8);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${Math.round(playerCar.speed)} KM/H`, 0, 12);

    // ERS battery & DRS status indicator on wheel
    ctx.fillStyle = '#06B6D4';
    ctx.fillRect(-34, 18, 28 * (playerCar.ersBattery / 100), 3.5);
    ctx.fillStyle = playerCar.drsActive ? '#22C55E' : playerCar.drsAvailable ? '#FACC15' : '#71717A';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(playerCar.drsActive ? 'DRS' : 'ERS', 20, 20);

    ctx.restore(); // restore wheel rotation
    ctx.restore();
  };

  /**
   * Main 60 FPS animation loop with Monoposto Camera, Dynamic FOV & Apex Look-Ahead
   */
  useEffect(() => {
    let animationId: number;
    let lastTimestamp = performance.now();
    const particles: Particle[] = [];
    const skidmarks: SkidMark[] = [];

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05); // cap delta at 50ms
      lastTimestamp = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(loop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(loop);
        return;
      }

      // Handle dynamic canvas sizing
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      const playerCar = cars.find((c) => c.isPlayer) || cars[0];
      const effectiveControls: PlayerControls = isRacing
        ? controlsState
        : { throttle: false, brake: false, steerLeft: false, steerRight: false, drs: false };

      const {
        leaderboard,
        overtakesThisFrame,
        contactThisFrame,
        offTrackThisFrame,
      } = updatePhysics(cars, track, effectiveControls, dt, particles, skidmarks, totalLaps, aiProfiles);

      // Track telemetry
      if (overtakesThisFrame > 0) telemetryRef.current.overtakes += overtakesThisFrame;
      if (offTrackThisFrame) telemetryRef.current.offTrackCount += 1;
      if (contactThisFrame) telemetryRef.current.hadContact = true;
      if (playerCar.drsActive) telemetryRef.current.drsUsageCount += 1;

      // Update sound engine
      const playerMaxSpeed = playerCar.specs.topSpeed + (playerCar.drsActive ? playerCar.specs.drsBoost : 0);
      const speedRatio = playerCar.speed / Math.max(playerMaxSpeed, 1);
      const rpmRatio = Math.min(speedRatio * 0.9 + (effectiveControls.throttle ? 0.1 : 0), 1.0);
      sound.updateEngineSound(rpmRatio, effectiveControls.throttle ? 1 : 0, playerCar.speed);
      sound.updateWindSound(playerCar.speed);

      // Check kerb rumble sound
      const { point: playerClosestPt, distToCenter: playerDistCenter } = getClosestTrackPoint(track, playerCar.x, playerCar.y);
      const playerHalfWidth = playerClosestPt.width / 2;
      const onKerb = playerClosestPt.hasCurbs && playerDistCenter > playerHalfWidth * 0.75 && playerDistCenter < playerHalfWidth * 1.15 && playerCar.speed > 50;

      if (onKerb) {
        sound.playKerbRumble();
      } else {
        sound.stopKerbRumble();
      }

      if (effectiveControls.brake && playerCar.speed > 120) {
        sound.playTireSqueal(0.8);
      } else {
        sound.stopTireSqueal();
      }

      onUpdateLeaderboard(leaderboard);
      onUpdatePlayerCar(playerCar);

      // Check finish
      if (playerCar.finished && !telemetryRef.current.finishedReported) {
        telemetryRef.current.finishedReported = true;
        sound.playCheer();
        onRaceFinish(leaderboard, {
          overtakes: telemetryRef.current.overtakes,
          offTrackCount: Math.floor(telemetryRef.current.offTrackCount / 20),
          avgApexRatio: 0.95,
          brakingLateCount: telemetryRef.current.brakingLateCount,
          drsUsageCount: telemetryRef.current.drsUsageCount,
          hadContact: telemetryRef.current.hadContact,
        });
      }

      // Clear & Draw World
      ctx.save();
      ctx.scale(dpr, dpr);
      const viewW = rect.width;
      const viewH = rect.height;

      // MONOPOSTO CAMERA SYSTEM WITH APEX LOOK-AHEAD:
      if (!camRef.current.initialized) {
        camRef.current.angle = playerCar.angle;
        camRef.current.x = playerCar.x;
        camRef.current.y = playerCar.y;
        camRef.current.zoom = 1.0;
        camRef.current.apexLookAhead = 0;
        camRef.current.initialized = true;
      }

      const cam = camRef.current;
      cam.x += (playerCar.x - cam.x) * Math.min(dt * 18, 1.0);
      cam.y += (playerCar.y - cam.y) * Math.min(dt * 18, 1.0);

      // Smooth Apex Look-Ahead: As driver turns the wheel, pan slightly in that direction to see corner exit!
      const targetLookAhead = (playerCar.steerAngle || 0) * (viewW * 0.12);
      cam.apexLookAhead += (targetLookAhead - cam.apexLookAhead) * Math.min(dt * 8, 1.0);

      let targetCamAngle = playerCar.angle;
      let screenPivotY = viewH * 0.68;
      let targetZoom = 1.04;
      let rotationFollowRate = 8.5;

      // Speed ratio for camera and dynamic visual intensity (0.0 to 1.0)
      const camSpeedRatio = Math.min(Math.max(playerCar.speed / 340, 0), 1.0);

      if (cameraMode === 'CHASE') {
        targetCamAngle = playerCar.angle;
        screenPivotY = viewH * 0.68;
        // Dynamic speed FOV: zooms out at high speed so the asphalt rushes past dramatically
        targetZoom = 1.15 - camSpeedRatio * 0.28;
        rotationFollowRate = 8.5;
      } else if (cameraMode === 'T_CAM') {
        targetCamAngle = playerCar.angle;
        screenPivotY = viewH * 0.74;
        targetZoom = 1.42 - camSpeedRatio * 0.25;
        rotationFollowRate = 12.0;
      } else if (cameraMode === 'COCKPIT') {
        targetCamAngle = playerCar.angle;
        screenPivotY = viewH * 0.78;
        // Cockpit dynamic tunnel compression
        targetZoom = 1.50 - camSpeedRatio * 0.22;
        rotationFollowRate = 14.0;
      } else if (cameraMode === 'NOSE') {
        targetCamAngle = playerCar.angle;
        screenPivotY = viewH * 0.88;
        // Nose camera low-slung adrenaline view
        targetZoom = 1.70 - camSpeedRatio * 0.32;
        rotationFollowRate = 16.0;
      } else if (cameraMode === 'OVERHEAD') {
        targetCamAngle = -Math.PI / 2;
        screenPivotY = viewH * 0.5;
        targetZoom = 0.76;
        rotationFollowRate = 5.0;
      }

      // Smooth Angular Damping
      if (cameraMode !== 'OVERHEAD') {
        let diff = targetCamAngle - cam.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        cam.angle += diff * Math.min(dt * rotationFollowRate, 1.0);
      } else {
        cam.angle = -Math.PI / 2;
      }

      cam.zoom += (targetZoom - cam.zoom) * Math.min(dt * 6, 1.0);

      // Camera vibration on curbs, gravel, downforce buffet, and 300+ km/h top-speed buffeting
      let shakeX = 0;
      let shakeY = 0;
      if (playerCar.isOffTrack) {
        shakeX = (Math.random() - 0.5) * 6;
        shakeY = (Math.random() - 0.5) * 6;
      } else if (playerCar.speed > 210) {
        // High-speed aerodynamic buffeting and tire vibration gives visceral sensation of speed
        const speedBuffet = Math.pow((playerCar.speed - 210) / 140, 1.3) * 3.8;
        shakeX = (Math.random() - 0.5) * speedBuffet;
        shakeY = (Math.random() - 0.5) * speedBuffet;
      }

      // Lateral banking roll tilt in corners
      const bankingRoll = cameraMode === 'CHASE' ? (playerCar.steerAngle || 0) * 0.12 : 0;

      // Apply Monoposto Camera Transform with Apex Look-Ahead
      ctx.save();
      ctx.translate(viewW / 2 + shakeX - cam.apexLookAhead, screenPivotY + shakeY);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.rotate(-cam.angle - Math.PI / 2 + bankingRoll);
      ctx.translate(-cam.x, -cam.y);

      // 1. World Background (Circuit Grass)
      ctx.fillStyle = '#141E16';
      ctx.fillRect(track.bounds.minX - 900, track.bounds.minY - 900, (track.bounds.maxX - track.bounds.minX) + 1800, (track.bounds.maxY - track.bounds.minY) + 1800);

      // 2. Track Surface, Curbs & Dynamic Monoposto Racing Line
      drawTrack(ctx, track);

      // 3. Skidmarks
      skidmarks.forEach((sm) => {
        ctx.strokeStyle = `rgba(10, 10, 10, ${sm.alpha * 0.55})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sm.x1, sm.y1);
        ctx.lineTo(sm.x2, sm.y2);
        ctx.stroke();
      });

      // 4. Particles (Tire smoke, sparks, gravel dust)
      particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw All 22 F1 Cars (Rivals first, player on top)
      cars.forEach((car) => {
        if (!car.isPlayer) {
          drawF1Car(ctx, car, false);
        }
      });

      // In Cockpit mode, the player's car interior is rendered from inside the cockpit
      if (cameraMode !== 'COCKPIT') {
        drawF1Car(ctx, playerCar, true);
      }

      ctx.restore(); // restore camera transform

      // 6. Monoposto First-Person COCKPIT Steering Wheel, Mirrors & Halo
      if (cameraMode === 'COCKPIT') {
        drawFirstPersonCockpit(ctx, viewW, viewH, playerCar, cars);
      }

      // 7. Monoposto Onboard Halo Frame Overlay (in T_CAM mode)
      if (cameraMode === 'T_CAM') {
        ctx.save();
        const haloX = viewW / 2;
        const haloY = screenPivotY + 12;

        ctx.fillStyle = '#18181B';
        ctx.beginPath();
        ctx.moveTo(haloX - 4, haloY);
        ctx.lineTo(haloX - 7, haloY - 140);
        ctx.lineTo(haloX + 7, haloY - 140);
        ctx.lineTo(haloX + 4, haloY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#27272A';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(haloX, haloY - 140, 68, -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.stroke();
        ctx.restore();
      }

      // 8. Visceral High-Speed Adrenaline Effects (Starts above 160 km/h, intense above 280 km/h)
      if (playerCar.speed > 160) {
        ctx.save();
        const speedNorm = Math.min((playerCar.speed - 160) / 180, 1.0); // 0 to 1
        const streakAlpha = speedNorm * 0.72;

        // Peripheral Speed Blur Vignette: Darkens and blurs extreme peripheral vision as in real racing
        if (speedNorm > 0.3) {
          const vignette = ctx.createRadialGradient(
            viewW / 2,
            screenPivotY,
            viewW * 0.35,
            viewW / 2,
            screenPivotY,
            viewW * 0.78
          );
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(0.7, `rgba(0, 5, 12, ${0.18 * speedNorm})`);
          vignette.addColorStop(1, `rgba(0, 0, 0, ${0.48 * speedNorm})`);
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, viewW, viewH);
        }

        // Multi-layered supersonic aerodynamic wind streak lines rushing backwards
        const streakCount = Math.floor(12 + speedNorm * 26);
        for (let i = 0; i < streakCount; i++) {
          const isLeft = i % 2 === 0;
          const sideOffset = 15 + ((i * 37) % Math.floor(viewW * 0.28));
          const xPos = isLeft ? sideOffset : viewW - sideOffset;

          // Velocity-synchronized rushing animation
          const rushSpeed = 1800 + playerCar.speed * 8;
          const ly = ((Date.now() * 0.001 * rushSpeed + i * 85) % (viewH * 1.3)) - (viewH * 0.15);
          const streakLen = 45 + speedNorm * 110 + (i % 5) * 20;
          const lineThickness = 1.0 + (i % 3) * 0.8;

          const grad = ctx.createLinearGradient(xPos, ly, xPos, ly + streakLen);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(0.5, `rgba(220, 240, 255, ${streakAlpha * 0.8})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.strokeStyle = grad;
          ctx.lineWidth = lineThickness;
          ctx.beginPath();
          ctx.moveTo(xPos, ly);
          ctx.lineTo(xPos, ly + streakLen);
          ctx.stroke();
        }

        // High-speed cockpit/screen shockwave flashes during DRS & 320+ km/h top speeds
        if (playerCar.drsActive || playerCar.speed > 310) {
          ctx.fillStyle = `rgba(34, 197, 94, ${0.035 * Math.sin(Date.now() / 80)})`;
          ctx.fillRect(0, 0, viewW, viewH);
        }

        ctx.restore();
      }

      // 9. Minimap overlay
      drawMinimap(ctx, viewW, track, cars);

      // 10. Start Lights Sequence UI Overlay
      if (startLights > 0 && startLights <= 6) {
        ctx.save();
        const boxW = 280;
        const boxH = 90;
        const boxX = (viewW - boxW) / 2;
        const boxY = 60;

        ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
        ctx.strokeStyle = '#3F3F46';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 10);
        ctx.fill();
        ctx.stroke();

        for (let i = 0; i < 5; i++) {
          const lightX = boxX + 32 + i * 46;
          const lightY = boxY + 45;

          ctx.fillStyle = '#18181B';
          ctx.beginPath();
          ctx.roundRect(lightX - 16, lightY - 26, 32, 52, 6);
          ctx.fill();

          const isRed = startLights >= i + 1 && startLights < 6;
          ctx.fillStyle = isRed ? '#EF4444' : '#27272A';
          ctx.beginPath();
          ctx.arc(lightX, lightY, 12, 0, Math.PI * 2);
          ctx.fill();

          if (isRed) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
            ctx.beginPath();
            ctx.arc(lightX, lightY, 18, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = startLights === 6 ? '#22C55E' : '#E4E4E7';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          startLights === 6 ? 'LIGHTS OUT AND AWAY WE GO!' : 'STARTING GRID FORMING...',
          viewW / 2,
          boxY + 20
        );

        ctx.restore();
      }

      ctx.restore();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [
    track,
    cars,
    isRacing,
    controlsState,
    totalLaps,
    cameraMode,
    startLights,
    aiProfiles,
    drawTrack,
    drawF1Car,
    drawMinimap,
    onRaceFinish,
    onUpdateLeaderboard,
    onUpdatePlayerCar,
  ]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-950 select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair touch-none"
      />
    </div>
  );
};
