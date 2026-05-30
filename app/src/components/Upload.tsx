import { useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import axios from 'axios'
import { api, API_URL } from '../lib/api'
import type { UploadResponse } from '../types'

function formatFileSize(sizeInBytes: number): string {
  const units = ['Bytes', 'KB', 'MB', 'GB']
  let size = sizeInBytes
  let unitIndex = 0
  while (size > 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

const buttonClass =
  'rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50'

export default function Upload() {
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const [sha256, setSha256] = useState('')
  const [videoFileSize, setVideoFileSize] = useState<number | null>(null)
  const [subtitleSize, setSubtitleSize] = useState<number | null>(null)
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [shareURL, setShareURL] = useState('')
  const [copySuccess, setCopySuccess] = useState('')
  const [uploading, setUploading] = useState(false)

  const onFileChange = (selectedFile: File | null) => {
    setFile(selectedFile)
    if (selectedFile) {
      setVideoFileSize(selectedFile.size)
      setVideoURL(URL.createObjectURL(selectedFile))
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const selectedFile = e.dataTransfer.files[0]
    if (selectedFile) onFileChange(selectedFile)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      setMessage('Please select a video file first.')
      return
    }
    const formData = new FormData()
    formData.append('video', file)
    setUploading(true)
    try {
      const res = await api.post<UploadResponse>('/upload', formData)
      setMessage(res.data.message)
      setSha256(res.data.sha256)
      setSubtitleSize(res.data.subtitleSize)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setMessage(err.response.data.error)
      } else {
        setMessage('An error occurred during the upload.')
      }
    } finally {
      setUploading(false)
    }
  }

  const downloadSubtitles = () => {
    window.open(`${API_URL}/subtitles/${sha256}`, '_blank')
  }

  const shareSubtitle = async () => {
    try {
      const res = await api.get(`/subtitles/${sha256}`, { responseType: 'blob' })
      const formData = new FormData()
      formData.append('file', new Blob([res.data], { type: 'text/plain' }), `subtitle_${sha256}.srt`)
      const uploadRes = await axios.post('https://file.io/', formData)
      setShareURL(uploadRes.data.link)
    } catch (err) {
      console.error('Error sharing subtitle:', err)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareURL).then(
      () => setCopySuccess('Copied!'),
      () => setCopySuccess('Failed to copy!'),
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-6 shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-800">Upload Video File</h2>

      <form onSubmit={onSubmit} className="flex w-full flex-col items-center gap-4">
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('video-input')?.click()}
          className="w-full cursor-pointer rounded-lg border-2 border-dashed border-blue-500 p-6 text-center text-gray-600 transition-colors hover:bg-blue-50"
        >
          {file ? file.name : 'Drag & drop your video file here or click to select'}
        </div>
        <input
          id="video-input"
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => onFileChange(e.target.files?.[0] ?? null)}
        />
        {videoFileSize !== null && (
          <p className="text-sm text-gray-500">Selected File Size: {formatFileSize(videoFileSize)}</p>
        )}
        <button type="submit" className={buttonClass} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      {message && <p className="text-red-600">{message}</p>}
      {subtitleSize !== null && (
        <p className="text-green-600">Subtitle Size: {subtitleSize} sentences</p>
      )}

      {sha256 && (
        <div className="flex gap-3">
          <button onClick={downloadSubtitles} className={buttonClass}>
            Download Subtitles
          </button>
          <button onClick={shareSubtitle} className={buttonClass}>
            Share Subtitles
          </button>
        </div>
      )}

      {videoURL && (
        <div className="mt-4 text-center">
          <h3 className="mb-2 font-medium text-gray-700">Preview Video</h3>
          <video controls className="max-w-full rounded-lg border-2 border-blue-500" src={videoURL}>
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {shareURL && (
        <div className="mt-2 text-center">
          <p>
            Shareable URL:{' '}
            <a
              href={shareURL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {shareURL}
            </a>
          </p>
          <button onClick={copyToClipboard} className={`${buttonClass} mt-2`}>
            Copy URL
          </button>
          {copySuccess && <span className="ml-2 text-green-600">{copySuccess}</span>}
        </div>
      )}
    </div>
  )
}
