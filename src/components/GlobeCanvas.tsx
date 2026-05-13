"use client";

import React, { useRef, useEffect, useState } from "react";

/* ── Destination coordinates (lon, lat) ── */
const DESTINATIONS: { name: string; lon: number; lat: number }[] = [
  // Mittelmeer
  { name: "Monaco", lon: 7.42, lat: 43.73 },
  { name: "Sardinia", lon: 9.12, lat: 40.12 },
  { name: "Ibiza", lon: 1.43, lat: 38.91 },
  { name: "Mallorca", lon: 2.65, lat: 39.57 },
  { name: "Greek Islands", lon: 25.46, lat: 37.45 },
  { name: "Croatia", lon: 15.98, lat: 43.51 },
  { name: "Amalfi", lon: 14.60, lat: 40.63 },
  { name: "Côte d'Azur", lon: 6.85, lat: 43.58 },
  { name: "Sicily", lon: 14.27, lat: 37.6 },
  { name: "Corsica", lon: 9.1, lat: 42.15 },
  { name: "Montenegro", lon: 18.8, lat: 42.29 },
  { name: "Turkey", lon: 28.98, lat: 36.85 },
  // Karibik & Amerika
  { name: "Caribbean", lon: -61.5, lat: 15.4 },
  { name: "Miami", lon: -80.19, lat: 25.76 },
  { name: "Bahamas", lon: -77.35, lat: 25.03 },
  { name: "BVI", lon: -64.62, lat: 18.43 },
  { name: "St. Barths", lon: -62.83, lat: 17.9 },
  { name: "Antigua", lon: -61.8, lat: 17.09 },
  { name: "Cancún", lon: -86.85, lat: 21.16 },
  // Naher Osten & Indischer Ozean
  { name: "Dubai", lon: 55.27, lat: 25.2 },
  { name: "Oman", lon: 57.0, lat: 23.6 },
  { name: "Maldives", lon: 73.22, lat: 3.2 },
  { name: "Seychelles", lon: 55.49, lat: -4.68 },
  // Asien & Ozeanien
  { name: "Thailand", lon: 100.99, lat: 12.57 },
  { name: "Bali", lon: 115.19, lat: -8.41 },
  { name: "Sydney", lon: 151.21, lat: -33.87 },
  { name: "Whitsundays", lon: 148.95, lat: -20.26 },
  // Nordeuropa
  { name: "Skandinavien", lon: 11.97, lat: 57.71 },
  { name: "Ostsee", lon: 13.4, lat: 54.35 },
  { name: "Hamburg", lon: 9.99, lat: 53.55 },
];

/* ── Minimal TopoJSON decoder ── */
interface TopoJSON {
  type: "Topology";
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  objects: Record<string, { type: string; geometries?: { type: string; arcs: any }[] }>;
}

function decodeArcs(topo: TopoJSON): number[][][] {
  const { scale, translate } = topo.transform;
  return topo.arcs.map((arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
}

function resolveRings(arcs: number[][][], arcIndices: number[][]): number[][][] {
  return arcIndices.map((ring) => {
    const coords: number[][] = [];
    for (const idx of ring) {
      const arc = idx >= 0 ? arcs[idx] : arcs[~idx].slice().reverse();
      coords.push(...(coords.length > 0 ? arc.slice(1) : arc));
    }
    return coords;
  });
}

function getPolygons(topo: TopoJSON): number[][][][] {
  const arcs = decodeArcs(topo);
  const polys: number[][][][] = [];
  const land = topo.objects.land;
  if (!land?.geometries) return polys;
  for (const geom of land.geometries) {
    if (geom.type === "Polygon") {
      polys.push(resolveRings(arcs, geom.arcs));
    } else if (geom.type === "MultiPolygon") {
      for (const polyArcs of geom.arcs) {
        polys.push(resolveRings(arcs, polyArcs));
      }
    }
  }
  return polys;
}

/* ── Orthographic projection ── */
function ortho(
  lon: number, lat: number,
  cx: number, cy: number, r: number,
  rotLon: number, rotLat: number
): { x: number; y: number; visible: boolean } {
  const lambda = ((lon - rotLon) * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const phi0 = (rotLat * Math.PI) / 180;
  const cosc =
    Math.sin(phi0) * Math.sin(phi) +
    Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);
  const x = cx + r * Math.cos(phi) * Math.sin(lambda);
  const y = cy - r * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda));
  return { x, y, visible: cosc > 0 };
}

/* ── Module-level polygon cache to avoid refetching ── */
let cachedPolygons: number[][][][] | null = null;
let fetchPromise: Promise<number[][][][]> | null = null;

function fetchPolygons(): Promise<number[][][][]> {
  if (cachedPolygons) return Promise.resolve(cachedPolygons);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
    .then((r) => r.json())
    .then((topo: TopoJSON) => {
      cachedPolygons = getPolygons(topo);
      return cachedPolygons;
    })
    .catch(() => {
      fetchPromise = null; // allow retry on next mount
      return [];
    });
  return fetchPromise;
}

/* ── Component ── */
interface GlobeCanvasProps {
  highlightDestination?: string | null;
  size?: number;
}

