"use client"

import { useState, useEffect } from "react"
import PanoramaLogin from "@/components/admin/panorama-login"
import PanoramaView from "@/components/admin/panorama-view"

export default function PanoramaPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const authenticated = sessionStorage.getItem("panorama_auth") === "true"
    setIsAuthenticated(authenticated)
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    sessionStorage.removeItem("panorama_auth")
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <PanoramaLogin onLoginSuccess={handleLoginSuccess} />
  }

  return <PanoramaView onLogout={handleLogout} />
}
