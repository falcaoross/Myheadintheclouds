import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Sky } from "@react-three/drei";
import Terrain from "./Terrain.jsx";
import Animal from "./Animal.jsx";

const TREE_COUNT = 120;
const ROCK_COUNT = 40;

function createSeededRandom(seed) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export default function World() {
  const trunkRef = useRef(null);
  const leafRef = useRef(null);
  const trunkGeometry = useMemo(() => new THREE.CylinderGeometry(0.15, 0.2, 2.2, 6), []);
  const leafGeometry = useMemo(() => new THREE.ConeGeometry(1.2, 2.6, 7), []);
  const trunkMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5b3f2c" }), []);
  const leafMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2f5b3a" }), []);
  const treeData = useMemo(() => {
    const rand = createSeededRandom(42);
    return Array.from({ length: TREE_COUNT }, () => {
      const x = (rand() - 0.5) * 80;
      const z = (rand() - 0.5) * 80;
      const scale = 0.8 + rand() * 1.2;
      return { position: [x, 0, z], scale };
    });
  }, []);

  const rockData = useMemo(() => {
    const rand = createSeededRandom(19);
    return Array.from({ length: ROCK_COUNT }, () => {
      const x = (rand() - 0.5) * 70;
      const z = (rand() - 0.5) * 70;
      const scale = 0.4 + rand() * 0.8;
      const rotation = rand() * Math.PI;
      return { position: [x, 0.1, z], scale, rotation };
    });
  }, []);

  useEffect(() => {
    if (!trunkRef.current || !leafRef.current) return;
    const trunkMesh = trunkRef.current;
    const leafMesh = leafRef.current;
    const trunkMatrix = new THREE.Matrix4();
    const leafMatrix = new THREE.Matrix4();

    treeData.forEach((tree, index) => {
      trunkMatrix.compose(
        new THREE.Vector3(...tree.position),
        new THREE.Quaternion(),
        new THREE.Vector3(tree.scale, tree.scale, tree.scale)
      );
      trunkMesh.setMatrixAt(index, trunkMatrix);

      leafMatrix.compose(
        new THREE.Vector3(tree.position[0], tree.position[1] + 2, tree.position[2]),
        new THREE.Quaternion(),
        new THREE.Vector3(tree.scale, tree.scale, tree.scale)
      );
      leafMesh.setMatrixAt(index, leafMatrix);
    });

    trunkMesh.instanceMatrix.needsUpdate = true;
    leafMesh.instanceMatrix.needsUpdate = true;
  }, [treeData]);

  return (
    <group>
      <Sky sunPosition={[10, 12, 6]} turbidity={5} rayleigh={2} />
      <Terrain />

      <instancedMesh
        ref={trunkRef}
        args={[null, null, TREE_COUNT]}
        castShadow
        receiveShadow
        geometry={trunkGeometry}
        material={trunkMaterial}
      />

      <instancedMesh
        ref={leafRef}
        args={[null, null, TREE_COUNT]}
        castShadow
        receiveShadow
        geometry={leafGeometry}
        material={leafMaterial}
      />

      {rockData.map((rock, index) => (
        <mesh
          key={`rock-${index}`}
          castShadow
          receiveShadow
          position={rock.position}
          rotation={[0, rock.rotation, 0]}
          scale={[rock.scale, rock.scale * 0.6, rock.scale]}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6b6f75" roughness={0.9} />
        </mesh>
      ))}

      <Animal
        id="deer"
        name="Deer"
        url="/models/deer.glb"
        position={[4, 0.5, -6]}
        mountable
      />
      <Animal
        id="fox"
        name="Fox"
        url="/models/fox.glb"
        position={[-6, 0.5, 3]}
      />
      <Animal
        id="elk"
        name="Elk"
        url="/models/elk.glb"
        position={[8, 0.5, 6]}
        mountable
      />
      <Animal
        id="rabbit"
        name="Rabbit"
        url="/models/rabbit.glb"
        position={[-4, 0.4, -4]}
      />
    </group>
  );
}
