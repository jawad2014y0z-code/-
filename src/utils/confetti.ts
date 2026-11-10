import confetti from 'canvas-confetti';
import { soundManager } from './audio';

/**
 * Universal Victory Celebration System (Confetti & Applause)
 * Triggers multi-stage canvas confetti cannons + applause audio sound effect
 */
export function fireVictoryCelebration(customText?: string) {
  // 1. Play realistic crowd applause and fanfare chords
  soundManager.playApplause();

  // 2. Wave 1: Immediate Left & Right Cannons
  confetti({
    particleCount: 80,
    angle: 60,
    spread: 60,
    origin: { x: 0, y: 0.75 },
    colors: ['#ffd700', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff'],
    ticks: 300,
    gravity: 0.9,
    scalar: 1.1,
  });

  confetti({
    particleCount: 80,
    angle: 120,
    spread: 60,
    origin: { x: 1, y: 0.75 },
    colors: ['#ffd700', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff'],
    ticks: 300,
    gravity: 0.9,
    scalar: 1.1,
  });

  // 3. Wave 2: Starburst Center Fireworks (at 300ms)
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { x: 0.5, y: 0.45 },
      colors: ['#ffd700', '#fbbf24', '#f59e0b', '#ef4444', '#8b5cf6'],
      shapes: ['star', 'circle'],
      scalar: 1.3,
      ticks: 350,
      gravity: 0.8,
    });
  }, 300);

  // 4. Wave 3: Grand Finale Showers (at 750ms and 1400ms)
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 70,
      spread: 70,
      origin: { x: 0.1, y: 0.8 },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ffd700'],
      ticks: 280,
    });
    confetti({
      particleCount: 60,
      angle: 110,
      spread: 70,
      origin: { x: 0.9, y: 0.8 },
      colors: ['#ec4899', '#8b5cf6', '#f59e0b', '#ffd700'],
      ticks: 280,
    });
  }, 750);

  setTimeout(() => {
    confetti({
      particleCount: 70,
      spread: 120,
      origin: { x: 0.5, y: 0.35 },
      colors: ['#ffd700', '#f59e0b', '#ffffff'],
      shapes: ['star'],
      scalar: 1.2,
      ticks: 300,
    });
  }, 1400);
}

/**
 * Quick local burst for small achievements / round wins
 */
export function fireQuickConfetti(x = 0.5, y = 0.5) {
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { x, y },
    colors: ['#ffd700', '#f59e0b', '#10b981'],
    ticks: 200,
  });
}

// Backward-compatible alias for all games
export const triggerConfetti = fireVictoryCelebration;

