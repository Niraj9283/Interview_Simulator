"use client";

import { useEffect, useRef } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  radius: number;
  phase: number;
  isAccent: boolean;
};

type Pointer = {
  x: number;
  y: number;
  active: boolean;
};

type BackgroundCache = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

function createRandom(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function usePrefersReducedMotion() {
  const ref = useRef(false);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      ref.current = mediaQuery.matches;
    };
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return ref;
}

function buildParticles(width: number, height: number): Particle[] {
  const random = createRandom(20261016);
  const count = Math.round(Math.min(45, Math.max(24, (width * height) / 32000)));

  return Array.from({ length: count }, (_, index): Particle => {
    const x = random() * width;
    const y = random() * height;
    const isAccent = index % 3 === 0;

    return {
      id: index,
      x,
      y,
      originX: x,
      originY: y,
      vx: (random() - 0.5) * 0.28,
      vy: (random() - 0.5) * 0.28,
      radius: isAccent ? 1.4 : 1.1,
      phase: random() * Math.PI * 2,
      isAccent,
    };
  });
}

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const backgroundRef = useRef<BackgroundCache | null>(null);
  const reducedMotionRef = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const activeCanvas = canvas;
    const ctx = context;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const pointer: Pointer = { x: 0, y: 0, active: false };
    const state = { width: 0, height: 0, time: 0 };

    function resize() {
      state.width = Math.max(320, window.innerWidth);
      state.height = Math.max(420, window.innerHeight);
      activeCanvas.width = Math.floor(state.width * dpr);
      activeCanvas.height = Math.floor(state.height * dpr);
      activeCanvas.style.width = `${state.width}px`;
      activeCanvas.style.height = `${state.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = buildParticles(state.width, state.height);
      backgroundRef.current = buildBackgroundCache(state.width, state.height, dpr);
    }

    function movePointer(clientX: number, clientY: number) {
      pointer.x = clientX;
      pointer.y = clientY;
      pointer.active = true;
    }

    function handleMouseMove(event: MouseEvent) {
      movePointer(event.clientX, event.clientY);
    }

    function handleMouseLeave() {
      pointer.active = false;
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (touch) {
        movePointer(touch.clientX, touch.clientY);
      }
    }

    function wrapParticle(particle: Particle) {
      const margin = 80;
      if (particle.x < -margin) particle.x = state.width + margin;
      if (particle.x > state.width + margin) particle.x = -margin;
      if (particle.y < -margin) particle.y = state.height + margin;
      if (particle.y > state.height + margin) particle.y = -margin;
    }

    function paintBackground(targetCtx: CanvasRenderingContext2D, width: number, height: number) {
      // Near-black base (#080808)
      targetCtx.fillStyle = "#080808";
      targetCtx.fillRect(0, 0, width, height);

      // Subtle ambient red-orange glow #FF4D3D
      const glowA = targetCtx.createRadialGradient(
        width * 0.2,
        height * 0.25,
        0,
        width * 0.2,
        height * 0.25,
        width * 0.55
      );
      glowA.addColorStop(0, "rgba(255, 77, 61, 0.07)");
      glowA.addColorStop(1, "rgba(255, 77, 61, 0)");
      targetCtx.fillStyle = glowA;
      targetCtx.fillRect(0, 0, width, height);

      // Deep secondary subtle glow #D9362B
      const glowB = targetCtx.createRadialGradient(
        width * 0.82,
        height * 0.75,
        0,
        width * 0.82,
        height * 0.75,
        width * 0.5
      );
      glowB.addColorStop(0, "rgba(217, 54, 43, 0.05)");
      glowB.addColorStop(1, "rgba(217, 54, 43, 0)");
      targetCtx.fillStyle = glowB;
      targetCtx.fillRect(0, 0, width, height);

      // Fine geometric technical grid lines
      targetCtx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      targetCtx.lineWidth = 1;
      const gridSize = 64;

      for (let x = 0; x < width; x += gridSize) {
        targetCtx.beginPath();
        targetCtx.moveTo(x, 0);
        targetCtx.lineTo(x, height);
        targetCtx.stroke();
      }

      for (let y = 0; y < height; y += gridSize) {
        targetCtx.beginPath();
        targetCtx.moveTo(0, y);
        targetCtx.lineTo(width, y);
        targetCtx.stroke();
      }
    }

    function buildBackgroundCache(
      width: number,
      height: number,
      pixelRatio: number
    ): BackgroundCache | null {
      const backgroundCanvas = document.createElement("canvas");
      const backgroundContext = backgroundCanvas.getContext("2d");

      if (!backgroundContext) return null;

      backgroundCanvas.width = Math.floor(width * pixelRatio);
      backgroundCanvas.height = Math.floor(height * pixelRatio);
      backgroundContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      paintBackground(backgroundContext, width, height);

      return {
        canvas: backgroundCanvas,
        width,
        height,
      };
    }

    function updateParticles() {
      const speed = reducedMotionRef.current ? 0.2 : 0.85;
      const pointerStrength = pointer.active ? 0.012 : 0;

      for (const particle of particlesRef.current) {
        particle.x += particle.vx * speed + Math.sin(state.time * 0.005 + particle.phase) * 0.04;
        particle.y += particle.vy * speed + Math.cos(state.time * 0.004 + particle.phase) * 0.03;

        if (pointer.active) {
          const dx = pointer.x - particle.x;
          const dy = pointer.y - particle.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < 45000) {
            const force = (1 - distanceSquared / 45000) * pointerStrength;
            particle.x -= dx * force;
            particle.y -= dy * force;
          }
        }

        wrapParticle(particle);
      }
    }

    function paintMesh() {
      const particles = particlesRef.current;
      const maxDistance = Math.min(160, Math.max(110, state.width / 9));
      const maxDistanceSquared = maxDistance * maxDistance;

      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared > maxDistanceSquared) continue;

          const ratio = 1 - Math.sqrt(distanceSquared) / maxDistance;
          const hasAccent = particle.isAccent || other.isAccent;

          if (hasAccent) {
            ctx.strokeStyle = `rgba(255, 77, 61, ${ratio * 0.25})`;
          } else {
            ctx.strokeStyle = `rgba(255, 255, 255, ${ratio * 0.08})`;
          }

          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      }

      // Render technical geometric particle nodes
      for (const particle of particles) {
        const pulse = 0.8 + Math.sin(state.time * 0.03 + particle.phase) * 0.2;

        if (particle.isAccent) {
          ctx.fillStyle = `rgba(255, 77, 61, ${0.45 + pulse * 0.25})`;
        } else {
          ctx.fillStyle = `rgba(200, 200, 200, ${0.25 + pulse * 0.15})`;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function paint() {
      state.time += 1;
      const background = backgroundRef.current;

      if (background) {
        ctx.drawImage(background.canvas, 0, 0, background.width, background.height);
      } else {
        paintBackground(ctx, state.width, state.height);
      }

      updateParticles();
      paintMesh();
      frameRef.current = window.requestAnimationFrame(paint);
    }

    resize();
    paint();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [reducedMotionRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className="interactive-bg" />;
}
