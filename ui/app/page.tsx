'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { UploadResult, S3UploadResponse, UploadError } from '../lib/types'

export default function UploadPage() {
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [dragActive, setDragActive] = useState<boolean>(false)

  const handleUpload = async (files: File[]): Promise<void> => {
    setUploading(true)
    const results: UploadResult[] = []

    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const result: S3UploadResponse = await response.json()
          results.push({
            filename: file.name,
            success: true,
            message: 'Uploaded successfully',
            key: result.key,
            size: result.size
          })
        } else {
          const error: UploadError = await response.json()
          results.push({
            filename: file.name,
            success: false,
            message: error.error || 'Upload failed'
          })
        }
      } catch (error) {
        results.push({
          filename: file.name,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setUploadResults(prev => [...prev, ...results])
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    handleUpload(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      handleUpload(files)
    }
  }

  const clearResults = (): void => {
    setUploadResults([])
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 p-8">
        <div
          className={`text-center transition-colors duration-200 ${
            dragActive ? 'border-blue-400 bg-blue-50' : ''
          }`}
          onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
            setDragActive(false)
          }}
          onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />

          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-900">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF, JPG, PNG files up to 10MB
            </p>
          </div>

          <label className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors duration-200">
            Choose Files
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {uploading && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center text-blue-600">
              <Loader className="animate-spin h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Uploading files...</span>
            </div>
          </div>
        )}
      </div>

      {uploadResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Results</h3>
          <div className="space-y-3">
            {uploadResults.map((result: UploadResult, index: number) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-200 ${
                  result.success
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {result.filename}
                    </span>
                    {result.size && (
                      <span className="text-xs text-gray-500">
                        {(result.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-medium ${
                  result.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.message}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={clearResults}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            Clear results
          </button>
        </div>
      )}
    </div>
  )
}