export interface UploadResult {
	filename: string
	success: boolean
	message: string
	key?: string
	size?: number
  }

  export interface S3UploadResponse {
	success: boolean
	key: string
	filename: string
	size: number
	message: string
  }

  export interface UploadError {
	error: string
	details?: string
  }