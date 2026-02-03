import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { usePlayerControls } from "../systems/Controls.js";
import { useGameStore } from "../state/useGameStore.js";

const SPEED = 4.2;
const JUMP_FORCE = 4.8;
const CAMERA_DISTANCE = 7;
const CAMERA_HEIGHT = 2.2;

export default function Player() {
  const rigidBody = useRef(null);
  const modelGroup = useRef(null);
  const { camera, gl } = useThree();
  const { get } = usePlayerControls();
  const { rapier, world } = useRapier();
  const mountedAnimalId = useGameStore((state) => state.mountedAnimalId);
  const animals = useGameStore((state) => state.animals);
  const setPlayerRef = useGameStore((state) => state.setPlayerRef);

  const yaw = useRef(0);
  const pitch = useRef(0.2);

  const rotation = useMemo(() => new THREE.Quaternion(), []);

  useEffect(() => {
    setPlayerRef(rigidBody);
  }, [setPlayerRef]);

  useEffect(() => {
    const onPointerMove = (event) => {
      if (document.pointerLockElement !== gl.domElement) return;
      yaw.current -= event.movementX * 0.002;
      pitch.current -= event.movementY * 0.002;
      pitch.current = Math.max(-0.35, Math.min(0.6, pitch.current));
    };

    const handlePointerLock = () => {
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock();
      }
    };

    gl.domElement.addEventListener("click", handlePointerLock);
    document.addEventListener("mousemove", onPointerMove);

    return () => {
      gl.domElement.removeEventListener("click", handlePointerLock);
      document.removeEventListener("mousemove", onPointerMove);
    };
  }, [gl.domElement]);

  useEffect(() => {
    if (!rigidBody.current) return;
    if (mountedAnimalId) {
      rigidBody.current.setEnabled(false);
    } else {
      rigidBody.current.setEnabled(true);
    }
  }, [mountedAnimalId]);

  useFrame((state, delta) => {
    if (!rigidBody.current) return;

    const mountedAnimal = mountedAnimalId ? animals.get(mountedAnimalId) : null;

    if (mountedAnimal?.mountPoint?.current) {
      const mountWorld = new THREE.Vector3();
      mountedAnimal.mountPoint.current.getWorldPosition(mountWorld);
      rigidBody.current.setTranslation(
        { x: mountWorld.x, y: mountWorld.y, z: mountWorld.z },
        false
      );
    } else if (!mountedAnimalId) {
      const { forward, backward, left, right, jump } = get();
      const movement = new THREE.Vector3(
        (left ? -1 : 0) + (right ? 1 : 0),
        0,
        (forward ? -1 : 0) + (backward ? 1 : 0)
      );

      if (movement.lengthSq() > 0) {
        movement.normalize();
        const direction = movement
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current)
          .multiplyScalar(SPEED);
        const velocity = rigidBody.current.linvel();
        rigidBody.current.setLinvel(
          { x: direction.x, y: velocity.y, z: direction.z },
          true
        );

        rotation.setFromEuler(new THREE.Euler(0, Math.atan2(direction.x, direction.z), 0));
        if (modelGroup.current) {
          modelGroup.current.quaternion.slerp(rotation, delta * 8);
        }
      } else {
        const velocity = rigidBody.current.linvel();
        rigidBody.current.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
      }

      if (jump) {
        const origin = rigidBody.current.translation();
        const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 });
        const hit = world.castRay(ray, 1.2, true);
        if (hit) {
          rigidBody.current.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        }
      }
    }

    const targetPosition = mountedAnimal?.mountPoint?.current
      ? mountedAnimal.mountPoint.current.getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3(
          rigidBody.current.translation().x,
          rigidBody.current.translation().y,
          rigidBody.current.translation().z
        );

    const cameraDistance = mountedAnimalId ? CAMERA_DISTANCE + 2 : CAMERA_DISTANCE;
    const offset = new THREE.Vector3(
      Math.sin(yaw.current) * cameraDistance,
      CAMERA_HEIGHT + pitch.current * 4,
      Math.cos(yaw.current) * cameraDistance
    );

    const desired = targetPosition.clone().add(offset);
    camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
    camera.lookAt(targetPosition.x, targetPosition.y + 1.2, targetPosition.z);
  });

  return (
    <RigidBody
      ref={rigidBody}
      colliders={false}
      mass={1}
      position={[0, 1.5, 0]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[0.6, 0.4]} />
      <group ref={modelGroup}>
        <mesh castShadow>
          <capsuleGeometry args={[0.4, 1.2, 8, 16]} />
          <meshStandardMaterial color="#d1c5b7" />
        </mesh>
      </group>
    </RigidBody>
  );
}
