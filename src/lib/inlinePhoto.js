// Storage 없이도 사진 포도알을 저장할 수 있게: 작게 줄인 JPEG 를 data URL 로 (Firestore 문서 1MB 제한 안쪽)
export async function photoToDataUrl(blob, maxSide = 720) {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * scale)
    c.height = Math.round(img.naturalHeight * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    for (const q of [0.72, 0.6, 0.48, 0.36]) {
      const d = c.toDataURL('image/jpeg', q)
      if (d.length < 600_000) return d
    }
    return c.toDataURL('image/jpeg', 0.3)
  } finally {
    URL.revokeObjectURL(url)
  }
}
