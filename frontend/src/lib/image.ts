/**
 * Shrink a camera photo to a JPEG of at most maxBytes (NF-02: form photo
 * ≤ 200 KB), so it costs the sales little data. Longest side ≤ 1280 px.
 */
export async function compressImage(file: Blob, maxBytes = 200_000, maxSide = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  let best: Blob | null = null

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    for (const quality of [0.8, 0.65, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (!blob) continue
      best = blob
      if (blob.size <= maxBytes) {
        bitmap.close()
        return blob
      }
    }
    scale *= 0.75
  }

  bitmap.close()
  if (!best) throw new Error('Foto tidak bisa diproses. Coba ambil ulang.')
  return best
}
