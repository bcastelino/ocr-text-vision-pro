import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

/**
 * DottedSurface — animated 3D dotted wave background.
 * Adapted from the 21st.dev community component by @efferd
 * (https://21st.dev/community/components/efferd/dotted-surface/default)
 * to run outside Next.js. Theme-aware via next-themes.
 */
export function DottedSurface({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SEPARATION = 150;
    const AMOUNTX = 40;
    const AMOUNTY = 60;

    let camera: THREE.PerspectiveCamera;
    let scene: THREE.Scene;
    let renderer: THREE.WebGLRenderer;
    let particles: THREE.Points;
    let count = 0;
    let animationId = 0;

    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 2000, 10000);

    camera = new THREE.PerspectiveCamera(55, width / height, 1, 20000);
    camera.position.set(0, 355, 1220);
    camera.lookAt(0, 0, 0);

    const numParticles = AMOUNTX * AMOUNTY;
    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);

    const isDark = resolvedTheme !== 'light';
    const baseColor = isDark ? new THREE.Color(0xffffff) : new THREE.Color(0x222222);

    let i = 0;
    let j = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[i] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        positions[i + 1] = 0;
        positions[i + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

        colors[j] = baseColor.r;
        colors[j + 1] = baseColor.g;
        colors[j + 2] = baseColor.b;
        i += 3;
        j += 3;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 8,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.85 : 0.55,
      sizeAttenuation: true,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const animate = () => {
      const positionsAttr = geometry.attributes.position as THREE.BufferAttribute;
      const arr = positionsAttr.array as Float32Array;
      let k = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          arr[k + 1] =
            Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
          k += 3;
        }
      }
      positionsAttr.needsUpdate = true;

      renderer.render(scene, camera);
      count += 0.1;
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-0 -z-10 h-full w-full overflow-hidden',
        className,
      )}
    />
  );
}

export default DottedSurface;
