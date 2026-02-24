import { useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import logoTexture from '../assets/image-1768823038663.png'; // Placeholder: Replace with your logo file

const ParticleRing = ({ count = 200, radius = 2 }) => {
  const points = useRef<THREE.Points>(null!);

  // Generate random points in a ring
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = radius + (Math.random() - 0.5) * 0.5;
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 2] = Math.sin(angle) * r;
  }

  useFrame(() => {
    if (points.current) {
      points.current.rotation.y += 0.002;
    }
  });

  return (
    <Points ref={points} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#60A5FA"
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </Points>
  );
};

const RotatingTorus = ({ radius, width, speed, color }: { radius: number, width: number, speed: number, color: string }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.getElapsedTime() * speed * 0.5;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * speed;
  });

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[radius, width, 16, 100]} />
      <meshStandardMaterial color={color} wireframe transparent opacity={0.3} />
    </mesh>
  )
}

const Core = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const texture = useLoader(TextureLoader, logoTexture);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
    meshRef.current.rotation.y += 0.01; // Rotate the sphere
  });

  return (
    <Sphere ref={meshRef} args={[1, 32, 32]}>
      <meshStandardMaterial
        map={texture}
        color="white"
        emissive="#2563EB"
        emissiveIntensity={0.5}
        roughness={0.2}
        metalness={0.8}
      />
    </Sphere>
  )
}

const ThreeScene = ({ className }: { className?: string }) => {
  return (
    <div className={`w-full h-full min-h-[300px] ${className}`}>
      <Canvas camera={{ position: [0, 2, 6], fov: 60 }}>
        <fog attach="fog" args={['#111827', 5, 20]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#60A5FA" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#A78BFA" />

        <Core />
        <RotatingTorus radius={1.8} width={0.02} speed={0.2} color="#93C5FD" />
        <RotatingTorus radius={2.2} width={0.02} speed={-0.15} color="#A78BFA" />
        <ParticleRing radius={3} count={200} />

        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  );
};

export default ThreeScene;
