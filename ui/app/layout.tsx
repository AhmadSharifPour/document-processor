import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Document Upload',
  description: 'Upload documents for AI processing',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Document Processor</h1>
            <p className="text-gray-600 mt-2">Upload your documents for AI processing</p>
          </div>
          {children}
        </div>
      </body>
    </html>
  )
}