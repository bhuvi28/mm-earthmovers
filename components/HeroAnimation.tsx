'use client'

import { useEffect, useRef } from 'react'

export default function HeroAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Dynamically import Three.js
    const initThreeJS = async () => {
      try {
        const THREE = await import('three')
        
        if (!containerRef.current) return

        // Scene setup
        const scene = new THREE.Scene()
        const container = containerRef.current
        const getSize = () => ({ w: container.clientWidth || window.innerWidth, h: container.clientHeight || window.innerHeight })
        const { w, h } = getSize()
        const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        
        renderer.setSize(w, h)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        container.appendChild(renderer.domElement)

        // Lighting (dimmed overall)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.15)
        scene.add(ambientLight)
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(5, 10, 7.5)
        scene.add(directionalLight)

        // Add a second directional light for better illumination
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3)
        backLight.position.set(-5, 5, -5)
        scene.add(backLight)

        // Materials (darker, more rough, slightly more transparent)
        const material = new THREE.MeshStandardMaterial({ 
          color: 0x6B7280, // Tailwind gray-500
          metalness: 0.4, 
          roughness: 0.8,
          envMapIntensity: 0.25,
          transparent: true,
          opacity: 0.3
        })
        
        const highlightMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xF59E0B, // Amber
          metalness: 0.5, 
          roughness: 0.7,
          envMapIntensity: 0.55,
          transparent: true,
          opacity: 0.4
        })

        // Create parts group
        const partsGroup = new THREE.Group()
        scene.add(partsGroup)

        // Geometries for different part shapes
        const geometries = [
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.TorusGeometry(0.8, 0.25, 16, 100),
          new THREE.CylinderGeometry(0.3, 0.3, 1.5, 32),
          new THREE.IcosahedronGeometry(0.9),
          new THREE.TorusKnotGeometry(0.7, 0.2, 100, 16)
        ]

        // Create random parts with a more controlled distribution (sparser and wider)
        const isMobile = window.innerWidth < 768
        const partCount = isMobile ? 6 : 10 // even fewer objects overall
        const spread = isMobile ? 16 : 22 // much wider spread to reduce density across the whole screen
        
        for (let i = 0; i < partCount; i++) {
          const geometry = geometries[Math.floor(Math.random() * geometries.length)]
          const mat = Math.random() > 0.97 ? highlightMaterial : material // even fewer highlights
          const part = new THREE.Mesh(geometry, mat)

          // keep a "safe zone" around center to preserve text readability
          const safeZone = { x: 3.5, y: 2.4 } // larger safe zone for clearer text
          let placed = false
          let tries = 0
          while (!placed && tries < 12) {
            const px = (Math.random() - 0.5) * spread
            const py = (Math.random() - 0.5) * spread * 0.6
            const pz = (Math.random() - 0.5) * spread * 0.8 - 3.0 // push further backward in Z
            if (Math.abs(px) > safeZone.x || Math.abs(py) > safeZone.y) {
              part.position.set(px, py, pz)
              placed = true
            }
            tries++
          }
          if (!placed) {
            part.position.set(
              (Math.random() - 0.5) * spread,
              (Math.random() - 0.5) * spread * 0.6,
              (Math.random() - 0.5) * spread * 0.8 - 3.0
            )
          }
          
          part.rotation.set(
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            0
          )
          
          const scale = 0.2 + Math.random() * 0.2
          part.scale.set(scale, scale, scale)
          
          // Add rotation data
          part.userData.spinX = (Math.random() - 0.5) * 0.005
          part.userData.spinY = (Math.random() - 0.5) * 0.005
          
          partsGroup.add(part)
        }

        camera.position.z = 11
        camera.position.y = 2 // Slight downward angle

        // Add very light fog to soften distant objects and reduce overall contrast behind text
        scene.fog = new THREE.FogExp2(0xffffff, isMobile ? 0.035 : 0.028)

        // Mouse interaction
        let mouseX = 0, mouseY = 0
        const handleMouseMove = (event: MouseEvent) => {
          mouseX = (event.clientX / window.innerWidth) * 2 - 1
          mouseY = -(event.clientY / window.innerHeight) * 2 + 1
        }
        
        document.addEventListener('mousemove', handleMouseMove, false)

        // Animation loop with visibility pause
        let isActive = !document.hidden
        const handleVisibility = () => { isActive = !document.hidden }
        document.addEventListener('visibilitychange', handleVisibility)

        const animate = () => {
          requestAnimationFrame(animate)
          
          // Skip heavy updates if tab not visible
          if (!isActive) return

          // Smooth group rotation
          partsGroup.rotation.y += 0.0005
          
          // Rotate individual parts with varied speeds
          const time = Date.now() * 0.001
          partsGroup.children.forEach((part, i) => {
            part.rotation.x = (part.userData.initialX || 0) + Math.sin(time * 0.5 + i) * 0.06
            part.rotation.y = (part.userData.initialY || 0) + time * 0.06
            
            // Save initial rotations if not set
            if (part.userData.initialX === undefined) {
              part.userData.initialX = part.rotation.x
              part.userData.initialY = part.rotation.y
            }
          })
          
          // Subtle camera movement based on mouse
          camera.position.x += (mouseX * 3 - camera.position.x) * 0.003
          camera.position.y += (-mouseY * 3 - camera.position.y) * 0.003
          camera.lookAt(new THREE.Vector3(0, 0, 0))
          
          renderer.render(scene, camera)
        }

        // Handle window resize
        const handleResize = () => {
          const { w: newW, h: newH } = getSize()
          camera.aspect = newW / newH
          camera.updateProjectionMatrix()
          renderer.setSize(newW, newH)
        }
        
        window.addEventListener('resize', handleResize)
        animate()

        // Cleanup function
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('visibilitychange', handleVisibility)
          window.removeEventListener('resize', handleResize)
          if (containerRef.current && renderer.domElement) {
            containerRef.current.removeChild(renderer.domElement)
          }
          renderer.dispose()
        }
      } catch (error) {
        console.error('Failed to load Three.js:', error)
        // Fallback: Add a simple animated background if Three.js fails
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(45deg, #1F2937, #374151, #4B5563);
              background-size: 400% 400%;
              animation: gradientShift 8s ease infinite;
            "></div>
            <style>
              @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
            </style>
          `
        }
      }
    }

    initThreeJS()
  }, [])

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* subtle radial vignette to improve text contrast at center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.14) 38%, rgba(0,0,0,0.0) 70%)'
        }}
      />
    </div>
  )
}
