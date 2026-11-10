import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics.js'

// QR 에서 방 코드 꺼내기: 초대 링크(…#/join/CODE) 또는 코드 6자리
export function codeFromQR(text) {
  const t = (text || '').trim()
  const m = t.match(/#\/join\/([A-Za-z0-9]{6})\b/) || t.match(/^([A-Za-z0-9]{6})$/)
  return m ? m[1].toUpperCase() : null
}

// 카메라로 초대 QR 을 스캔하면 바로 그 방 참여 화면으로
export default function QRScanner({ onClose, onCode }) {
  const videoRef = useRef(null)
  const [error, setError] = useState(null)
  const [hint, setHint] = useState(null)

  useEffect(() => {
    let stream = null
    let stopped = false
    let timer = 0
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let detect = null

    async function setup() {
      // 1) 브라우저 내장 QR 인식 (안드로이드 크롬 등) 2) 없으면 jsQR (아이폰 사파리)
      if ('BarcodeDetector' in window) {
        try {
          const fmts = await window.BarcodeDetector.getSupportedFormats?.()
          if (!fmts || fmts.includes('qr_code')) {
            const bd = new window.BarcodeDetector({ formats: ['qr_code'] })
            detect = async (v) => (await bd.detect(v))[0]?.rawValue || null
          }
        } catch { /* jsQR 로 */ }
      }
      if (!detect) {
        const jsQR = (await import('jsqr')).default
        detect = async (v) => {
          const w = 480
          const h = Math.round((v.videoHeight / v.videoWidth) * w) || w
          canvas.width = w
          canvas.height = h
          ctx.drawImage(v, 0, 0, w, h)
          const img = ctx.getImageData(0, 0, w, h)
          return jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })?.data || null
        }
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      } catch {
        setError("Couldn't open the camera. Please check permissions.")
        return
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop())
      const v = videoRef.current
      v.srcObject = stream
      await v.play().catch(() => {})
      tick()
    }
    async function tick() {
      if (stopped) return
      const v = videoRef.current
      if (v && v.readyState >= 2 && v.videoWidth) {
        try {
          const text = await detect(v)
          if (text) {
            const code = codeFromQR(text)
            if (code) {
              stopped = true
              haptic('success')
              onCode(code)
              return
            }
            setHint("That's not a podoit invite")
          }
        } catch { /* 다음 프레임 */ }
      }
      timer = setTimeout(tick, 180)
    }
    setup()
    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onCode])

  return (
    <div className="camera qr-scan">
      <button className="cam-close" onClick={onClose} aria-label="Close">✕</button>
      <div className="cam-stage">
        <video ref={videoRef} playsInline muted autoPlay />
        <div className="scan-frame" aria-hidden><i /><i /><i /><i /></div>
      </div>
      <p className="scan-text">{error || hint || 'Point at a podoit invite QR'}</p>
    </div>
  )
}
