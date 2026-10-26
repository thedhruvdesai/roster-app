"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * A night city seen from above at an angle, with a route drawing itself to your
 * next site and a pulsing pin. Purely decorative: every fact it hints at is also
 * written in the card on top of it. Lazy-loaded so it never delays first paint.
 */

// Seeded random so the city looks the same on every visit
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const GRID = 22; // blocks per side
const STEP = 1; // block pitch

function City() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { count, matrices } = useMemo(() => {
    const r = rng(7);
    const list: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const half = (GRID * STEP) / 2;
    for (let i = 0; i < GRID; i++)
      for (let j = 0; j < GRID; j++) {
        // leave the route corridor and a few plazas open
        if (j === 11 || j === 7 || i === 7 || i === 15) continue;
        if (r() < 0.12) continue;
        const x = -half + i * STEP + STEP / 2;
        const z = -half + j * STEP + STEP / 2;
        const d = Math.hypot(x, z);
        const h = 0.08 + Math.pow(r(), 2.4) * (d < 5 ? 1.6 : 0.7);
        const w = 0.55 + r() * 0.25;
        m.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w));
        list.push(m.clone());
      }
    return { count: list.length, matrices: list };
  }, []);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, count]}
      onUpdate={(self) => {
        matrices.forEach((mat, i) => self.setMatrixAt(i, mat));
        self.instanceMatrix.needsUpdate = true;
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#161616" roughness={0.9} metalness={0.1} />
    </instancedMesh>
  );
}

function Streets() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const half = (GRID * STEP) / 2;
    for (let i = 0; i <= GRID; i++) {
      const p = -half + i * STEP;
      pts.push(p, 0.001, -half, p, 0.001, half);
      pts.push(-half, 0.001, p, half, 0.001, p);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#2a2a2a" transparent opacity={0.9} />
    </lineSegments>
  );
}

function Route({ color, still }: { color: string; still: boolean }) {
  const tube = useRef<THREE.Mesh>(null);
  const car = useRef<THREE.Mesh>(null);
  const pulse = useRef<THREE.Mesh>(null);

  // Along streets: in on the main avenue, turn, then up to the site
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          [-10.5, 0.05, 0.5],
          [-5, 0.05, 0.5],
          [-3.6, 0.05, 0.5],
          [-3.5, 0.05, -1.5],
          [-3.5, 0.05, -3.6],
          [2.5, 0.05, -3.5],
          [4.5, 0.05, -3.5],
          [4.5, 0.05, -1.2],
        ].map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        false,
        "catmullrom",
        0.05
      ),
    []
  );
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 240, 0.07, 8, false), [curve]);
  const total = geo.index ? geo.index.count : 0;
  const end = curve.getPoint(1);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Draw the route in over 2.2s, then keep a car looping along it
    const drawn = still ? 1 : Math.min(1, t / 2.2);
    if (tube.current) tube.current.geometry.setDrawRange(0, Math.floor(total * drawn));
    if (car.current) {
      const u = still ? 0.6 : drawn < 1 ? drawn : ((t - 2.2) / 6) % 1;
      car.current.position.copy(curve.getPoint(u)).setY(0.12);
    }
    if (pulse.current && !still) {
      const k = (t % 1.8) / 1.8;
      pulse.current.scale.setScalar(0.4 + k * 1.6);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
    }
  });

  return (
    <group>
      <mesh ref={tube} geometry={geo} renderOrder={10}>
        <meshBasicMaterial color="#FFFFFF" depthTest={false} />
      </mesh>
      <mesh ref={car} renderOrder={11}>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshBasicMaterial color="#FFFFFF" depthTest={false} />
      </mesh>
      {/* destination pin */}
      <group position={[end.x, 0, end.z]}>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 1.1, 12]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.45, 0.6, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function Scene({ color, still }: { color: string; still: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (still || !g.current) return;
    g.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.08) * 0.22 - 0.25;
  });
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 9, 22]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} />
      <pointLight position={[4.5, 1.6, -1.2]} intensity={6} distance={6} color={color} />
      <group ref={g} rotation={[0, -0.25, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[GRID * STEP + 4, GRID * STEP + 4]} />
          <meshStandardMaterial color="#050505" />
        </mesh>
        <Streets />
        <City />
        <Route color={color} still={still} />
      </group>
    </>
  );
}

export default function CityMap({ color = "#0A84FF" }: { color?: string }) {
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <Canvas
      className="map-fade"
      dpr={[1, 1.75]}
      frameloop={still ? "demand" : "always"}
      gl={{ antialias: true, powerPreference: "low-power" }}
      camera={{ fov: 38, near: 0.1, far: 60, position: [1.5, 7.5, 9] }}
      onCreated={({ camera }) => camera.lookAt(0.5, 0, -1.5)}
      aria-hidden
    >
      <Scene color={color} still={still} />
    </Canvas>
  );
}