export function GlobeCanvas({ highlightDestination, size = 420 }: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [polygons, setPolygons] = useState<number[][][][]>(cachedPolygons || []);

  // Store mutable state in refs so the animation loop doesn't need to restart
  const stateRef = useRef({
    polygons: polygons,
    highlight: highlightDestination || null,
    rot: -20,
    targetRot: null as number | null,
  });

  // Keep refs in sync with props (no effect restarts needed)
  stateRef.current.polygons = polygons;
  stateRef.current.highlight = highlightDestination || null;

  // Update target rotation when destination changes
  useEffect(() => {
    if (highlightDestination) {
      const dest = DESTINATIONS.find((d) => d.name === highlightDestination);
      if (dest) stateRef.current.targetRot = dest.lon;
    } else {
      stateRef.current.targetRot = null;
    }
  }, [highlightDestination]);

  // Fetch world data (cached at module level)
  useEffect(() => {
    if (cachedPolygons) {
      setPolygons(cachedPolygons);
      return;
    }
    let cancelled = false;
    fetchPolygons().then((p) => {
      if (!cancelled && p.length > 0) setPolygons(p);
    });
    return () => { cancelled = true; };
  }, []);

  // Single stable animation loop — only restarts if `size` changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    let running = true;
    let lastFrame = 0;
    const TARGET_FPS = 30; // 30fps is plenty for a slowly rotating globe
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const loop = (t: number) => {
      if (!running) return;

      // Throttle to ~30fps
      const delta = t - lastFrame;
      if (delta < FRAME_INTERVAL) {
        requestAnimationFrame(loop);
        return;
      }
      lastFrame = t - (delta % FRAME_INTERVAL);

      const s = stateRef.current;
      const cx = size / 2;
      const cy = size / 2;
      const r = Math.min(cx, cy) * 0.88;
      const rotLat = 15;

      // Smooth rotation
      if (s.targetRot !== null) {
        const diff = s.targetRot - s.rot;
        const shortDiff = ((diff + 540) % 360) - 180;
        s.rot += shortDiff * 0.04;
      } else {
        s.rot += 0.08; // slightly slower idle rotation
      }
      const rotLon = s.rot;

      ctx.clearRect(0, 0, size * dpr, size * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);

      // Atmosphere glow
      const atmoGrad = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.2);
      atmoGrad.addColorStop(0, "rgba(200, 165, 90, 0.06)");
      atmoGrad.addColorStop(0.5, "rgba(200, 165, 90, 0.03)");
      atmoGrad.addColorStop(1, "transparent");
      ctx.fillStyle = atmoGrad;
      ctx.fillRect(0, 0, size, size);

      // Ocean sphere
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const oceanGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      oceanGrad.addColorStop(0, "#132a4a");
      oceanGrad.addColorStop(0.7, "#0d1f38");
      oceanGrad.addColorStop(1, "#091728");
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Globe border
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(200, 165, 90, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Clip to sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // Graticule (lat/lon lines)
      ctx.strokeStyle = "rgba(200, 165, 90, 0.04)";
      ctx.lineWidth = 0.5;
      for (let lat = -80; lat <= 80; lat += 20) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 3) {
          const p = ortho(lon, lat, cx, cy, r, rotLon, rotLat);
          if (p.visible) {
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
          } else { started = false; }
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = ortho(lon, lat, cx, cy, r, rotLon, rotLat);
          if (p.visible) {
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
          } else { started = false; }
        }
        ctx.stroke();
      }

      // Draw land polygons
      for (const poly of s.polygons) {
        for (const ring of poly) {
          ctx.beginPath();
          let lastVisible = false;
          let hasVisiblePoint = false;
          for (let i = 0; i < ring.length; i++) {
            const [lon, lat] = ring[i];
            const p = ortho(lon, lat, cx, cy, r, rotLon, rotLat);
            if (p.visible) {
              hasVisiblePoint = true;
              if (!lastVisible) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
              lastVisible = true;
            } else {
              lastVisible = false;
            }
          }
          if (hasVisiblePoint) {
            ctx.fillStyle = "rgba(200, 165, 90, 0.12)";
            ctx.fill();
            ctx.strokeStyle = "rgba(200, 165, 90, 0.35)";
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Destination dots
      const pulse = Math.sin(t * 0.003) * 0.5 + 0.5;
      for (const dest of DESTINATIONS) {
        const p = ortho(dest.lon, dest.lat, cx, cy, r, rotLon, rotLat);
        if (!p.visible) continue;

        const isHighlighted = s.highlight === dest.name;

        if (isHighlighted) {
          // Outer ring pulse
          const ringR = 14 + pulse * 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(200, 165, 90, ${0.15 + pulse * 0.15})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Inner ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8 + pulse * 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(200, 165, 90, ${0.3 + pulse * 0.2})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Bright dot
          const dotGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
          dotGrad.addColorStop(0, "rgba(200, 165, 90, 1)");
          dotGrad.addColorStop(0.6, "rgba(200, 165, 90, 0.6)");
          dotGrad.addColorStop(1, "rgba(200, 165, 90, 0)");
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = dotGrad;
          ctx.fill();

          // Glow
          const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 30);
          glowGrad.addColorStop(0, "rgba(200, 165, 90, 0.15)");
          glowGrad.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
          ctx.fillStyle = glowGrad;
          ctx.fill();

          // Label
          ctx.font = "600 11px system-ui, sans-serif";
          ctx.fillStyle = "rgba(200, 165, 90, 0.9)";
          ctx.textAlign = "center";
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = 4;
          ctx.fillText(dest.name, p.x, p.y - 18);
          ctx.shadowBlur = 0;
        } else {
          // Small dot
          const alpha = s.highlight ? 0.2 : 0.5 + pulse * 0.2;
          const dotR = s.highlight ? 2 : 2.5 + pulse * 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 165, 90, ${alpha})`;
          ctx.fill();

          if (!s.highlight) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5 + pulse * 3, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 165, 90, ${0.1 + pulse * 0.05})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      ctx.restore(); // clip
      ctx.restore(); // scale

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
    return () => { running = false; };
  }, [size]); // Only restart loop if size changes

  return (
    <canvas
      ref={canvasRef}
      className="block"
      style={{ width: size, height: size, pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}

export default GlobeCanvas;
