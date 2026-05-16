"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";

function EarthCore() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (earthRef.current) earthRef.current.rotation.y += 0.0035;
    if (cloudRef.current) cloudRef.current.rotation.y += 0.005;
    if (ringRef.current) ringRef.current.rotation.z += 0.002;
  });

  return (
    <group>
      <mesh ref={earthRef} rotation={[0.25, 0.2, 0]}>
        <sphereGeometry args={[1.55, 48, 48]} />
        <meshStandardMaterial
          color="#062033"
          emissive="#00D4FF"
          emissiveIntensity={0.18}
          roughness={0.35}
          metalness={0.25}
        />
      </mesh>

      <mesh ref={cloudRef} rotation={[0.25, 0.2, 0]}>
        <sphereGeometry args={[1.575, 32, 32]} />
        <meshBasicMaterial
          color="#36FF9F"
          wireframe
          transparent
          opacity={0.28}
        />
      </mesh>

      <group ref={ringRef}>
        <mesh rotation={[0.2, 0.65, 0]}>
          <torusGeometry args={[2.05, 0.01, 12, 120]} />
          <meshBasicMaterial color="#00D4FF" transparent opacity={0.65} />
        </mesh>

        <mesh rotation={[1.15, 0.35, 0.45]}>
          <torusGeometry args={[2.18, 0.008, 12, 120]} />
          <meshBasicMaterial color="#36FF9F" transparent opacity={0.45} />
        </mesh>

        <mesh rotation={[0.7, 1.45, 0.2]}>
          <torusGeometry args={[2.3, 0.006, 12, 120]} />
          <meshBasicMaterial color="#FF8A1F" transparent opacity={0.3} />
        </mesh>
      </group>

      <mesh position={[-2.35, 0.65, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#00D4FF" />
      </mesh>

      <mesh position={[2.25, -0.38, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#36FF9F" />
      </mesh>

      <mesh position={[0.55, 2.1, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#FF8A1F" />
      </mesh>
    </group>
  );
}

export default function Globe3D() {
  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_0_120px_rgba(0,212,255,0.12)] backdrop-blur-2xl sm:h-[520px]">
      <div className="absolute left-6 top-6 z-10 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-bold text-[#C8D0E0] backdrop-blur-2xl">
        WhatsApp automated
      </div>

      <div className="absolute bottom-8 right-6 z-10 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-bold text-[#C8D0E0] backdrop-blur-2xl">
        Lead captured
      </div>

      <div className="absolute right-8 top-20 z-10 rounded-2xl border border-[#36FF9F]/20 bg-[#36FF9F]/10 px-4 py-3 text-sm font-black text-[#36FF9F] backdrop-blur-2xl">
        Global-ready AI
      </div>

      <Canvas
        dpr={[1, 1.35]}
        camera={{ position: [0, 0, 5.2], fov: 42 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <pointLight position={[4, 4, 4]} intensity={1.7} color="#36FF9F" />
          <pointLight position={[-4, -2, 3]} intensity={1.35} color="#00D4FF" />
          <EarthCore />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
          />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_36%,rgba(3,5,9,0.58)_80%)]" />
    </div>
  );
}