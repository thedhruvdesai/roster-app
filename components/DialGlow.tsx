"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export interface GlowArc {
  /** Clock angle in degrees, 0 = midnight at the top, clockwise */
  start: number;
  sweep: number;
  color: string;
}

const FOV = 30;
// Canvas is drawn 1.3x the dial; the SVG ring radius is 96/268 of the dial width.
const RING_FRACTION = 96 / 268 / 1.3;
const DIST = 1 / RING_FRACTION / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);

/** Gaussian-ish random, so dust clusters on the ring and thins out at the edges */
const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

function Dust({ arcs, still, haloColor }: { arcs: GlowArc[]; still: boolean; haloColor: string }) {
  const ring = useRef<THREE.Points>(null);
  const halo = useRef<THREE.Points>(null);
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 0, DIST);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Shift dust: sits exactly on each shift's arc in its employer colour
  const shiftGeo = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    for (const a of arcs) {
      c.set(a.color);
      const n = Math.max(60, Math.round(a.sweep * 7));
      for (let i = 0; i < n; i++) {
        const th = ((a.start + Math.random() * a.sweep) * Math.PI) / 180;
        const r = 1 + g() * 0.13;
        pos.push(Math.sin(th) * r, Math.cos(th) * r, g() * 0.25);
        const k = 0.6 + Math.random() * 0.4;
        col.push(c.r * k, c.g * k, c.b * k);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return geo;
  }, [arcs]);

  // Night-sky halo: faint drifting dust around the whole clock
  const haloGeo = useMemo(() => {
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const r = 1 + g() * 0.32;
      pos[i * 3] = Math.sin(th) * r;
      pos[i * 3 + 1] = Math.cos(th) * r;
      pos[i * 3 + 2] = g() * 0.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.getElapsedTime();
    if (halo.current) halo.current.rotation.z = -t * 0.03;
    if (group.current) {
      // A slow breathing tilt gives the dust real depth without moving the arcs off their hours
      group.current.rotation.x = Math.sin(t * 0.35) * 0.16;
      group.current.rotation.y = Math.cos(t * 0.27) * 0.16;
    }
    if (ring.current) (ring.current.material as THREE.PointsMaterial).opacity = 0.75 + Math.sin(t * 1.6) * 0.15;
  });

  return (
    <group ref={group}>
      <points ref={halo} geometry={haloGeo}>
        <pointsMaterial size={1.8} sizeAttenuation={false} color={haloColor} transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <points ref={ring} geometry={shiftGeo}>
        <pointsMaterial size={3} sizeAttenuation={false} vertexColors transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

/** WebGL glow behind the 24-hour dial. Loaded lazily; the SVG dial stays the source of truth. */
export default function DialGlow({ arcs, haloColor = "#E9C46A" }: { arcs: GlowArc[]; haloColor?: string }) {
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Canvas
      className="dial-glow"
      dpr={[1, 2]}
      frameloop={still ? "demand" : "always"}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      camera={{ fov: FOV, near: 0.1, far: 50, position: [0, 0, DIST] }}
      aria-hidden
    >
      <Dust arcs={arcs} still={still} haloColor={haloColor} />
    </Canvas>
  );
}
