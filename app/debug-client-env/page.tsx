'use client'

import { useEffect, useState } from 'react'

export default function EnvDebug() {
  const [envVars, setEnvVars] = useState<any>(null)

  useEffect(() => {
    setEnvVars({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      keyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    })
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Environment Debug (Client-side)</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(envVars, null, 2)}
      </pre>
    </div>
  )
}
