export interface SubtitleLine {
  start: number
  end: number
  text: string
}

export interface SubtitleRecord {
  id: number
  sha256: string
  originalFilename: string
  format: string
  subtitles: SubtitleLine[]
  created_at: string | null
}

export interface UploadResponse {
  message: string
  sha256: string
  filename: string
  format: string
  subtitleSize: number
}
