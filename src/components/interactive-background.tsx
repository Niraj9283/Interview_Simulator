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
};

type Pointer = {
  x: number;
  y: number;
  active: boolean;
};

type MeshNeighbor = {
  particle: Particle;
  distanceSquared: number;
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

function buildParticles(width: number, height: number, isMobile = false) {
  const random = createRandom(20260521);
  const maxCap = isMobile ? 40 : 145;
  const minCap = isMobile ? 22 : 72;
  const count = Math.round(Math.min(maxCap, Math.max(minCap, (width * height) / (isMobile ? 18000 : 11800))));
  const clusterCount = isMobile ? 4 : 7;
  const clusters = Array.from({ length: clusterCount }, () => ({
    x: random() * width,
    y: random() * height,
  }));

  return Array.from({ length: count }, (_, index): Particle => {
    const clustered = random() > 0.22;
    const cluster = clusters[index % clusterCount];
    const spreadX = width * (0.12 + random() * 0.12);
    const spreadY = height * (0.12 + random() * 0.18);
    const x = clustered ? cluster.x + (random() - 0.5) * spreadX : random() * width;
    const y = clustered ? cluster.y + (random() - 0.5) * spreadY : random() * height;

    return {
      id: index,
      x,
      y,
      originX: x,
      originY: y,
      vx: (random() - 0.5) * 0.34,
      vy: (random() - 0.5) * 0.34,
      radius: 1.35 + random() * 1.45,
      phase: random() * Math.PI * 2,
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
    const isMobile =
      typeof window !== "undefined" &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768);
    const dpr = isMobile ? 1 : Math.min(2, window.devicePixelRatio || 1);
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
      particlesRef.current = buildParticles(state.width, state.height, isMobile);
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
      const margin = 90;

      if (particle.x < -margin) particle.x = state.width + margin;
      if (particle.x > state.width + margin) particle.x = -margin;
      if (particle.y < -margin) particle.y = state.height + margin;
      if (particle.y > state.height + margin) particle.y = -margin;
    }

    function paintBackground(targetCtx: CanvasRenderingContext2D, width: number, height: number) {
      const base = targetCtx.createLinearGradient(0, 0, width, height);
      base.addColorStop(0, "#1b0734");
      base.addColorStop(0.45, "#241044");
      base.addColorStop(1, "#150728");

      targetCtx.fillStyle = base;
      targetCtx.fillRect(0, 0, width, height);

      const glowA = targetCtx.createRadialGradient(
        width * 0.18,
        height * 0.52,
        0,
        width * 0.18,
        height * 0.52,
        width * 0.52,
      );
      glowA.addColorStop(0, "rgba(179, 28, 126, 0.2)");
      glowA.addColorStop(1, "rgba(179, 28, 126, 0)");
      targetCtx.fillStyle = glowA;
      targetCtx.fillRect(0, 0, width, height);

      const glowB = targetCtx.createRadialGradient(
        width * 0.76,
        height * 0.18,
        0,
        width * 0.76,
        height * 0.18,
        width * 0.46,
      );
      glowB.addColorStop(0, "rgba(95, 34, 134, 0.24)");
      glowB.addColorStop(1, "rgba(95, 34, 134, 0)");
      targetCtx.fillStyle = glowB;
      targetCtx.fillRect(0, 0, width, height);
    }

    function buildBackgroundCache(width: number, height: number, pixelRatio: number): BackgroundCache | null {
      const backgroundCanvas = document.createElement("canvas");
      const backgroundContext = backgroundCanvas.getContext("2d");

      if (!backgroundContext) {
        return null;
      }

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
      const speed = reducedMotionRef.current ? 0.22 : 1;
      const pointerStrength = pointer.active ? 0.015 : 0;

      for (const particle of particlesRef.current) {
        particle.x += particle.vx * speed + Math.sin(state.time * 0.006 + particle.phase) * 0.05;
        particle.y += particle.vy * speed + Math.cos(state.time * 0.005 + particle.phase) * 0.04;

        if (pointer.active) {
          const dx = pointer.x - particle.x;
          const dy = pointer.y - particle.y;
          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < 52000) {
            const force = (1 - distanceSquared / 52000) * pointerStrength;
            particle.x -= dx * force;
            particle.y -= dy * force;
          }
        }

        wrapParticle(particle);
      }
    }

    function paintMesh() {
      const particles = particlesRef.current;
      const maxDistance = Math.min(172, Math.max(118, state.width / 8.4));
      const maxDistanceSquared = maxDistance * maxDistance;
      const grid = new Map<string, Particle[]>();

      for (const particle of particles) {
        const cellX = Math.floor(particle.x / maxDistance);
        const cellY = Math.floor(particle.y / maxDistance);
        const key = `${cellX}:${cellY}`;
        const cell = grid.get(key);

        if (cell) {
          cell.push(particle);
        } else {
          grid.set(key, [particle]);
        }
      }

      ctx.lineWidth = 1;
      if (!isMobile) {
        ctx.shadowColor = "rgba(255, 44, 150, 0.35)";
        ctx.shadowBlur = 5;
      }

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        let nearest: MeshNeighbor | null = null;
        let secondNearest: MeshNeighbor | null = null;
        const cellX = Math.floor(particle.x / maxDistance);
        const cellY = Math.floor(particle.y / maxDistance);

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            const cell = grid.get(`${cellX + offsetX}:${cellY + offsetY}`);

            if (!cell) continue;

            for (const other of cell) {
              if (other.id <= particle.id) continue;

              const dx = particle.x - other.x;
              const dy = particle.y - other.y;
              const distanceSquared = dx * dx + dy * dy;

              if (distanceSquared > maxDistanceSquared) continue;

              if (!nearest || distanceSquared < nearest.distanceSquared) {
                secondNearest = nearest;
                nearest = { particle: other, distanceSquared };
              } else if (!secondNearest || distanceSquared < secondNearest.distanceSquared) {
                secondNearest = { particle: other, distanceSquared };
              }

              const alpha = (1 - Math.sqrt(distanceSquared) / maxDistance) * 0.68;
              ctx.strokeStyle = `rgba(255, 36, 143, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(other.x, other.y);
              ctx.stroke();
            }
          }
        }

        if (nearest && secondNearest) {
          const a = nearest.particle;
          const b = secondNearest.particle;

          ctx.fillStyle = "rgba(255, 36, 143, 0.032)";
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.closePath();
          ctx.fill();
        }
      }

      if (!isMobile) {
        ctx.shadowBlur = 10;
      }

      for (const particle of particles) {
        const pulse = 0.72 + Math.sin(state.time * 0.035 + particle.phase) * 0.28;
        ctx.fillStyle = `rgba(255, 43, 147, ${0.68 + pulse * 0.22})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius + pulse * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!isMobile) {
        ctx.shadowBlur = 0;
      }
    }

    let lastPaint = 0;
    function paint(now: number) {
      if (isMobile && now - lastPaint < 32) {
        frameRef.current = window.requestAnimationFrame(paint);
        return;
      }
      lastPaint = now;
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
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    frameRef.current = window.requestAnimationFrame(paint);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [reducedMotionRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className="interactive-bg" />;
}
