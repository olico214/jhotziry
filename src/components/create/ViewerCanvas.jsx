"use client";

import { Component, Suspense, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Center, ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";

function applyMaterial(mesh, materialMode) {
  if (materialMode === "wireframe") {
    mesh.material = new THREE.MeshBasicMaterial({
      color: "#c13a72",
      wireframe: true,
    });
  } else if (materialMode === "clay") {
    mesh.material = new THREE.MeshStandardMaterial({
      color: "#d8c7d0",
      roughness: 0.9,
      metalness: 0,
    });
  } else if (materialMode === "resin") {
    mesh.material = new THREE.MeshStandardMaterial({
      color: "#ffd5e6",
      roughness: 0.3,
      metalness: 0,
      transparent: true,
      opacity: 0.85,
    });
  }
}

function Model({ url, materialMode }) {
  const { scene } = useGLTF(url);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        applyMaterial(object, materialMode);
      }
    });
    return clone;
  }, [scene, materialMode]);

  return <primitive object={cloned} />;
}

function Placeholder() {
  return (
    <mesh>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#ffb8d4"
        roughness={0.35}
        metalness={0.1}
        flatShading
      />
    </mesh>
  );
}

class ModelBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <Placeholder />;
    return this.props.children;
  }
}

export default function ViewerCanvas({
  modelUrl,
  materialMode = "textured",
  autoRotate = true,
}) {
  return (
    <Canvas camera={{ position: [0, 0.6, 4.2], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#fff5f9"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <directionalLight
        position={[-4, -2, -3]}
        intensity={0.45}
        color="#ffb8d4"
      />
      <ModelBoundary>
        <Suspense fallback={<Placeholder />}>
          {modelUrl ? (
            <Center>
              <Model url={modelUrl} materialMode={materialMode} />
            </Center>
          ) : (
            <Placeholder />
          )}
        </Suspense>
      </ModelBoundary>
      <ContactShadows
        position={[0, -1.35, 0]}
        opacity={0.35}
        scale={6}
        blur={2.6}
        far={3.2}
        color="#c13a72"
      />
      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={7}
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
      />
    </Canvas>
  );
}
