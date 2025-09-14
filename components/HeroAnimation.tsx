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
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(window.devicePixelRatio)
        containerRef.current.appendChild(renderer.domElement)

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        scene.add(ambientLight)
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(5, 10, 7.5)
        scene.add(directionalLight)

        // Materials
        const material = new THREE.MeshStandardMaterial({ 
          color: 0x888888, 
          metalness: 0.95, 
          roughness: 0.4 
        })
        
        const highlightMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xF59E0B, 
          metalness: 0.8, 
          roughness: 0.5 
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

        // Create random parts
        for (let i = 0; i < 30; i++) {
          const geometry = geometries[Math.floor(Math.random() * geometries.length)]
          const mat = Math.random() > 0.85 ? highlightMaterial : material
          const part = new THREE.Mesh(geometry, mat)
          
          part.position.set(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 15
          )
          
          part.rotation.set(
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            0
          )
          
          const scale = 0.4 + Math.random() * 0.6
          part.scale.set(scale, scale, scale)
          
          // Add rotation data
          part.userData.spinX = (Math.random() - 0.5) * 0.005
          part.userData.spinY = (Math.random() - 0.5) * 0.005
          
          partsGroup.add(part)
        }

        camera.position.z = 8

        // Mouse interaction
        let mouseX = 0, mouseY = 0
        const handleMouseMove = (event: MouseEvent) => {
          mouseX = (event.clientX / window.innerWidth) * 2 - 1
          mouseY = -(event.clientY / window.innerHeight) * 2 + 1
        }
        
        document.addEventListener('mousemove', handleMouseMove, false)

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate)
          
          // Rotate individual parts
          partsGroup.children.forEach(part => {
            part.rotation.x += part.userData.spinX
            part.rotation.y += part.userData.spinY
          })
          
          // Rotate group based on mouse position
          partsGroup.rotation.y += (mouseX * 0.5 - partsGroup.rotation.y) * 0.05
          partsGroup.rotation.x += (mouseY * 0.5 - partsGroup.rotation.x) * 0.05
          
          renderer.render(scene, camera)
        }

        // Handle window resize
        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight
          camera.updateProjectionMatrix()
          renderer.setSize(window.innerWidth, window.innerHeight)
        }
        
        window.addEventListener('resize', handleResize)
        animate()

        // Cleanup function
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
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

  return <div ref={containerRef} className="absolute inset-0" />
}
