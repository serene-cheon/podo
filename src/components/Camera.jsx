import { useEffect, useRef, useState } from 'react'

const CLIP_MS = 3000
const MAX_SIDE = 1080
const VIDEO_TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']

function pickVideoType() {
  if (!window.MediaRecorder) return null
  return VIDEO_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
}

// square: 가운데를 정사각형으로 잘라서 (포도알이 정사각형이라 화면에 보이던 그대로)
function drawToJpeg(source, w, h, square) {
  const sw = square ? Math.min(w, h) : w
  const sh = square ? Math.min(w, h) : h
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh))
  const c = document.createElement('canvas')
  c.width = Math.round(sw * scale)
  c.height = Math.round(sh * scale)
  c.getContext('2d').drawImage(source, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, c.width, c.height)
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.82))
}

async function compressImageFile(file) {
  const img = new Image()
  img.src = URL.createObjectURL(file)
  await img.decode()
  const blob = await drawToJpeg(img, img.naturalWidth, img.naturalHeight)
  URL.revokeObjectURL(img.src)
  return blob
}

/**
 * 전체 화면 카메라. mode: 'photo' | 'video'(3초)
 * onDone({ blob, mediaType })
 */
export default function Camera({ initialMode = 'photo', photoOnly, onDone, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [mode, setMode] = useState(initialMode)
  const [facing, setFacing] = useState('environment')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [recording, setRecording] = useState(false)
  const [result, setResult] = useState(null) // { blob, mediaType, url }
  const supported = !!navigator.mediaDevices?.getUserMedia

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    setReady(false)
    navigator.mediaDevices
      // 세로로 길게(720x1280) 요청하면 폰이 가로 영상을 잘라내서 확대돼 보였어요 → 센서 기본 비율(4:3) 그대로 받기
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        // 줌을 지원하는 폰이면 가장 넓게 (기본 줌이 1보다 큰 경우가 있어요)
        const track = s.getVideoTracks()[0]
        const zoom = track?.getCapabilities?.().zoom
        if (zoom && zoom.min !== undefined) track.applyConstraints({ advanced: [{ zoom: zoom.min }] }).catch(() => {})
        streamRef.current = s
        videoRef.current.srcObject = s // 첫 프레임이 오면 onLoadedData 에서 ready
      })
      .catch(() => setError("Couldn't open the camera. Please check permissions."))
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [facing, supported])

  useEffect(() => () => result && URL.revokeObjectURL(result.url), [result])

  const setBlob = (blob, mediaType) => setResult({ blob, mediaType, url: URL.createObjectURL(blob) })

  async function takePhoto() {
    const v = videoRef.current
    if (!v?.videoWidth) return
    setBlob(await drawToJpeg(v, v.videoWidth, v.videoHeight, photoOnly), 'photo')
  }

  function recordClip() {
    const type = pickVideoType()
    if (type === null) return setError("This browser doesn't support video recording.")
    const rec = new MediaRecorder(streamRef.current, { ...(type && { mimeType: type }), videoBitsPerSecond: 1_500_000 })
    const chunks = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = () => {
      setRecording(false)
      setBlob(new Blob(chunks, { type: (rec.mimeType || type || 'video/webm').split(';')[0] }), 'video')
    }
    rec.start()
    setRecording(true)
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), CLIP_MS)
  }

  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type.startsWith('image/')) setBlob(await compressImageFile(f), 'photo')
    else if (f.size > 8 * 1024 * 1024) setError('Video is too large (max 8MB)')
    else setBlob(f, 'video')
  }

  return (
    <div className="camera">
      <button className="cam-close" onClick={onClose} aria-label="Close">✕</button>

      <div className={`cam-stage ${photoOnly ? 'square' : ''}`}>
        {supported && !error && (
          <video ref={videoRef} autoPlay playsInline muted onLoadedData={() => setReady(true)} className={facing === 'user' ? 'mirror' : ''} hidden={!!result} />
        )}
        {result?.mediaType === 'photo' && <img src={result.url} alt="Preview" />}
        {result?.mediaType === 'video' && <video src={result.url} autoPlay loop playsInline muted />}
        {(error || !supported) && !result && (
          <div className="cam-fallback">
            <p>{error || "Can't open the camera here."}</p>
            <label className="btn">
              {mode === 'photo' ? 'Choose / take photo' : 'Choose / record video'}
              <input type="file" hidden accept={mode === 'photo' ? 'image/*' : 'video/*'} capture="environment" onChange={onFile} />
            </label>
          </div>
        )}
        {recording && <div className="rec-bar"><span /></div>}
      </div>

      {result ? (
        <div className="cam-controls">
          <button className="btn ghost light" onClick={() => setResult(null)}>Retake</button>
          <button className="btn primary" onClick={() => onDone({ blob: result.blob, mediaType: result.mediaType })}>🍇 Stick it</button>
        </div>
      ) : (
        <>
          {!photoOnly && <div className="cam-modes">
            <button className={mode === 'photo' ? 'on' : ''} onClick={() => setMode('photo')} disabled={recording}>Photo</button>
            <button className={mode === 'video' ? 'on' : ''} onClick={() => setMode('video')} disabled={recording}>3s video</button>
          </div>}
          <div className="cam-controls">
            <span style={{ width: 52 }} />
            <button
              className={`shutter ${mode} ${recording ? 'recording' : ''}`}
              disabled={!ready || recording}
              onClick={mode === 'photo' ? takePhoto : recordClip}
              aria-label={mode === 'photo' ? 'Take photo' : 'Record 3 seconds'}
            />
            <button className="cam-flip" disabled={!ready || recording} onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Flip camera">⟲</button>
          </div>
        </>
      )}
    </div>
  )
}
