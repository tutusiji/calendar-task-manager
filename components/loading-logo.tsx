"use client"

import Image from "next/image"

export function LoadingLogo() {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/Loading.svg"
        alt="Loading..."
        width={100}
        height={100}
        className="object-contain"
        priority
      />
    </div>
  )
}
