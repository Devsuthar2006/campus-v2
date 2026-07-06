'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
  alpha?: number;
  size?: number;
}

interface ConnectionArc {
  startIdx: number;
  endIdx: number;
  trail: { x: number; y: number }[];
  progress: number;
  speed: number;
}

interface GlobeProps {
  isSearching?: boolean;
  className?: string;
}

const brandRGB = '255, 153, 0'; // Brand orange
const accentRGB = '139, 92, 246'; // Purple accents for high-fidelity look

export function Globe3D({ isSearching = false, className = '' }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const angleInnerRef = useRef<number>(0);
  const angleOuterRef = useRef<number>(0);

  // Parallax tilt coordinates
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDark, setIsDark] = useState(true);

  // Pre-calculated land matrix (holographic dot-matrix continents)
  const landParticlesRef = useRef<Point3D[]>([]);
  // Equatorial ring particles
  const ringParticlesRef = useRef<Point3D[]>([]);
  // Active laser connections
  const arcsRef = useRef<ConnectionArc[]>([]);

  // Setup theme observer
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  // Generate holographic particles on mount
  useEffect(() => {
    // 1. Generate dot-matrix continents using procedural land check
    const particles: Point3D[] = [];
    const isLand = (lng: number, lat: number) => {
      const radLng = (lng * Math.PI) / 180;
      const radLat = (lat * Math.PI) / 180;

      // Multi-frequency wave combinations to simulate Earth's geography
      const w1 = Math.sin(radLng * 2.5) * Math.cos(radLat * 2.5);
      const w2 = Math.sin(radLng * 5.0 + 1.2) * Math.cos(radLat * 4.0);
      const w3 = Math.sin(radLng * 1.2) * Math.cos(radLat * 1.2);
      const w4 = Math.sin(radLng * 8.0) * Math.cos(radLat * 8.0) * 0.15;

      const noise = w1 * 0.45 + w2 * 0.3 + w3 * 0.2 + w4;

      // Exclude poles slightly for cleaner globe shape
      if (Math.abs(lat) > 75) return false;
      return noise > -0.05;
    };

    // Grid sampling
    for (let lat = -70; lat <= 70; lat += 3.5) {
      // Density adjustments based on latitude to prevent pole crowding
      const step = 4.5 / Math.cos((lat * Math.PI) / 180);
      for (let lng = -180; lng < 180; lng += step) {
        if (isLand(lng, lat)) {
          const radLng = (lng * Math.PI) / 180;
          const radLat = (lat * Math.PI) / 180;
          particles.push({
            x: Math.cos(radLat) * Math.cos(radLng),
            y: Math.sin(radLat),
            z: Math.cos(radLat) * Math.sin(radLng),
            size: Math.random() * 0.8 + 0.8,
            alpha: Math.random() * 0.4 + 0.6,
          });
        }
      }
    }
    landParticlesRef.current = particles;

    // 2. Generate Saturn-style equatorial ring particles
    const ring: Point3D[] = [];
    const ringCount = 75;
    for (let i = 0; i < ringCount; i++) {
      const rad = (i / ringCount) * Math.PI * 2;
      const widthFactor = 1.3 + Math.random() * 0.18; // Width of ring
      ring.push({
        x: Math.cos(rad) * widthFactor,
        y: (Math.random() - 0.5) * 0.03, // Thin height variance
        z: Math.sin(rad) * widthFactor,
        size: Math.random() * 0.6 + 0.6,
        alpha: Math.random() * 0.35 + 0.45,
      });
    }
    ringParticlesRef.current = ring;

    // 3. Setup laser connection arcs
    const activeArcs: ConnectionArc[] = [];
    for (let i = 0; i < 6; i++) {
      activeArcs.push({
        startIdx: Math.floor(Math.random() * 15),
        endIdx: Math.floor(Math.random() * 15),
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.012,
        trail: [],
      });
    }
    arcsRef.current = activeArcs;
  }, []);

  // Track mouse movements for parallax tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    targetMouseRef.current = { x, y };
  };

  const handleMouseLeave = () => {
    targetMouseRef.current = { x: 0, y: 0 };
  };

  // Convert lat/lng to 3D Cartesian coordinates
  const latLngToXYZ = (lng: number, lat: number): Point3D => {
    const radLng = (lng * Math.PI) / 180;
    const radLat = (lat * Math.PI) / 180;
    return {
      x: Math.cos(radLat) * Math.cos(radLng),
      y: Math.sin(radLat),
      z: Math.cos(radLat) * Math.sin(radLng),
    };
  };

  // Rotation matrices
  const rotateX = (p: Point3D, angle: number): Point3D => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
  };

  const rotateY = (p: Point3D, angle: number): Point3D => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
  };

  const rotateZ = (p: Point3D, angle: number): Point3D => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos, z: p.z };
  };

  // Projection
  const project = (p: Point3D, cx: number, cy: number, radius: number, fov: number) => {
    const distance = 2.45;
    const scale = fov / (distance - p.z);
    return {
      x: cx + p.x * radius * scale,
      y: cy - p.y * radius * scale,
    };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Reset transform matrix to prevent scale accumulation bugs
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    ctx.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.38;
    const fov = 1.0;

    // Interpolate mouse parallax tilt
    mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.06;
    mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.06;

    // Dual rotating layers: Core and Shell speed differences create parallax depth
    const speedInner = isSearching ? 0.016 : 0.004;
    const speedOuter = isSearching ? -0.01 : -0.002; // Rotate outer shell opposite direction

    angleInnerRef.current += speedInner;
    angleOuterRef.current += speedOuter;

    const rotInnerY = angleInnerRef.current + mouseRef.current.x * 0.45;
    const rotOuterY = angleOuterRef.current + mouseRef.current.x * 0.25;

    const tiltX = 0.35 + mouseRef.current.y * 0.35;
    const spinZ = mouseRef.current.x * 0.12;

    /* ---- 1. Holographic Space Stars Background ---- */
    const timeMs = performance.now();
    for (let i = 0; i < 40; i++) {
      const angle = (timeMs / (6000 + i * 300) + i * 0.8) % (Math.PI * 2);
      const orbitRad = radius * (1.15 + Math.sin(i * 1.5) * 0.35);
      const px = cx + Math.cos(angle) * orbitRad * (0.9 + Math.sin(i * 2) * 0.1);
      const py = cy + Math.sin(angle) * orbitRad * 0.45 * Math.cos(i * 0.5);
      const pz = Math.sin(angle) * Math.sin(i * 0.5);

      // Hide stars directly behind the sphere core
      const behindGlobe = pz < -0.15 && (px - cx) ** 2 + (py - cy) ** 2 < (radius * 0.98) ** 2;

      if (!behindGlobe) {
        const alpha = (0.15 + Math.sin(timeMs / 800 + i) * 0.1) * Math.max(0.1, pz + 0.6);
        const size = 0.9 + Math.sin(timeMs / 1200 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brandRGB}, ${alpha})`;
        ctx.fill();
      }
    }

    /* ---- 4. Holographic Dot-Matrix Continents (Core Rotation) ---- */
    landParticlesRef.current.forEach((p) => {
      // Rotate core continents layer
      const r3 = rotateZ(rotateX(rotateY(p, rotInnerY), tiltX), spinZ);

      // Only draw particles on the front hemisphere face
      if (r3.z > -0.15) {
        const pp = project(r3, cx, cy, radius, fov);
        const depthAlpha = 0.3 + r3.z * 0.7; // Fade particles wrapping around curves
        const alpha = (p.alpha || 0.8) * depthAlpha * (isDark ? 0.85 : 0.95);
        const size = (p.size || 1.2) * (0.7 + r3.z * 0.6);

        ctx.beginPath();
        ctx.arc(pp.x, pp.y, size, 0, Math.PI * 2);

        // Dynamic node color blending orange and purple
        if (p.x * p.y > 0.1) {
          ctx.fillStyle = `rgba(${accentRGB}, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(${brandRGB}, ${alpha})`;
        }
        ctx.fill();
      }
    });

    /* ---- 5. Saturn Equator Ring Particles (Depth Sorted) ---- */
    // Sort ring particles by Z depth to render back-portion first, then globe, then front-portion
    const rotatedRing = ringParticlesRef.current.map((p) => {
      // Ring tilts slightly different for planetary scale
      const r3 = rotateZ(rotateX(rotateY(p, rotInnerY * 1.15), tiltX * 0.95), spinZ * 1.1);
      const pp = project(r3, cx, cy, radius, fov);
      return { p, r3, pp };
    });

    // Render back-side of the Saturn equatorial ring (Z < -0.1)
    rotatedRing.forEach(({ p, r3, pp }) => {
      if (r3.z <= -0.1) {
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, p.size || 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brandRGB}, ${(p.alpha || 0.5) * 0.3})`;
        ctx.fill();
      }
    });

    /* ---- 6. Shell Lat/Lng Wireframe Grids (Outer Shell Rotation) ---- */
    // Subtle translucent wireframe lines spinning opposite way
    for (let lat = -50; lat <= 50; lat += 25) {
      ctx.beginPath();
      let first = true;
      for (let lng = 0; lng <= 360; lng += 8) {
        const p3 = latLngToXYZ(lng, lat);
        // Spin outer grid shell
        const r3 = rotateZ(rotateX(rotateY(p3, rotOuterY), tiltX), spinZ);
        if (r3.z >= -0.1) {
          const pp = project(r3, cx, cy, radius * 1.03, fov); // Slightly larger outer radius
          if (first) {
            ctx.moveTo(pp.x, pp.y);
            first = false;
          } else {
            ctx.lineTo(pp.x, pp.y);
          }
        } else {
          first = true;
        }
      }
      ctx.strokeStyle = `rgba(${accentRGB}, ${isDark ? 0.07 : 0.09})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    /* ---- 7. Neon Connection Mesh & Shooting Lasers ---- */
    const nodePositions: [number, number][] = [
      [-55, 30],
      [20, 45],
      [40, -10],
      [80, 15],
      [110, -20],
      [-95, 20],
      [60, 35],
      [130, 25],
      [-50, -25],
      [85, 45],
      [-25, 45],
      [35, 10],
      [95, 30],
      [120, -10],
      [-60, 40],
    ];

    const activeNodes: { x: number; y: number; z: number; projX: number; projY: number }[] = [];
    nodePositions.forEach(([lng, lat]) => {
      const p3 = latLngToXYZ(lng, lat);
      // Nodes sit on the outer grid shell
      const r3 = rotateZ(rotateX(rotateY(p3, rotOuterY), tiltX), spinZ);
      const pp = project(r3, cx, cy, radius * 1.03, fov);
      if (r3.z > 0) {
        activeNodes.push({ x: r3.x, y: r3.y, z: r3.z, projX: pp.x, projY: pp.y });
      }
    });

    // Draw active laser beams traveling between outer shell nodes
    const timeSec = performance.now() / 1000;
    arcsRef.current.forEach((arc) => {
      const nodeA = activeNodes[arc.startIdx % activeNodes.length];
      const nodeB = activeNodes[arc.endIdx % activeNodes.length];

      if (nodeA && nodeB) {
        const dx = nodeA.projX - nodeB.projX;
        const dy = nodeA.projY - nodeB.projY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < radius * 1.4) {
          // Curved Bezier path points
          const midX = (nodeA.projX + nodeB.projX) / 2;
          const midY = (nodeA.projY + nodeB.projY) / 2 - dist * 0.2;

          // Animate progress
          arc.progress += arc.speed;
          if (arc.progress >= 1.0) {
            arc.progress = 0;
            arc.startIdx = Math.floor(Math.random() * activeNodes.length);
            arc.endIdx = Math.floor(Math.random() * activeNodes.length);
            arc.trail = [];
          }

          const t = arc.progress;
          // Calculate laser core position
          const lx = (1 - t) * (1 - t) * nodeA.projX + 2 * (1 - t) * t * midX + t * t * nodeB.projX;
          const ly = (1 - t) * (1 - t) * nodeA.projY + 2 * (1 - t) * t * midY + t * t * nodeB.projY;

          // Accumulate trail points for laser tail effect
          arc.trail.push({ x: lx, y: ly });
          if (arc.trail.length > 12) arc.trail.shift();

          // Draw laser trail
          if (arc.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(arc.trail[0]!.x, arc.trail[0]!.y);
            for (let k = 1; k < arc.trail.length; k++) {
              ctx.lineTo(arc.trail[k]!.x, arc.trail[k]!.y);
            }
            ctx.strokeStyle = `rgba(${accentRGB}, ${0.35 * Math.min(nodeA.z, nodeB.z)})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }

          // Laser shooting star flare core
          ctx.beginPath();
          ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * Math.min(nodeA.z, nodeB.z)})`;
          ctx.fill();
        }
      }
    });

    // Draw active shell node pulses
    activeNodes.forEach((node) => {
      const alpha = node.z;
      const size = 3.5 + node.z * 1.5;

      // Pulse ring scaling out
      const ringScale = (timeSec * 1.5) % 1.0;
      ctx.beginPath();
      ctx.arc(node.projX, node.projY, size * (1.0 + ringScale * 1.5), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${accentRGB}, ${alpha * (1.0 - ringScale) * 0.45})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Core glow
      ctx.beginPath();
      ctx.arc(node.projX, node.projY, size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${accentRGB}, ${alpha * 0.95})`;
      ctx.fill();
    });

    /* ---- 8. Render Front-side of Saturn Equatorial Ring ---- */
    rotatedRing.forEach(({ p, r3, pp }) => {
      if (r3.z > -0.1) {
        const depthAlpha = 0.4 + r3.z * 0.6;
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, p.size || 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brandRGB}, ${(p.alpha || 0.6) * depthAlpha})`;
        ctx.fill();
      }
    });

    frameRef.current = requestAnimationFrame(draw);
  }, [isSearching, isDark]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  return (
    <div
      className={`absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
    </div>
  );
}
