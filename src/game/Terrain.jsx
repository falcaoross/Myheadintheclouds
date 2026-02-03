import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";

const SIZE = 120;
const SEGMENTS = 64;

export default function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const position = geo.attributes.position;

    for (let i = 0; i < position.count; i += 1) {
      const y = Math.sin(position.getX(i) * 0.12) * 0.6;
      const zWave = Math.cos(position.getZ(i) * 0.1) * 0.4;
      position.setY(i, y + zWave);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#4d7a4a" roughness={0.95} metalness={0.02} />
      </mesh>
    </RigidBody>
  );
}
