// ── CLOUDINARY UPLOAD ─────────────────────────────────────────────────────────
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'pawfinder_uploads'

export const uploadImage = async (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'pawfinder/animals')
  formData.append('tags', 'pawfinder,salta,mascota')

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          width: data.width,
          height: data.height,
          format: data.format
        })
      } else {
        reject(new Error('Error al subir imagen'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Error de conexión')))
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)
    xhr.send(formData)
  })
}

export const getOptimizedUrl = (url, { width = 400, quality = 'auto', format = 'auto' } = {}) => {
  if (!url || !url.includes('cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${width},q_${quality},f_${format}/`)
}

export const getThumbnailUrl = (url) => getOptimizedUrl(url, { width: 200, quality: 70 })
export const getCardUrl = (url) => getOptimizedUrl(url, { width: 400, quality: 80 })
export const getHeroUrl = (url) => getOptimizedUrl(url, { width: 800, quality: 85 })
