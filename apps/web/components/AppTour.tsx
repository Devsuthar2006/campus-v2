'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, ArrowRight, ArrowLeft, X, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuth } from './AuthProvider';
import { cn } from '../lib/utils';

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  fallbackRoute?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'brand-logo',
    title: 'Welcome to AnonymousU! 🎓',
    content: "Let's take a quick 1-minute interactive tour of your new private digital campus.",
    position: 'center',
  },
  {
    targetId: 'nav-match',
    title: 'Anonymous Matching ⚡',
    content:
      'Instantly connect and text with random students from your university. Select matching preferences to filter who you meet.',
    position: 'bottom',
    fallbackRoute: '/match',
  },
  {
    targetId: 'nav-wall',
    title: 'Campus Wall 🏛️',
    content:
      'See what is happening around campus. Share updates, ask anonymous questions, and react to posts.',
    position: 'bottom',
    fallbackRoute: '/wall',
  },
  {
    targetId: 'nav-search',
    title: 'Campus Search 🔍',
    content:
      'Search for classmates and add friends. Your private @username is only visible to confirmed friends.',
    position: 'bottom',
    fallbackRoute: '/match',
  },
  {
    targetId: 'nav-settings',
    title: 'Privacy & Settings ⚙️',
    content: 'Control your online status, read receipts, and matching filter preferences anytime.',
    position: 'bottom',
    fallbackRoute: '/settings',
  },
];

