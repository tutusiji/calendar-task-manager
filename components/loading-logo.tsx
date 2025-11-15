"use client"

import Image from "next/image"

export function LoadingLogo() {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/Loading.svg"
        alt="Loading..."
        width={200}
        height={200}
        className="object-contain"
        priority
      />
    </div>
  )
}
