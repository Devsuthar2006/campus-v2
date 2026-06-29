'use client';

import { useEffect, useRef, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface GlobeProps {
  /** When true the globe spins faster and pulses outward rings. */
  isSearching?: boolean;
  /** CSS class for the wrapper div. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Continent data — simplified lat/lng polylines for Earth's landmasses*/
/* Each sub-array is a separate polyline drawn on the sphere surface.  */
/* ------------------------------------------------------------------ */
const CONTINENT_PATHS: [number, number][][] = [
  // North America
  [
    [-10, 70],
    [-20, 60],
    [-30, 55],
    [-50, 48],
    [-65, 45],
    [-75, 40],
    [-80, 35],
    [-85, 30],
    [-95, 30],
    [-100, 25],
    [-105, 20],
    [-100, 18],
    [-90, 15],
    [-85, 12],
    [-80, 10],
    [-75, 10],
    [-70, 12],
    [-65, 18],
    [-60, 25],
    [-55, 30],
    [-50, 35],
    [-45, 45],
    [-40, 50],
    [-30, 55],
    [-20, 60],
    [-10, 70],
  ],
  // South America
  [
    [-80, 10],
    [-78, 5],
    [-75, 0],
    [-70, -5],
    [-68, -15],
    [-65, -25],
    [-60, -35],
    [-55, -40],
    [-50, -45],
    [-55, -50],
    [-65, -55],
    [-70, -45],
    [-72, -35],
    [-75, -20],
    [-77, -10],
    [-78, -5],
    [-80, 0],
    [-80, 10],
  ],
  // Europe
  [
    [0, 60],
    [5, 55],
    [10, 50],
    [15, 48],
    [20, 45],
    [25, 42],
    [30, 40],
    [28, 45],
    [25, 50],
    [20, 55],
    [15, 58],
    [10, 60],
    [5, 62],
    [0, 60],
  ],
  // Africa
  [
    [-5, 35],
    [0, 30],
    [5, 25],
    [10, 15],
    [15, 10],
    [20, 5],
    [25, 0],
    [30, -5],
    [35, -15],
    [32, -25],
    [28, -32],
    [22, -35],
    [18, -30],
    [15, -25],
    [12, -15],
    [10, -5],
    [5, 5],
    [0, 15],
    [-5, 25],
    [-5, 35],
  ],
  // Asia (simplified)
  [
    [30, 40],
    [40, 42],
    [50, 45],
    [60, 50],
    [70, 55],
    [80, 58],
    [90, 55],
    [100, 50],
    [110, 45],
    [120, 40],
    [130, 35],
    [140, 38],
    [130, 45],
    [120, 50],
    [110, 55],
    [100, 58],
    [90, 60],
    [80, 62],
    [70, 60],
    [60, 55],
    [50, 50],
    [40, 45],
    [30, 40],
  ],
  // Australia
  [
    [115, -15],
    [120, -18],
    [130, -20],
    [140, -25],
    [148, -30],
    [150, -35],
    [148, -38],
    [140, -35],
    [130, -30],
    [120, -28],
    [115, -22],
    [115, -15],
  ],
  // India
  [
    [68, 25],
    [72, 20],
    [75, 15],
    [78, 10],
    [80, 12],
    [82, 16],
    [80, 20],
    [77, 25],
    [72, 28],
    [68, 25],
  ],
];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Convert lat/lng (degrees) to 3D point on a unit sphere. */
function latLngToXYZ(lng: number, lat: number): Point3D {
  const phi = (lat * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;
  return {
    x: Math.cos(phi) * Math.sin(theta),
    y: -Math.sin(phi),
    z: Math.cos(phi) * Math.cos(theta),
  };
}

/** Rotate a 3D point around the Y axis by `angle` radians. */
function rotateY(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
}

/** Tilt a point around the X axis by `angle` radians. */
function rotateX(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

/** Project a 3D point onto 2D canvas coords (perspective). */
function project(
  p: Point3D,
  cx: number,
  cy: number,
  radius: number,
  fov: number,
): { x: number; y: number; depth: number } {
  const scale = fov / (fov + p.z);
  return { x: cx + p.x * radius * scale, y: cy + p.y * radius * scale, depth: p.z };
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export function Globe3D({ isSearching = false, className = '' }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const angleRef = useRef(0);
  const isDarkRef = useRef(false);

  /* Detect dark mode */
  useEffect(() => {
    const check = () => {
      isDarkRef.current = document.documentElement.classList.contains('dark');
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.36;
    const fov = 3;
    const tiltX = 0.35; // slight downward tilt

    const speed = isSearching ? 0.012 : 0.003;
    angleRef.current += speed;
    const rotY = angleRef.current;

    const dark = isDarkRef.current;
    const brandRGB = '255, 153, 0';

    // Clear
    ctx.clearRect(0, 0, w, h);

    /* ---- Outer glow circle behind the globe ---- */
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 1.4);
    glowGrad.addColorStop(0, `rgba(${brandRGB}, ${dark ? 0.06 : 0.08})`);
    glowGrad.addColorStop(0.5, `rgba(${brandRGB}, ${dark ? 0.02 : 0.03})`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    /* ---- Pulse rings (searching state) ---- */
    if (isSearching) {
      const now = performance.now();
      for (let i = 0; i < 3; i++) {
        const t = (now / 2000 + i / 3) % 1;
        const r = radius * (0.5 + t * 1.2);
        const alpha = Math.max(0, 0.35 * (1 - t));
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${brandRGB}, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    /* ---- Helper: transform and project ---- */
    const tp = (p: Point3D) => project(rotateX(rotateY(p, rotY), tiltX), cx, cy, radius, fov);

    /* ---- Latitude lines (grid) ---- */
    const latLines = [-60, -30, 0, 30, 60];
    for (const lat of latLines) {
      ctx.beginPath();
      for (let lng = 0; lng <= 360; lng += 4) {
        const p3 = latLngToXYZ(lng, lat);
        const pp = tp(p3);
        const alpha = Math.max(0, p3.z > -0.2 ? (dark ? 0.12 : 0.18) : dark ? 0.04 : 0.06);
        if (lng === 0) {
          ctx.moveTo(pp.x, pp.y);
        } else {
          ctx.lineTo(pp.x, pp.y);
        }
        ctx.strokeStyle = `rgba(${brandRGB}, ${alpha})`;
      }
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    /* ---- Longitude lines (grid) ---- */
    for (let lng = 0; lng < 360; lng += 30) {
      ctx.beginPath();
      for (let lat = -90; lat <= 90; lat += 4) {
        const p3 = latLngToXYZ(lng, lat);
        const pp = tp(p3);
        if (lat === -90) ctx.moveTo(pp.x, pp.y);
        else ctx.lineTo(pp.x, pp.y);
      }
      ctx.strokeStyle = `rgba(${brandRGB}, ${dark ? 0.08 : 0.12})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    /* ---- Continent outlines ---- */
    for (const path of CONTINENT_PATHS) {
      // Draw filled glow path for front-facing parts
      ctx.beginPath();
      let started = false;
      for (const [lng, lat] of path) {
        const p3 = latLngToXYZ(lng, lat);
        const r3 = rotateX(rotateY(p3, rotY), tiltX);
        const pp = project(r3, cx, cy, radius, fov);
        // Only draw front-facing segments
        if (r3.z > -0.15) {
          if (!started) {
            ctx.moveTo(pp.x, pp.y);
            started = true;
          } else {
            ctx.lineTo(pp.x, pp.y);
          }
        } else {
          started = false;
        }
      }
      ctx.strokeStyle = `rgba(${brandRGB}, ${dark ? 0.55 : 0.7})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Draw back-facing parts dimmer
      ctx.beginPath();
      started = false;
      for (const [lng, lat] of path) {
        const p3 = latLngToXYZ(lng, lat);
        const r3 = rotateX(rotateY(p3, rotY), tiltX);
        const pp = project(r3, cx, cy, radius, fov);
        if (r3.z <= -0.15) {
          if (!started) {
            ctx.moveTo(pp.x, pp.y);
            started = true;
          } else {
            ctx.lineTo(pp.x, pp.y);
          }
        } else {
          started = false;
        }
      }
      ctx.strokeStyle = `rgba(${brandRGB}, ${dark ? 0.1 : 0.15})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* ---- Orbital rings (ellipses around the globe) ---- */
    const orbitAngles = [0.15, 0.6, 1.1];
    for (const tilt of orbitAngles) {
      ctx.beginPath();
      for (let a = 0; a <= 360; a += 3) {
        const rad = (a * Math.PI) / 180;
        const p: Point3D = {
          x: Math.cos(rad) * 1.15,
          y: Math.sin(rad) * 1.15 * Math.sin(tilt),
          z: Math.sin(rad) * 1.15 * Math.cos(tilt),
        };
        const pp = project(rotateX(rotateY(p, rotY * 0.7 + tilt), tiltX), cx, cy, radius, fov);
        if (a === 0) ctx.moveTo(pp.x, pp.y);
        else ctx.lineTo(pp.x, pp.y);
      }
      ctx.strokeStyle = `rgba(${brandRGB}, ${dark ? 0.12 : 0.2})`;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* ---- Glowing nodes on the sphere surface ---- */
    const nodePositions: [number, number][] = [
      [-75, 40],
      [10, 50],
      [30, -5],
      [78, 10],
      [120, -25],
      [-100, 25],
      [50, 45],
      [140, 38],
      [-60, -35],
      [90, 55],
      [-30, 55],
      [25, 0],
      [80, 20],
      [115, -15],
      [-50, 48],
    ];
    for (const [lng, lat] of nodePositions) {
      const p3 = latLngToXYZ(lng, lat);
      const r3 = rotateX(rotateY(p3, rotY), tiltX);
      const pp = project(r3, cx, cy, radius, fov);
      if (r3.z > -0.1) {
        const alpha = 0.3 + r3.z * 0.7;
        const size = 2 + r3.z * 2;
        // Glow
        const glow = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, size * 4);
        glow.addColorStop(0, `rgba(${brandRGB}, ${alpha * 0.5})`);
        glow.addColorStop(1, `rgba(${brandRGB}, 0)`);
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, size * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brandRGB}, ${alpha})`;
        ctx.fill();
      }
    }

    /* ---- Connection lines between nearby front-facing nodes ---- */
    const frontNodes: { x: number; y: number; z: number }[] = [];
    for (const [lng, lat] of nodePositions) {
      const p3 = latLngToXYZ(lng, lat);
      const r3 = rotateX(rotateY(p3, rotY), tiltX);
      const pp = project(r3, cx, cy, radius, fov);
      if (r3.z > 0.1) frontNodes.push({ x: pp.x, y: pp.y, z: r3.z });
    }
    for (let i = 0; i < frontNodes.length; i++) {
      const nodeI = frontNodes[i];
      if (!nodeI) continue;
      for (let j = i + 1; j < frontNodes.length; j++) {
        const nodeJ = frontNodes[j];
        if (!nodeJ) continue;
        const dx = nodeI.x - nodeJ.x;
        const dy = nodeI.y - nodeJ.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < radius * 0.8) {
          const alpha = Math.max(0, 0.15 * (1 - dist / (radius * 0.8)));
          ctx.beginPath();
          ctx.moveTo(nodeI.x, nodeI.y);
          ctx.lineTo(nodeJ.x, nodeJ.y);
          ctx.strokeStyle = `rgba(${brandRGB}, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    /* ---- Floating particles around the globe ---- */
    const now = performance.now();
    for (let i = 0; i < 20; i++) {
      const t = (now / (3000 + i * 500) + i * 0.7) % (Math.PI * 2);
      const r = radius * (1.1 + Math.sin(i * 1.3) * 0.3);
      const px = cx + Math.cos(t) * r * (0.8 + Math.sin(i * 2.1) * 0.2);
      const py = cy + Math.sin(t) * r * 0.4 * Math.cos(i * 0.9);
      const alpha = 0.15 + Math.sin(now / 1000 + i) * 0.1;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${brandRGB}, ${alpha})`;
      ctx.fill();
    }

    frameRef.current = requestAnimationFrame(draw);
  }, [isSearching]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  return (
    <div className={`relative w-full ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
    </div>
  );
}
