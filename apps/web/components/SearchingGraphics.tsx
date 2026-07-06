'use client';

import { useEffect, useState } from 'react';
import { Users, Sparkles } from 'lucide-react';

export function SearchingGraphics() {
  const [activeTip, setActiveTip] = useState(0);

  const tips = [
    'Tip: Set your gender preference filter in Settings to refine your matches.',
    'Tip: Send borderless voice notes or photos directly from the bottom bar.',
    'Tip: Double-tap on wall posts to react with fire instantly!',
    'Tip: Shared photos stay blurred in the feed for your privacy.',
    'Tip: Add matches as friends to reveal your secret usernames.',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTip((prev) => (prev + 1) % tips.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [tips.length]);

  return (
    <div className="relative w-full h-40 flex items-center justify-center select-none overflow-visible border border-border/40 bg-card/25 dark:bg-[#121212]/30 backdrop-blur-md rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
      {/* Custom Styles for Keyframe Animations */}
      <style jsx global>{`
        @keyframes float-astro {
          0%,
          100% {
            transform: translateY(0px) rotate(-1deg);
          }
          50% {
            transform: translateY(-8px) rotate(2deg);
          }
        }
        @keyframes float-monkey {
          0%,
          100% {
            transform: translateY(0px) rotate(2deg);
          }
          50% {
            transform: translateY(-10px) rotate(-3deg);
          }
        }
        @keyframes wave-arm {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(20deg);
          }
        }
        @keyframes visor-glow {
          0%,
          100% {
            fill: rgba(255, 153, 0, 0.25);
            filter: drop-shadow(0 0 2px rgba(255, 153, 0, 0.4));
          }
          50% {
            fill: rgba(139, 92, 246, 0.35);
            filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.6));
          }
        }
        @keyframes drift-cloud {
          0% {
            transform: translateX(-60px);
            opacity: 0;
          }
          10% {
            opacity: 0.15;
          }
          90% {
            opacity: 0.15;
          }
          100% {
            transform: translateX(360px);
            opacity: 0;
          }
        }
        @keyframes slide-card {
          0% {
            transform: translateX(-40px) translateY(10px);
            opacity: 0;
          }
          15% {
            transform: translateX(0px) translateY(0px);
            opacity: 1;
          }
          85% {
            transform: translateX(0px) translateY(0px);
            opacity: 1;
          }
          100% {
            transform: translateX(40px) translateY(-10px);
            opacity: 0;
          }
        }
        .animate-float-astro {
          animation: float-astro 3.5s ease-in-out infinite;
        }
        .animate-float-monkey {
          animation: float-monkey 4s ease-in-out infinite;
        }
        .animate-wave-arm {
          animation: wave-arm 1.2s ease-in-out infinite;
          transform-origin: 11px 11px;
        }
        .animate-visor {
          animation: visor-glow 4s ease-in-out infinite;
        }
        .animate-cloud-slow {
          animation: drift-cloud 16s linear infinite;
        }
        .animate-cloud-fast {
          animation: drift-cloud 11s linear infinite;
        }
        .animate-card-slide {
          animation: slide-card 5s ease-in-out infinite;
        }
      `}</style>

      {/* Floating clouds for depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <svg
          className="absolute top-2 left-0 w-10 h-5 text-muted-foreground/10 animate-cloud-slow"
          viewBox="0 0 24 12"
          fill="currentColor"
        >
          <path d="M6 12A4 4 0 0 1 6 4a3.5 3.5 0 0 1 6.5-1A4.5 4.5 0 0 1 20 6a4 4 0 0 1-4 6H6z" />
        </svg>
        <svg
          className="absolute bottom-2 left-0 w-8 h-4 text-muted-foreground/10 animate-cloud-fast"
          style={{ animationDelay: '4s' }}
          viewBox="0 0 24 12"
          fill="currentColor"
        >
          <path d="M6 12A4 4 0 0 1 6 4a3.5 3.5 0 0 1 6.5-1A4.5 4.5 0 0 1 20 6a4 4 0 0 1-4 6H6z" />
        </svg>
      </div>

      {/* Mascot 1: Cyber-Astro Student (Floating right side) */}
      <div className="absolute right-4 bottom-3 w-16 h-24 z-20 pointer-events-none animate-float-astro">
        <svg className="w-full h-full" viewBox="0 0 64 80" fill="none">
          {/* Jetpack flames */}
          <path d="M16 54 L12 68 L16 62 Z" fill="#ff9900" opacity="0.8" />
          <path d="M22 54 L26 68 L22 62 Z" fill="#ff9900" opacity="0.8" />

          {/* Backpack/Jetpack */}
          <rect
            x="12"
            y="24"
            width="14"
            height="24"
            rx="4"
            fill="url(#paint0_linear)"
            stroke="#ff9900"
            strokeWidth="1.2"
          />

          {/* Body Suit */}
          <rect
            x="14"
            y="32"
            width="22"
            height="22"
            rx="6"
            fill="#1e1b4b"
            stroke="#ff9900"
            strokeWidth="1.5"
          />
          <rect x="18" y="36" width="14" height="14" rx="3" fill="#312e81" />

          {/* Arms */}
          <path
            d="M10 36 C8 42 10 46 14 46"
            stroke="#ff9900"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M40 36 C42 42 40 46 36 46"
            stroke="#ff9900"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Legs */}
          <rect x="16" y="52" width="6" height="10" rx="3" fill="#ff9900" />
          <rect x="28" y="52" width="6" height="10" rx="3" fill="#ff9900" />

          {/* Astronaut Helmet */}
          <circle cx="25" cy="18" r="14" fill="#1e1b4b" stroke="#ff9900" strokeWidth="2" />
          {/* Visor with animated neon gradient glow */}
          <ellipse
            cx="25"
            cy="18"
            rx="10"
            ry="7"
            className="animate-visor"
            stroke="#ff9900"
            strokeWidth="1.2"
          />
          <path
            d="M19 16 C 19 16 22 14 26 14 C 30 14 31 16 31 16"
            stroke="white"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.4"
          />

          {/* Cute visor stars */}
          <circle cx="28" cy="18" r="0.75" fill="white" opacity="0.8" />
          <circle cx="22" cy="20" r="0.5" fill="white" opacity="0.6" />

          {/* Gradients */}
          <defs>
            <linearGradient
              id="paint0_linear"
              x1="12"
              y1="24"
              x2="26"
              y2="48"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#ff9900" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Mascot 2: Cyber-Monkey Mascot on Hoverboard (Floating left side) */}
      <div
        className="absolute left-4 bottom-3 w-16 h-24 z-20 pointer-events-none animate-float-monkey"
        style={{ animationDelay: '0.8s' }}
      >
        <svg className="w-full h-full" viewBox="0 0 64 80" fill="none">
          {/* Hoverboard glow */}
          <ellipse cx="24" cy="62" rx="14" ry="3" fill="#8b5cf6" opacity="0.3" />
          {/* Hoverboard */}
          <path
            d="M8 58 L40 58 L46 62 L14 62 Z"
            fill="#1e1b4b"
            stroke="#8b5cf6"
            strokeWidth="1.5"
          />
          <ellipse cx="27" cy="60" rx="15" ry="1.5" fill="#8b5cf6" opacity="0.6" />

          {/* Monkey Body */}
          <circle cx="24" cy="40" r="10" fill="#2e1065" stroke="#8b5cf6" strokeWidth="1.5" />
          <circle cx="24" cy="40" r="7" fill="#4c1d95" />

          {/* Monkey Head */}
          <circle cx="24" cy="24" r="9" fill="#2e1065" stroke="#8b5cf6" strokeWidth="1.8" />
          {/* Face mask shape */}
          <ellipse cx="24" cy="25" rx="7" ry="5.5" fill="#f5d0a9" opacity="0.9" />
          <path
            d="M 21 23 Q 24 24 27 23"
            stroke="#2e1065"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Cybernetic glowing goggles */}
          <rect
            x="16"
            y="19"
            width="16"
            height="5"
            rx="2.5"
            fill="rgba(255, 153, 0, 0.3)"
            stroke="#ff9900"
            strokeWidth="1"
          />
          <circle cx="20" cy="21.5" r="0.75" fill="#ff9900" />
          <circle cx="28" cy="21.5" r="0.75" fill="#ff9900" />

          {/* Ears */}
          <circle cx="14" cy="24" r="3" fill="#2e1065" stroke="#8b5cf6" strokeWidth="1" />
          <circle cx="34" cy="24" r="3" fill="#2e1065" stroke="#8b5cf6" strokeWidth="1" />

          {/* Waving hand */}
          <path
            d="M15 42 Q 10 38 8 32"
            stroke="#8b5cf6"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="animate-wave-arm"
          />
          {/* Regular arm */}
          <path d="M33 42 Q 38 43 39 48" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round" />

          {/* Legs */}
          <path d="M19 50 L16 58" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M29 50 L32 58" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Center: Glowing Card containing dynamic Tips */}
      <div className="flex flex-col items-center justify-center text-center max-w-[190px] md:max-w-[210px] z-10 px-2 gap-2">
        <div className="flex items-center gap-1.5 text-brand text-[10px] font-extrabold tracking-widest uppercase">
          <Sparkles className="h-3.5 w-3.5 text-brand animate-pulse" />
          <span>MATCHING LOUNGE</span>
        </div>

        {/* Glass panel wrapping active tip text */}
        <div className="h-14 flex items-center justify-center bg-foreground/[0.02] border border-border/20 px-3 py-1.5 rounded-xl shadow-inner min-w-[170px]">
          <p className="text-[11px] text-muted-foreground leading-relaxed font-medium transition-all duration-300 animate-in fade-in duration-300">
            {tips[activeTip]}
          </p>
        </div>
      </div>

      {/* Visual representation of active connection scanning (Holographic Card floating by) */}
      <div className="absolute inset-x-0 top-1.5 flex justify-center pointer-events-none z-0">
        <div className="flex items-center gap-2 bg-gradient-to-r from-brand/5 to-accent/5 border border-brand/10 rounded-full px-3 py-1 text-[10px] font-mono text-muted-foreground/60 shadow-sm animate-card-slide">
          <Users className="h-3 w-3 text-brand/60" />
          <span>Searching nearby peers...</span>
        </div>
      </div>
    </div>
  );
}
