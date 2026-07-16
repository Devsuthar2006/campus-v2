import React from 'react';

/**
 * Pure CSS Hardware-Accelerated Aurora Background
 * Zero-JS, zero-Canvas implementation.
 * Prevents black screens and lag on low-end devices.
 */
export function ConstellationBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#050505]">
      {/* 
        We use highly blurred, absolutely positioned divs with custom 
        animation delays and CSS keyframes for a zero-performance-cost aurora.
      */}

      {/* Orb 1: Orange/Brand */}
      <div
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand/15 rounded-full blur-[100px] animate-blob mix-blend-screen"
        style={{ animationDelay: '0s' }}
      />

      {/* Orb 2: Purple */}
      <div
        className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[100px] animate-blob mix-blend-screen"
        style={{ animationDelay: '2s' }}
      />

      {/* Orb 3: Blue */}
      <div
        className="absolute bottom-1/4 left-1/3 w-[700px] h-[700px] bg-blue-600/15 rounded-full blur-[100px] animate-blob mix-blend-screen"
        style={{ animationDelay: '4s' }}
      />

      {/* Subtle Noise Overlay */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
    </div>
  );
}
