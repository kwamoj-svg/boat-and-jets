"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";

/* ── Destination coordinates (lon, lat) ── */
const DESTINATIONS: { name: string; lon: number; lat: number }[] = [
  { name: "Monaco", lon: 7.42, lat: 43.73 },
  { name: "Sardinia", lon: 9.12, lat: 40.12 },
  { name: "Ibiza", lon: 1.43, lat: 38.91 },
  { name: "Greek Islands", lon: 25.46, lat: 37.45 },
  { name: "Croatia", lon: 15.98, lat: 43.51 },
  { name: "Amalfi", lon: 14.60, lat: 40.63 },
  { name: "Caribbean", lon: -61.5, lat: 15.4 },
  { name: "Miami", lon: -80.19, lat: 25.76 },
  { name: "Bahamas", lon: -77.35, lat: 25.03 },
  { name: "Dubai", lon: 55.27, lat: 25.2 },
  { name: "Maldives", lon: 73.22, lat: 3.2 },
  { name: "Seychelles", lon: 55.49, lat: -4.68 },
  { name: "Thailand", lon: 100.99, lat: 12.57 },
  { name: "Sydney", lon: 151.21, lat: -33.87 },
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

/* ── Component ── */
interface GlobeCanvasProps {
  highlightDestination?: string | null;
  size?: number;
}

export function GlobeCanvas({ highlightDestination, size = 420 }: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [polygons, setPolygons] = useState<number[][][][]>([]);
  const animRef = useRef<number>(0);
  const rotRef = useRef<number>(-20);
  const targetRotRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // Fetch world data
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
      .then((r) => r.json())
      .then((topo: TopoJSON) => setPolygons(getPolygons(topo)))
      .catch(() => {});
  }, []);

  // Set target rotation when destination selected
  useEffect(() => {
    if (highlightDestination) {
      const dest = DESTINATIONS.find((d) => d.name === highlightDestination);
      if (dest) targetRotRef.current = dest.lon;
    } else {
      targetRotRef.current = null;
    }
  }, [highlightDestination]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      const dpr = window.devicePixelRatio || 1;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) * 0.88;
      const rotLat = 15;

      // Rotation
      if (targetRotRef.current !== null) {
        // Ease toward target
        const diff = targetRotRef.current - rotRef.current;
        const shortDiff = ((diff + 540) % 360) - 180;
        rotRef.current += shortDiff * 0.04;
      } else {
        rotRef.current += 0.12;
      }
      const rotLon = rotRef.current;

      ctx.clearRect(0, 0, w * dpr, h * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);

      // Atmosphere glow
      const atmoGrad = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.2);
      atmoGrad.addColorStop(0, "rgba(200, 165, 90, 0.06)");
      atmoGrad.addColorStop(0.5, "rgba(200, 165, 90, 0.03)");
      atmoGrad.addColorStop(1, "transparent");
      ctx.fillStyle = atmoGrad;
      ctx.fillRect(0, 0, w, h);

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
        for (let lon = -180; lon <= 180; lon += 2) {
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
        for (let lat = -90; lat <= 90; lat += 2) {
          const p = ortho(lon, lat, cx, cy, r, rotLon, rotLat);
          if (p.visible) {
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
          } else { started = false; }
        }
        ctx.stroke();
      }

      // Draw land polygons
      for (const poly of polygons) {
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

        const isHighlighted = highlightDestination === dest.name;

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
          const alpha = highlightDestination ? 0.2 : 0.5 + pulse * 0.2;
          const dotR = highlightDestination ? 2 : 2.5 + pulse * 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 165, 90, ${alpha})`;
          ctx.fill();

          if (!highlightDestination) {
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
    },
    [polygons, highlightDestination]
  );

  // Animation loop
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
    const loop = (t: number) => {
      if (!running) return;
      timeRef.current = t;
      draw(ctx, size, size, t);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [size, draw]);

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
