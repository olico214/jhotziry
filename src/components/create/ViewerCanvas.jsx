"use client";

import { Component, Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Center,
  ContactShadows,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";

function applyMaterial(mesh, materialMode, paintedColor) {
  if (materialMode === "wireframe") {
    mesh.material = new THREE.MeshBasicMaterial({
      color: "#c13a72",
      wireframe: true,
    });
    return;
  }

  if (paintedColor) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: paintedColor,
      roughness: 0.65,
      metalness: 0.05,
    });
    return;
  }

  if (materialMode === "clay") {
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

function CameraRig({ distance }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    const direction = camera.position.clone().normalize();
    if (direction.lengthSq() === 0) direction.set(0, 0.3, 1);
    camera.position.copy(direction.multiplyScalar(distance));
    if (controls?.update) controls.update();
  }, [distance, camera, controls]);

  return null;
}

function Model({ url, materialMode, hiddenParts, explode, partColors, onParts, modelRef }) {
  const { scene } = useGLTF(url);

  const parts = useMemo(() => {
    const list = [];
    scene.traverse((object) => {
      if (object.isMesh) list.push(object.name || `Parte ${list.length + 1}`);
    });
    return list;
  }, [scene]);

  useEffect(() => {
    onParts?.(parts);
  }, [parts, onParts]);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    let index = 0;

    clone.traverse((object) => {
      if (!object.isMesh) return;
      const name = object.name || `Parte ${index + 1}`;
      index += 1;

      object.castShadow = true;
      applyMaterial(object, materialMode, partColors?.[name]);
      object.visible = !hiddenParts.includes(name);

      if (explode > 0) {
        const direction = new THREE.Vector3().subVectors(object.position, center);
        if (direction.lengthSq() === 0) direction.set(0, 1, 0);
        object.position.addScaledVector(direction.normalize(), explode);
      }
    });

    return clone;
  }, [scene, materialMode, hiddenParts, explode, partColors]);

  return (
    <group ref={modelRef}>
      <primitive object={cloned} />
    </group>
  );
}

function SceneApi({ modelRef, onApi }) {
  const { gl } = useThree();

  useEffect(() => {
    if (!onApi) return;
    onApi({
      screenshot: () => gl.domElement.toDataURL("image/png"),
      exportGlb: async () => {
        if (!modelRef.current) throw new Error("El modelo aún no está listo");
        const { GLTFExporter } = await import(
          "three/examples/jsm/exporters/GLTFExporter.js"
        );
        const exporter = new GLTFExporter();
        return exporter.parseAsync(modelRef.current, { binary: true });
      },
    });
  }, [gl, modelRef, onApi]);

  return null;
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
  distance = 4.2,
  hiddenParts = [],
  explode = 0,
  partColors = {},
  onParts,
  onApi,
}) {
  const modelRef = useRef(null);

  return (
    <Canvas
      camera={{ position: [0, 0.6, 4.2], fov: 45 }}
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true }}
    >
      <color attach="background" args={["#fff5f9"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <directionalLight
        position={[-4, -2, -3]}
        intensity={0.45}
        color="#ffb8d4"
      />
      <CameraRig distance={distance} />
      <SceneApi modelRef={modelRef} onApi={onApi} />
      <ModelBoundary>
        <Suspense fallback={<Placeholder />}>
          {modelUrl ? (
            <Center>
              <Model
                url={modelUrl}
                materialMode={materialMode}
                hiddenParts={hiddenParts}
                explode={explode}
                partColors={partColors}
                onParts={onParts}
                modelRef={modelRef}
              />
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
        makeDefault
        enablePan={false}
        minDistance={2}
        maxDistance={9}
        autoRotate={autoRotate}
        autoRotateSpeed={1.2}
      />
    </Canvas>
  );
}
