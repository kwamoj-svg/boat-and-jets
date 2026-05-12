"use client";

import React from "react";

const destinations = [
  { name: "Monaco", top: "28%", left: "52%" },
  { name: "Sardinia", top: "32%", left: "50%" },
  { name: "Ibiza", top: "34%", left: "46%" },
  { name: "Greek Islands", top: "33%", left: "56%" },
  { name: "Caribbean", top: "42%", left: "28%" },
  { name: "Miami", top: "38%", left: "25%" },
  { name: "Dubai", top: "38%", left: "64%" },
  { name: "Maldives", top: "48%", left: "68%" },
  { name: "Seychelles", top: "52%", left: "62%" },
  { name: "Bahamas", top: "40%", left: "26%" },
  { name: "Amalfi", top: "31%", left: "51%" },
  { name: "Croatia", top: "30%", left: "53%" },
  { name: "Thailand", top: "44%", left: "74%" },
  { name: "Sydney", top: "68%", left: "82%" },
];

interface GlobeProps {
  highlightDestination?: string | null;
}

export function GlobeAnimation({ highlightDestination }: GlobeProps = {}) {
  return (
    <>
      <style>{`
        .globe-container {
          width: 400px;
          height: 400px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .globe-sphere {
          width: 340px;
          height: 340px;
          border-radius: 50%;
          position: relative;
          animation: globeRotate 20s linear infinite;
          transform-style: preserve-3d;
        }

        .globe-outline {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(200, 165, 90, 0.12);
        }

        /* Longitude lines (vertical meridians) */
        .longitude {
          position: absolute;
          top: 0;
          left: 50%;
          width: 0;
          height: 100%;
          border-left: 1px solid rgba(200, 165, 90, 0.1);
          transform-origin: 0 50%;
        }
        .longitude-0 { transform: rotateY(0deg); }
        .longitude-1 { transform: rotateY(30deg); }
        .longitude-2 { transform: rotateY(60deg); }
        .longitude-3 { transform: rotateY(90deg); }
        .longitude-4 { transform: rotateY(120deg); }
        .longitude-5 { transform: rotateY(150deg); }

        /* Elliptical longitude lines using border on stretched ellipses */
        .meridian {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          height: 100%;
          border-radius: 50%;
          border: 1px solid rgba(200, 165, 90, 0.1);
          box-sizing: border-box;
        }
        .meridian-0 { width: 100%; border-color: rgba(200, 165, 90, 0.12); }
        .meridian-1 { width: 87%; }
        .meridian-2 { width: 66%; }
        .meridian-3 { width: 38%; }
        .meridian-4 { width: 14%; border-color: rgba(200, 165, 90, 0.08); }

        /* Latitude lines (horizontal parallels) */
        .latitude {
          position: absolute;
          left: 0;
          width: 100%;
          border-radius: 50%;
          border: 1px solid rgba(200, 165, 90, 0.08);
          box-sizing: border-box;
        }
        .latitude-equator {
          top: 50%;
          transform: translateY(-50%);
          height: 0;
          border-top: 1px solid rgba(200, 165, 90, 0.13);
          border-radius: 0;
        }
        .latitude-1 {
          top: 50%;
          transform: translateY(-50%);
          height: 60%;
        }
        .latitude-2 {
          top: 50%;
          transform: translateY(-50%);
          height: 82%;
        }
        .latitude-3 {
          top: 50%;
          transform: translateY(-50%);
          height: 36%;
        }
        .latitude-4 {
          top: 50%;
          transform: translateY(-50%);
          height: 94%;
        }

        /* Destination dots */
        .dest-dot {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: rgba(200, 165, 90, 0.6);
          box-shadow: 0 0 6px rgba(200, 165, 90, 0.3), 0 0 12px rgba(200, 165, 90, 0.1);
          animation: pulseDot 3s ease-in-out infinite;
        }
        .dest-dot::after {
          content: '';
          position: absolute;
          top: -3px;
          left: -3px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1px solid rgba(200, 165, 90, 0.15);
          animation: pulseRing 3s ease-in-out infinite;
        }

        /* Stagger the pulse animations */
        .dest-dot:nth-child(2n) { animation-delay: -0.5s; }
        .dest-dot:nth-child(2n)::after { animation-delay: -0.5s; }
        .dest-dot:nth-child(3n) { animation-delay: -1.2s; }
        .dest-dot:nth-child(3n)::after { animation-delay: -1.2s; }
        .dest-dot:nth-child(5n) { animation-delay: -2s; }
        .dest-dot:nth-child(5n)::after { animation-delay: -2s; }
        .dest-dot:nth-child(7n) { animation-delay: -0.8s; }
        .dest-dot:nth-child(7n)::after { animation-delay: -0.8s; }

        /* Highlighted destination dot */
        .dest-dot-highlight {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(200, 165, 90, 1);
          box-shadow: 0 0 16px rgba(200, 165, 90, 0.8), 0 0 32px rgba(200, 165, 90, 0.4), 0 0 48px rgba(200, 165, 90, 0.2);
          animation: highlightPulse 1.5s ease-in-out infinite;
          z-index: 10;
          transform: translate(-2px, -2px);
        }
        .dest-dot-highlight::after {
          content: '';
          position: absolute;
          top: -8px;
          left: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid rgba(200, 165, 90, 0.5);
          animation: highlightRing 1.5s ease-in-out infinite;
        }
        .dest-dot-highlight::before {
          content: attr(data-label);
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          white-space: nowrap;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: rgba(200, 165, 90, 0.9);
          text-shadow: 0 0 8px rgba(200, 165, 90, 0.4);
          pointer-events: none;
        }

        @keyframes highlightPulse {
          0%, 100% { opacity: 0.8; transform: translate(-2px, -2px) scale(1); }
          50% { opacity: 1; transform: translate(-2px, -2px) scale(1.6); }
        }
        @keyframes highlightRing {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0; transform: scale(2.5); }
        }

        /* Dim other dots when one is highlighted */
        .globe-sphere.has-highlight .dest-dot {
          opacity: 0.2 !important;
          animation: none !important;
        }
        .globe-sphere.has-highlight .dest-dot::after {
          animation: none !important;
          opacity: 0 !important;
        }

        /* Ambient glow behind globe */
        .globe-glow {
          position: absolute;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(200, 165, 90, 0.04) 0%,
            rgba(200, 165, 90, 0.02) 40%,
            transparent 70%
          );
          pointer-events: none;
        }

        /* Brighter glow when destination highlighted */
        .globe-glow-highlight {
          position: absolute;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(200, 165, 90, 0.08) 0%,
            rgba(200, 165, 90, 0.04) 40%,
            transparent 70%
          );
          pointer-events: none;
          transition: opacity 0.5s ease;
        }

        @keyframes globeRotate {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }

        @keyframes pulseDot {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.3); }
        }

        @keyframes pulseRing {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0; transform: scale(2); }
        }
      `}</style>

      <div
        className="globe-container"
        aria-hidden="true"
        style={{ pointerEvents: "none" }}
      >
        <div className={highlightDestination ? "globe-glow-highlight" : "globe-glow"} />
        <div
          className={`globe-sphere ${highlightDestination ? "has-highlight" : ""}`}
          style={{
            perspective: "800px",
            animation: highlightDestination ? "none" : "globeRotate 20s linear infinite",
          }}
        >
          {/* Outer ring */}
          <div className="globe-outline" />

          {/* Meridians (longitude ellipses) */}
          <div className="meridian meridian-0" />
          <div className="meridian meridian-1" />
          <div className="meridian meridian-2" />
          <div className="meridian meridian-3" />
          <div className="meridian meridian-4" />

          {/* Latitudes */}
          <div className="latitude latitude-equator" />
          <div className="latitude latitude-1" />
          <div className="latitude latitude-2" />
          <div className="latitude latitude-3" />
          <div className="latitude latitude-4" />

          {/* Destination dots */}
          {destinations.map((dest) => {
            const isHighlighted = highlightDestination === dest.name;
            return isHighlighted ? (
              <div
                key={dest.name}
                className="dest-dot-highlight"
                data-label={dest.name}
                style={{ top: dest.top, left: dest.left }}
              />
            ) : (
              <div
                key={dest.name}
                className="dest-dot"
                title={dest.name}
                style={{ top: dest.top, left: dest.left }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

export default GlobeAnimation;
