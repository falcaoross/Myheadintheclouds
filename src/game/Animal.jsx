import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import * as THREE from "three";
import { useGameStore } from "../state/useGameStore.js";
import { usePlayerControls } from "../systems/Controls.js";

const WANDER_RADIUS = 12;
const WANDER_SPEED = 0.7;
const MOUNT_SPEED = 2.0;

function seededRandom(seed) {
  return Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000);
}

export default function Animal({ id, url, position, mountable = false, name = "Animal" }) {
  const [model, setModel] = useState(null);
  const [mixer, setMixer] = useState(null);
  const rigidBody = useRef(null);
  const group = useRef(null);
  const interactionMesh = useRef(null);
  const mountPoint = useRef(null);
  const petPulse = useRef(0);
  const lastPetTime = useRef(0);
  const waypoint = useRef(new THREE.Vector3(position[0], position[1], position[2]));
  const basePosition = useMemo(() => new THREE.Vector3(...position), [position]);

  const { get } = usePlayerControls();
  const mountedAnimalId = useGameStore((state) => state.mountedAnimalId);
  const mountAnimal = useGameStore((state) => state.mountAnimal);
  const dismount = useGameStore((state) => state.dismount);
  const registerAnimal = useGameStore((state) => state.registerAnimal);
  const unregisterAnimal = useGameStore((state) => state.unregisterAnimal);
  const audioController = useGameStore((state) => state.audioController);

  const canMount = () => mountable && Date.now() - lastPetTime.current < 5000;

  useEffect(() => {
    let active = true;
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    // Draco decoder path expected under public/draco; keeps GLB payloads tiny.
    dracoLoader.setDecoderPath("/draco/");
    loader.setDRACOLoader(dracoLoader);
    loader.load(
      url,
      (gltf) => {
        if (!active) return;
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        setModel(gltf.scene);
        if (gltf.animations.length > 0) {
          const mixerInstance = new THREE.AnimationMixer(gltf.scene);
          mixerInstance.clipAction(gltf.animations[0]).play();
          setMixer(mixerInstance);
        }
      },
      undefined,
      () => {
        if (active) setModel(null);
        dracoLoader.dispose();
      }
    );

    return () => {
      active = false;
      dracoLoader.dispose();
    };
  }, [url]);

  useEffect(() => {
    const data = {
      id,
      name,
      mountable,
      canMount,
      interactionMesh: interactionMesh.current,
      mountPoint,
      onInteract: () => {
        if (mountedAnimalId === id) {
          dismount();
          return;
        }

        if (mountable && canMount()) {
          mountAnimal(id);
          return;
        }

        lastPetTime.current = Date.now();
        petPulse.current = 1;
        if (audioController) {
          audioController.playOneShot("/audio/animal-chirp.mp3", 0.8);
        }
      },
    };

    if (interactionMesh.current) {
      interactionMesh.current.userData.animalData = data;
    }

    registerAnimal(id, data);
    return () => unregisterAnimal(id);
  }, [
    id,
    name,
    mountable,
    mountedAnimalId,
    registerAnimal,
    unregisterAnimal,
    mountAnimal,
    dismount,
    audioController,
  ]);

  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);

    if (!rigidBody.current) return;

    const isMounted = mountedAnimalId === id;
    const target = waypoint.current;

    if (!isMounted) {
      const current = rigidBody.current.translation();
      const currentPosition = new THREE.Vector3(current.x, current.y, current.z);
      const distance = currentPosition.distanceTo(target);

      if (distance < 0.6) {
        const seed = state.clock.elapsedTime * 0.37 + id.length;
        const offsetX = (seededRandom(seed) - 0.5) * WANDER_RADIUS;
        const offsetZ = (seededRandom(seed + 1.3) - 0.5) * WANDER_RADIUS;
        target.set(basePosition.x + offsetX, basePosition.y, basePosition.z + offsetZ);
      }

      const direction = target.clone().sub(currentPosition).normalize();
      const next = currentPosition.clone().add(direction.multiplyScalar(WANDER_SPEED * delta));
      rigidBody.current.setNextKinematicTranslation({ x: next.x, y: next.y, z: next.z });
      const angle = Math.atan2(direction.x, direction.z);
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0));
      rigidBody.current.setNextKinematicRotation(rotation);
    } else {
      const { forward, backward, left, right } = get();
      const movement = new THREE.Vector3(
        (left ? -1 : 0) + (right ? 1 : 0),
        0,
        (forward ? -1 : 0) + (backward ? 1 : 0)
      );
      if (movement.lengthSq() > 0) {
        movement.normalize();
        const current = rigidBody.current.translation();
        const next = new THREE.Vector3(current.x, current.y, current.z).add(
          movement.multiplyScalar(MOUNT_SPEED * delta)
        );
        rigidBody.current.setNextKinematicTranslation({ x: next.x, y: next.y, z: next.z });
        const angle = Math.atan2(movement.x, movement.z);
        const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0));
        rigidBody.current.setNextKinematicRotation(rotation);
      }
    }

    if (petPulse.current > 0 && group.current) {
      const pulse = petPulse.current;
      const scale = 1 + pulse * 0.08;
      group.current.scale.set(scale, scale, scale);
      petPulse.current = Math.max(0, pulse - delta * 2.4);
      if (petPulse.current === 0) {
        group.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <RigidBody ref={rigidBody} type="kinematicPosition" colliders="hull">
      <group ref={group} position={position}>
        {model ? (
          <primitive object={model} />
        ) : (
          <mesh castShadow>
            <boxGeometry args={[1.2, 1, 2]} />
            <meshStandardMaterial color={mountable ? "#8a6b4b" : "#7a7f90"} />
          </mesh>
        )}
        <group ref={mountPoint} position={[0, 1.4, 0.4]} />
        <mesh ref={interactionMesh} position={[0, 0.8, 0]}>
          <sphereGeometry args={[1.4, 16, 16]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0} />
        </mesh>
      </group>
    </RigidBody>
  );
}
