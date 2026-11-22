"use client"

import { useState, useEffect } from "react"
import PanoramaLogin from "@/components/admin/panorama-login"
import PanoramaView from "@/components/admin/panorama-view"
import { clearPanoramaToken, hasPanoramaToken } from "@/lib/api/panorama"

export default function PanoramaPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(hasPanoramaToken())
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    clearPanoramaToken()
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <PanoramaLogin onLoginSuccess={handleLoginSuccess} />
  }

  return <PanoramaView onLogout={handleLogout} />
}
