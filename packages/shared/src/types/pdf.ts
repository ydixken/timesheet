export type PdfTheme = 'classic' | 'terminal'

export interface PdfExport {
  id: string
  projectId: string
  month: string
  filename: string
  createdAt: string
}
