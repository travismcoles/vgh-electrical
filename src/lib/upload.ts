import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

export async function saveFile(
  file: File,
  subfolder: 'photos' | 'slds' | 'floorplans'
): Promise<{ filename: string; path: string }> {
  const dir = path.join(UPLOAD_DIR, subfolder)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }

  const ext = file.name.split('.').pop()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filename = `${timestamp}-${random}.${ext}`
  const filePath = path.join(dir, filename)

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  return {
    filename: file.name,
    path: `/api/uploads/${subfolder}/${filename}`,
  }
}

export function getLocalPath(urlPath: string): string {
  // Convert /api/uploads/photos/xxx.jpg → /abs/path/uploads/photos/xxx.jpg
  const relativePart = urlPath.replace('/api/uploads/', '')
  return path.join(UPLOAD_DIR, relativePart)
}
