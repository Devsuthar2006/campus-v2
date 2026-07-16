'use client';

import { useEffect, useRef } from 'react';

/**
 * Premium Ambient Aurora Background
 * A smooth, slow-moving, abstract fluid gradient background.
 */
export function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let time = 0;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };

    // Define floating orbs with colors
    const orbs = [
      {
        color: 'rgba(255, 153, 0, 0.15)',
        size: 0.8,
        speedX: 0.001,
        speedY: 0.0013,
        offsetX: 0,
        offsetY: 0,
      },
      {
        color: 'rgba(124, 58, 237, 0.15)',
        size: 0.7,
        speedX: 0.0012,
        speedY: 0.0009,
        offsetX: 2000,
        offsetY: 1000,
      },
      {
        color: 'rgba(59, 130, 246, 0.12)',
        size: 0.9,
        speedX: 0.0008,
        speedY: 0.0011,
        offsetX: 1000,
        offsetY: 3000,
      },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const minDim = Math.min(width, height);

      orbs.forEach((orb) => {
        // Calculate smooth roaming positions using sine waves
        const x = width / 2 + Math.sin(time * orb.speedX + orb.offsetX) * (width * 0.4);
        const y = height / 2 + Math.cos(time * orb.speedY + orb.offsetY) * (height * 0.4);
        const radius = minDim * orb.size;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const tick = () => {
      time += 2; // Slightly faster time progression
      draw();
      raf = requestAnimationFrame(tick);
    };

    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <div className="absolute inset-0 bg-[#050505]" />
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full blur-[80px] opacity-90 mix-blend-screen"
      />
      {/* subtle noise overlay */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] mix-blend-overlay pointer-events-none" />
    </>
  );
}
