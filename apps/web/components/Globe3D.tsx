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

    /* ---- 1. Outer glow circle behind the globe ---- */
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 1.5);
    glowGrad.addColorStop(0, `rgba(${brandRGB}, ${dark ? 0.08 : 0.1})`);
    glowGrad.addColorStop(0.5, `rgba(${brandRGB}, ${dark ? 0.03 : 0.04})`);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    /* ---- 2. Pulse rings (searching state) ---- */
    if (isSearching) {
      const now = performance.now();
      for (let i = 0; i < 3; i++) {
        const t = (now / 2000 + i / 3) % 1;
        const r = radius * (0.6 + t * 1.2);
        const alpha = Math.max(0, 0.4 * (1 - t));
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${brandRGB}, ${alpha})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    /* ---- 3. Draw BACK-facing elements (z < -0.15) ---- */
    // Back Latitude lines
    const latLines = [-60, -30, 0, 30, 60];
    for (const lat of latLines) {
      ctx.beginPath();
      let first = true;
      for (let lng = 0; lng <= 360; lng += 4) {
        const p3 = latLngToXYZ(lng, lat);
        const r3 = rotateX(rotateY(p3, rotY), tiltX);
        if (r3.z < -0.15) {
          const pp = project(r3, cx, cy, radius, fov);
          const alpha = Math.max(0, 0.15 * (1 + r3.z) * (dark ? 0.4 : 0.6));
          if (first) {
            ctx.moveTo(pp.x, pp.y);
            first = false;
          } else {
            ctx.lineTo(pp.x, pp.y);
          }
          ctx.strokeStyle = `rgba(${brandRGB}, ${alpha})`;
        } else {
          first = true;
        }
      }
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Back Longitude lines
    for (let lng = 0; lng < 360; lng += 30) {
      ctx.beginPath();
      let first = true;
      for (let lat = -90; lat <= 90; lat += 4) {
        const p3 = latLngToXYZ(lng, lat);
        const r3 = rotateX(rotateY(p3, rotY), tiltX);
        if (r3.z < -0.15) {
          const pp = project(r3, cx, cy, radius, fov);
          const alpha = Math.max(0, 0.12 * (1 + r3.z) * (dark ? 0.4 : 0.6));
          if (first) {
            ctx.moveTo(pp.x, pp.y);
            first = false;
          } else {
            ctx.lineTo(pp.x, pp.y);
          }
          ctx.strokeStyle = `rgba(${brandRGB}, ${alpha})`;
        } else {
          first = true;
        }
      }
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }

    // Back Continents
    for (const path of CONTINENT_PATHS) {
      ctx.beginPath();
      let started = false;
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
      ctx.strokeStyle = `rgba(${brandRGB}, ${dark ? 0.08 : 0.12})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    /* ---- 4. Draw SEMI-TRANSPARENT GLOBE BODY (Realistic volumetric masking) ---- */
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.99, 0, Math.PI * 2);

    const bodyGrad = ctx.createRadialGradient(
      cx - radius * 0.15,
      cy - radius * 0.15,
      radius * 0.2,
      cx,
      cy,
      radius,
    );
    if (dark) {
      bodyGrad.addColorStop(0, 'rgba(16, 18, 23, 0.75)'); // Center translucent gray
      bodyGrad.addColorStop(0.8, 'rgba(10, 11, 14, 0.93)'); // Mid shadow
      bodyGrad.addColorStop(1, 'rgba(5, 5, 7, 0.98)'); // Dark edge shadow
    } else {
      bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)'); // Center translucent white
      bodyGrad.addColorStop(0.8, 'rgba(242, 244, 248, 0.88)'); // Soft blue-ish white
      bodyGrad.addColorStop(1, 'rgba(215, 220, 228, 0.95)'); // Shaded border edge
    }
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Atmosphere Ring Shadow (inner stroke for depth)
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    /* ---- 5. Draw FRONT-facing elements (z >= -0.15) ---- */
    // Front Latitude lines
    for (const lat of latLines) {
      ctx.beginPath();
      let first = true;
      for (let lng = 0; lng <= 360; lng += 4) {
        const p3 = latLngToXYZ(lng, lat);
        const r3 = rotateX(rotateY(p3, rotY), tiltX);
        if (r3.z >= -0.15) {
          const pp = project(r3, cx, cy, radius, fov);
          const alpha = Math.max(0, (0.08 + r3.z * 0.15) * (dark ? 0.7 : 0.9));
          if (first) {
            ctx.moveTo(pp.x, pp.y);
            first = false;
          } else {
            ctx.lineTo(pp.x, pp.y);
          }
          ctx.strokeStyle = `rgba(${brandRGB}, ${alpha})`;
        } else {
          first = true;
        }
      }
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Front Longitude lines
    for (let lng = 0; lng < 360; lng += 30) {
      ctx.beginPath();
      let first = true;
      for (let lat = -90; lat <= 90; lat += 4) {
        const p3 = latLngToXYZ(lng, lat);
        const r3 = rotateX(rotateY(p3, rotY), tiltX);
        if (r3.z >= -0.15) {
          const pp = project(r3, cx, cy, radius, fov);
          const alpha = Math.max(0, (0.06 + r3.z * 0.12) * (dark ? 0.6 : 0.8));
          if (first) {
            ctx.moveTo(pp.x, pp.y);
            first = false;
          } else {
            ctx.lineTo(pp.x, pp.y);
          }
          ctx.strokeStyle = `rgba(${brandRGB}, ${alpha})`;
        } else {
          first = true;
        }
      }
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Front Continents (Solid, thick, glowing)
    for (const path of CONTINENT_PATHS) {
      ctx.beginPath();
      let started = false;
      for (const [lng, lat] of path) {
        const p3 = latLngToXYZ(lng, lat);
        const r3 = rotateX(rotateY(p3, rotY), tiltX);
        const pp = project(r3, cx, cy, radius, fov);
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
      // Glowing backing line
      ctx.strokeStyle = `rgba(${brandRGB}, ${dark ? 0.3 : 0.35})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Sharp core line
      ctx.strokeStyle = `rgba(${brandRGB}, ${dark ? 0.85 : 0.95})`;
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }

    /* ---- 6. Orbital rings (ellipses around the globe with depth sorting) ---- */
    const orbitAngles = [0.2, 0.6, 1.05];
    for (const tilt of orbitAngles) {
      ctx.beginPath();
      for (let a = 0; a <= 360; a += 3) {
        const rad = (a * Math.PI) / 180;
        const p: Point3D = {
          x: Math.cos(rad) * 1.14,
          y: Math.sin(rad) * 1.14 * Math.sin(tilt),
          z: Math.sin(rad) * 1.14 * Math.cos(tilt),
        };
        const r3 = rotateX(rotateY(p, rotY * 0.75 + tilt), tiltX);

        // Only draw segment if it is in front of the globe body (or dim if behind)
        const pp = project(r3, cx, cy, radius, fov);
        const behindGlobe = r3.z < 0 && (pp.x - cx) ** 2 + (pp.y - cy) ** 2 < (radius * 0.98) ** 2;

        if (!behindGlobe) {
          if (a === 0) ctx.moveTo(pp.x, pp.y);
          else ctx.lineTo(pp.x, pp.y);
        } else {
          ctx.stroke();
          ctx.beginPath();
        }
      }
      ctx.strokeStyle = `rgba(${brandRGB}, ${dark ? 0.22 : 0.35})`;
      ctx.lineWidth = 1.0;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* ---- 7. Glowing nodes on the sphere surface ---- */
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
      if (r3.z > -0.15) {
        const alpha = 0.45 + r3.z * 0.55;
        const size = 3 + r3.z * 2.5;
        // Glow
        const glow = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, size * 5);
        glow.addColorStop(0, `rgba(${brandRGB}, ${alpha * 0.65})`);
        glow.addColorStop(1, `rgba(${brandRGB}, 0)`);
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, size * 5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brandRGB}, ${alpha})`;
        ctx.fill();
      }
    }

    /* ---- 8. Connection lines between nearby front-facing nodes ---- */
    const frontNodes: { x: number; y: number; z: number }[] = [];
    for (const [lng, lat] of nodePositions) {
      const p3 = latLngToXYZ(lng, lat);
      const r3 = rotateX(rotateY(p3, rotY), tiltX);
      const pp = project(r3, cx, cy, radius, fov);
      if (r3.z > 0.05) frontNodes.push({ x: pp.x, y: pp.y, z: r3.z });
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
        if (dist < radius * 0.75) {
          const alpha = Math.max(0, 0.28 * (1 - dist / (radius * 0.75)));
          ctx.beginPath();
          ctx.moveTo(nodeI.x, nodeI.y);
          ctx.lineTo(nodeJ.x, nodeJ.y);
          ctx.strokeStyle = `rgba(${brandRGB}, ${alpha})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }
    }

    /* ---- 9. Atmosphere Highlights / Fresnel Edge Glow (Overlay) ---- */
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    const fresnel = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius);
    fresnel.addColorStop(0, 'rgba(255, 153, 0, 0)');
    fresnel.addColorStop(0.5, `rgba(${brandRGB}, ${dark ? 0.08 : 0.06})`);
    fresnel.addColorStop(1, `rgba(${brandRGB}, ${dark ? 0.45 : 0.35})`);
    ctx.fillStyle = fresnel;
    ctx.fill();

    /* ---- 10. Floating particles around the globe ---- */
    const now = performance.now();
    for (let i = 0; i < 24; i++) {
      const t = (now / (3500 + i * 400) + i * 0.85) % (Math.PI * 2);
      const r = radius * (1.1 + Math.sin(i * 1.5) * 0.28);
      const px = cx + Math.cos(t) * r * (0.85 + Math.sin(i * 2.3) * 0.15);
      const py = cy + Math.sin(t) * r * 0.45 * Math.cos(i * 0.75);

      // Determine if particle is behind the globe body
      const particleZ = Math.sin(t) * Math.sin(i * 0.75);
      const behindGlobe =
        particleZ < -0.2 && (px - cx) ** 2 + (py - cy) ** 2 < (radius * 0.98) ** 2;

      if (!behindGlobe) {
        const alpha = 0.25 + Math.sin(now / 800 + i) * 0.15;
        const size = 1.5 + Math.sin(now / 1200 + i * 3) * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brandRGB}, ${alpha})`;
        ctx.fill();
      }
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
