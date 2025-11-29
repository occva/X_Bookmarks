import { FILE_TYPES } from '../constants/api'
import type { Tweet } from '../types'

/**
 * 验证文件是否为有效的 JSON 文件
 */
export function isValidJSONFile(file: File): boolean {
  return (
    file.type === FILE_TYPES.JSON ||
    file.name.toLowerCase().endsWith(FILE_TYPES.JSON_EXTENSION)
  )
}

/**
 * 从文件读取 JSON 数据
 */
export function readJSONFromFile(file: File): Promise<Tweet[]> {
  return new Promise((resolve, reject) => {
    if (!isValidJSONFile(file)) {
      reject(new Error(`文件 ${file.name} 不是有效的 JSON 文件`))
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        let data: any
        
        try {
          data = JSON.parse(content)
        } catch (parseError) {
          // 检测 JSON 格式错误
          const errorMessage = parseError instanceof Error ? parseError.message : '未知错误'
          const error = new Error(`文件 ${file.name} 的 JSON 格式错误: ${errorMessage}`)
          ;(error as any).isJSONError = true
          ;(error as any).fileName = file.name
          ;(error as any).jsonContent = content.substring(0, 200) // 保存前200个字符用于调试
          reject(error)
          return
        }

        if (!Array.isArray(data)) {
          const error = new Error(`文件 ${file.name} 的内容不是数组格式，期望数组格式的推文数据`)
          ;(error as any).isJSONError = true
          ;(error as any).fileName = file.name
          reject(error)
          return
        }

        resolve(data as Tweet[])
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => {
      reject(new Error(`读取文件 ${file.name} 失败`))
    }

    reader.readAsText(file)
  })
}

/**
 * 从多个文件读取 JSON 数据
 */
export async function readJSONFromFiles(files: File[]): Promise<{ data: Tweet[]; errors: string[] }> {
  const allTweets: Tweet[] = []
  const errors: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      const tweetsData = await readJSONFromFile(file)
      allTweets.push(...tweetsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      errors.push(`文件 ${i + 1} (${file.name}): ${errorMessage}`)
      console.error(`解析文件 ${i + 1} 失败:`, err)
    }
  }

  return { data: allTweets, errors }
}

