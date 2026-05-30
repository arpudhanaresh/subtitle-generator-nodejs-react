import { useEffect, useState, type ChangeEvent } from 'react'
import axios from 'axios'
import { api, API_URL } from '../lib/api'
import type { SubtitleRecord } from '../types'

const buttonClass =
  'rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700'

export default function RecentSubtitles() {
  const [subtitles, setSubtitles] = useState<SubtitleRecord[]>([])
  const [filtered, setFiltered] = useState<SubtitleRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareURL, setShareURL] = useState('')
  const [copySuccess, setCopySuccess] = useState('')

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await api.get<SubtitleRecord[]>('/subtitles/recent')
        setSubtitles(res.data)
        setFiltered(res.data)
      } catch {
        setError('No recent subtitles found.')
      } finally {
        setLoading(false)
      }
    }
    fetchRecent()
  }, [])

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)
    setFiltered(subtitles.filter((s) => s.originalFilename.toLowerCase().includes(term)))
  }

  const downloadSubtitle = (sha256: string) => {
    window.open(`${API_URL}/subtitles/${sha256}`, '_blank')
  }

  const shareSubtitle = async (sha256: string, originalFilename: string) => {
    try {
      const res = await api.get(`/subtitles/${sha256}`, { responseType: 'blob' })
      const formData = new FormData()
      formData.append('file', new Blob([res.data], { type: 'text/plain' }), `${originalFilename}.srt`)
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
    <div className="rounded-xl bg-gray-50 p-6 shadow-lg">
      <h3 className="mb-4 text-xl font-semibold text-gray-800">Recent Subtitles</h3>

      <input
        type="text"
        placeholder="Search by name..."
        value={searchTerm}
        onChange={handleSearch}
        className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      />

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : error ? (
        <p className="text-gray-500">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No subtitles found</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => (
            <li key={s.id} className="border-b border-gray-200 pb-3">
              <p className="mb-2 text-gray-700">
                {s.originalFilename} — {s.subtitles.length} sentences
              </p>
              <div className="flex gap-2">
                <button onClick={() => downloadSubtitle(s.sha256)} className={buttonClass}>
                  Download
                </button>
                <button
                  onClick={() => shareSubtitle(s.sha256, s.originalFilename)}
                  className={buttonClass}
                >
                  Share
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {shareURL && (
        <div className="mt-4">
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