export function AppTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1); // -1 means welcome prompt modal
  const [isActive, setIsActive] = useState(false);
  const [spotlightCoords, setSpotlightCoords] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    borderRadius: string;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const [attentionGlow, setAttentionGlow] = useState(false);

  const tooltipRef = useRef<HTMLDivElement>(null);

  // Initialize and check if tour should start
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    if (isActive) return; // Already running, don't reset index

    // Don't show if user hasn't finished profile creation yet
    if (user.accountStatus === 'pending_verification') return;

    // Don't show on login/onboarding pages
    if (pathname === '/' || pathname === '/onboarding') return;

    const completed = localStorage.getItem('anonymousu:tour_completed') === 'true';
    if (!completed) {
      setIsActive(true);
      setCurrentStepIndex(-1); // Start with welcome prompt
    }
  }, [user, pathname, isActive]);

  // Spotlight coordinates calculation helper
  const updateSpotlight = () => {
    if (currentStepIndex < 0 || currentStepIndex >= TOUR_STEPS.length) {
      setSpotlightCoords(null);
      setTooltipPos(null);
      return;
    }

    const step = TOUR_STEPS[currentStepIndex];
    if (!step) {
      setSpotlightCoords(null);
      setTooltipPos(null);
      return;
    }

    // Find targeted element (desktop link, mobile link, or custom ID)
    let el: HTMLElement | null = null;
    if (step.targetId.startsWith('nav-')) {
      const base = step.targetId.replace('nav-', '');
      const desktopEl = document.getElementById(`nav-${base}-desktop`);
      if (desktopEl && desktopEl.offsetWidth > 0) {
        el = desktopEl;
      } else {
        const mobileEl = document.getElementById(`nav-${base}-mobile`);
        if (mobileEl && mobileEl.offsetWidth > 0) {
          el = mobileEl;
        }
      }

      // Fallback for search button or other common ones
      if (!el) {
        const searchEl = document.getElementById(step.targetId);
        if (searchEl && searchEl.offsetWidth > 0) {
          el = searchEl;
        }
      }
    } else {
      el = document.getElementById(step.targetId);
    }

    if (!el) {
      setSpotlightCoords(null);
      setTooltipPos(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const radius = style.borderRadius || '8px';

    setSpotlightCoords({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      borderRadius: radius,
    });

    // Calculate tooltip position
    const tooltipWidth = 320;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 160;
    const padding = 12;

    let top = 0;
    let left = 0;

    if (step.position === 'bottom') {
      top = rect.bottom + padding;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    } else if (step.position === 'top') {
      top = rect.top - tooltipHeight - padding;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
    } else if (step.position === 'left') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - padding;
    } else if (step.position === 'right') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + padding;
    }

    // Keep tooltip inside screen boundaries
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));
    top = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, top));

    setTooltipPos({ top, left });
  };

  // Re-calculate on resize, scroll, or step change
  useEffect(() => {
    if (!isActive || currentStepIndex < 0) return;

    // Attempt first calculation immediately
    updateSpotlight();

    let attempts = 0;
    const intervalId = setInterval(() => {
      attempts++;
      const step = TOUR_STEPS[currentStepIndex];
      if (!step) {
        clearInterval(intervalId);
        return;
      }

      let el: HTMLElement | null = null;
      if (step.targetId.startsWith('nav-')) {
        const base = step.targetId.replace('nav-', '');
        const desktopEl = document.getElementById(`nav-${base}-desktop`);
        if (desktopEl && desktopEl.offsetWidth > 0) el = desktopEl;
        else {
          const mobileEl = document.getElementById(`nav-${base}-mobile`);
          if (mobileEl && mobileEl.offsetWidth > 0) el = mobileEl;
        }
      } else {
        el = document.getElementById(step.targetId);
      }

      if (el) {
        updateSpotlight();
        clearInterval(intervalId);
      } else if (attempts > 30) {
        // Stop polling after 1.5 seconds if element doesn't render
        clearInterval(intervalId);
      }
    }, 50);

    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [isActive, currentStepIndex, pathname]);

  // Watch for page navigation inside the tour
  const handleNext = async () => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx >= TOUR_STEPS.length) {
      handleComplete();
      return;
    }

    const nextStep = TOUR_STEPS[nextIdx];
    if (!nextStep) return;
    if (nextStep.fallbackRoute && pathname !== nextStep.fallbackRoute) {
      router.push(nextStep.fallbackRoute);
    }
    setCurrentStepIndex(nextIdx);
  };

  const handleBack = () => {
    const prevIdx = currentStepIndex - 1;
    if (prevIdx < 0) return;

    const prevStep = TOUR_STEPS[prevIdx];
    if (!prevStep) return;
    if (prevStep.fallbackRoute && pathname !== prevStep.fallbackRoute) {
      router.push(prevStep.fallbackRoute);
    }
    setCurrentStepIndex(prevIdx);
  };

  const handleStart = () => {
    setCurrentStepIndex(0);
  };

  const handleSkip = () => {
    localStorage.setItem('anonymousu:tour_completed', 'true');
    setIsActive(false);
  };

  const handleCloseTemporary = () => {
    setIsActive(false);
  };

  const handleOutsideClick = () => {
    setAttentionGlow(true);
    setTimeout(() => setAttentionGlow(false), 500);
  };

  const handleComplete = () => {
    localStorage.setItem('anonymousu:tour_completed', 'true');
    setIsActive(false);
  };

  if (!isActive) return null;

  // Render Welcome Prompt Modal
  if (currentStepIndex === -1) {
    return (
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-space-4 animate-in fade-in duration-300">
        <div className="bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-space-6 max-w-sm w-full flex flex-col gap-space-4 text-center select-none animate-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Sparkles className="h-7 w-7 animate-pulse" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-h2 text-foreground font-semibold">Welcome to your Campus!</h2>
            <p className="text-caption text-muted-foreground">
              AnonymousU connects you privately with your fellow students. Take a quick 1-minute
              tour to see how it works!
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button type="button" onClick={handleStart} className="w-full">
              Let's Go!
            </Button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-caption font-medium hover:bg-muted/40 text-muted-foreground py-2 rounded-xl transition-colors"
            >
              Skip, I know my way around
            </button>
          </div>
        </div>
      </div>
    );
  }

  const step = TOUR_STEPS[currentStepIndex];
  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none">
      {/* Invisible pointer trap layer */}
      <div
        className="absolute inset-0 transition-all duration-300 pointer-events-auto"
        onClick={handleOutsideClick}
      />
      {/* Sliding Spotlight */}
      {spotlightCoords && (
        <div
          className="absolute border border-brand/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] ring-4 ring-brand/20 transition-all duration-300 ease-out"
          style={{
            top: spotlightCoords.y - 4,
            left: spotlightCoords.x - 4,
            width: spotlightCoords.width + 8,
            height: spotlightCoords.height + 8,
            borderRadius: `calc(${spotlightCoords.borderRadius} + 4px)`,
          }}
        />
      )}
      {/* Floating Tooltip Card */}
      <div
        ref={tooltipRef}
        className={cn(
          'fixed bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl p-5 rounded-2xl w-[320px] max-w-[calc(100vw-2rem)] flex flex-col gap-4 pointer-events-auto transition-all duration-300 ease-out animate-in zoom-in-95 duration-200',
          attentionGlow &&
            'scale-[1.02] ring-4 ring-brand/50 shadow-brand/20 shadow-2xl border-brand/50',
        )}
        style={
          tooltipPos && currentStepIndex > 0
            ? { top: tooltipPos.top, left: tooltipPos.left }
            : {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }
        }
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <span className="text-body font-semibold text-foreground flex items-center gap-1.5">
            {currentStepIndex === 0 && <Sparkles className="h-4.5 w-4.5 text-brand shrink-0" />}
            {step.title}
          </span>
          <button
            type="button"
            onClick={handleCloseTemporary}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded-full hover:bg-muted/40"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Description Content */}
        <p className="text-caption text-muted-foreground leading-relaxed leading-normal">
          {step.content}
        </p>

        {/* Footer Controls */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-divider">
          {/* Step Indicators */}
          <div className="flex gap-1.5 items-center">
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex ? 'w-4 bg-brand' : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-8 items-center justify-center rounded-xl border border-border bg-background px-3 text-caption font-medium hover:bg-muted/40 transition-colors text-muted-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Back</span>
              </button>
            )}
            <Button
              type="button"
              onClick={handleNext}
              size="sm"
              className="rounded-xl h-8 px-4 text-caption flex items-center gap-1 font-semibold"
            >
              <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}</span>
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <Check className="h-3.5 w-3.5 shrink-0 ml-0.5" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 ml-0.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
