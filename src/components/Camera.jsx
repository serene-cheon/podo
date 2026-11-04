import { useEffect, useRef, useState } from 'react'

const CLIP_MS = 3000
const MAX_SIDE = 1080
const VIDEO_TYPES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']

function pickVideoType() {
  if (!window.MediaRecorder) return null
  return VIDEO_TYPES.find((t) => MediaRecorder.isTypeSupported?.(t)) || ''
}

function drawToJpeg(source, w, h) {
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * scale)
  c.height = Math.round(h * scale)
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height)
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
export default function Camera({ initialMode = 'photo', onDone, onClose }) {
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
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 1280 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        streamRef.current = s
        videoRef.current.srcObject = s // 첫 프레임이 오면 onLoadedData 에서 ready
      })
      .catch(() => setError('카메라를 열 수 없어요. 권한을 확인해 주세요.'))
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
    setBlob(await drawToJpeg(v, v.videoWidth, v.videoHeight), 'photo')
  }

  function recordClip() {
    const type = pickVideoType()
    if (type === null) return setError('이 브라우저는 영상 녹화를 지원하지 않아요.')
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
    else if (f.size > 8 * 1024 * 1024) setError('영상이 너무 커요 (최대 8MB)')
    else setBlob(f, 'video')
  }

  return (
    <div className="camera">
      <button className="cam-close" onClick={onClose} aria-label="닫기">✕</button>

      <div className="cam-stage">
        {supported && !error && (
          <video ref={videoRef} autoPlay playsInline muted onLoadedData={() => setReady(true)} className={facing === 'user' ? 'mirror' : ''} hidden={!!result} />
        )}
        {result?.mediaType === 'photo' && <img src={result.url} alt="미리보기" />}
        {result?.mediaType === 'video' && <video src={result.url} autoPlay loop playsInline muted />}
        {(error || !supported) && !result && (
          <div className="cam-fallback">
            <p>{error || '여기서는 카메라를 바로 열 수 없어요.'}</p>
            <label className="btn">
              {mode === 'photo' ? '사진 선택/촬영' : '영상 선택/촬영'}
              <input type="file" hidden accept={mode === 'photo' ? 'image/*' : 'video/*'} capture="environment" onChange={onFile} />
            </label>
          </div>
        )}
        {recording && <div className="rec-bar"><span /></div>}
      </div>

      {result ? (
        <div className="cam-controls">
          <button className="btn ghost light" onClick={() => setResult(null)}>다시 찍기</button>
          <button className="btn primary" onClick={() => onDone({ blob: result.blob, mediaType: result.mediaType })}>🍇 붙이기</button>
        </div>
      ) : (
        <>
          <div className="cam-modes">
            <button className={mode === 'photo' ? 'on' : ''} onClick={() => setMode('photo')} disabled={recording}>사진</button>
            <button className={mode === 'video' ? 'on' : ''} onClick={() => setMode('video')} disabled={recording}>3초 영상</button>
          </div>
          <div className="cam-controls">
            <span style={{ width: 52 }} />
            <button
              className={`shutter ${mode} ${recording ? 'recording' : ''}`}
              disabled={!ready || recording}
              onClick={mode === 'photo' ? takePhoto : recordClip}
              aria-label={mode === 'photo' ? '사진 찍기' : '3초 녹화'}
            />
            <button className="cam-flip" disabled={!ready || recording} onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="카메라 전환">⟲</button>
          </div>
        </>
      )}
    </div>
  )
}
