import { useEffect, useRef } from 'react'

export default function ParticlesBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    const mouse = { x: -9999, y: -9999 }
    const REPEL_DIST = 100
    const REPEL_FORCE = 2.5

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999 }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)

    const onClick = (e) => {
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.4 + Math.random() * 0.4
        nodes.push({
          x: e.clientX + (Math.random() - 0.5) * 30,
          y: e.clientY + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * 1.5 + 0.8,
          baseSpeed: speed,
        })
      }
      if (nodes.length > 120) nodes.splice(0, nodes.length - 120)
    }
    window.addEventListener('click', onClick)

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2,
      opacity: Math.random() * 0.6 + 0.2,
    }))

    const nodes = Array.from({ length: 45 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 0.4 + Math.random() * 0.4
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 1.5 + 0.8,
        baseSpeed: speed,
      }
    })

    const MAX_DIST = 160

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Stele statice — alb-albăstrui
      for (const s of stars) {
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 215, 255, ${s.opacity})`
        ctx.fill()
      }

      // Linii constelație — violet-albăstrui
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.4
            ctx.beginPath()
            ctx.strokeStyle = `rgba(130, 160, 255, ${alpha})`
            ctx.lineWidth = 0.7
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Noduri + mouse repulsion
      for (const p of nodes) {
        // Repulsie față de mouse — temporară, revine la viteză normală
        const mdx = p.x - mouse.x
        const mdy = p.y - mouse.y
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy)
        if (mdist < REPEL_DIST && mdist > 0) {
          const force = (REPEL_DIST - mdist) / REPEL_DIST * REPEL_FORCE
          p.vx += (mdx / mdist) * force
          p.vy += (mdy / mdist) * force
        }

        // Normalizăm viteza la valoarea originală după repulsie
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        const targetSpeed = p.baseSpeed || 0.5
        if (speed > 0) {
          p.vx = (p.vx / speed) * (targetSpeed + (speed - targetSpeed) * 0.95)
          p.vy = (p.vy / speed) * (targetSpeed + (speed - targetSpeed) * 0.95)
        }

        // Glow violet-albăstrui
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5)
        grd.addColorStop(0, 'rgba(150, 180, 255, 0.5)')
        grd.addColorStop(0.5, 'rgba(100, 120, 220, 0.15)')
        grd.addColorStop(1, 'rgba(80, 100, 200, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        // Punct central alb-albăstrui
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(210, 225, 255, 0.95)'
        ctx.fill()

        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) { p.vx *= -1; p.x = Math.max(0, Math.min(canvas.width, p.x)) }
        if (p.y < 0 || p.y > canvas.height) { p.vy *= -1; p.y = Math.max(0, Math.min(canvas.height, p.y)) }
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
