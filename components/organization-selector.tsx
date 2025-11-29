"use client"

import { useState, useEffect, useRef } from "react"
import { Check, Search, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface Organization {
  id: string
  name: string
  isVerified: boolean
  description?: string
}

interface OrganizationSelectorProps {
  value: string
  onChange: (value: string, organization: Organization | null) => void
  disabled?: boolean
  required?: boolean
}

export function OrganizationSelector({
  value,
  onChange,
  disabled,
  required
}: OrganizationSelectorProps) {
  const [searchTerm, setSearchTerm] = useState(value)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 搜索组织
  const searchOrganizations = async (search: string) => {
    if (!search.trim()) {
      setOrganizations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/organizations?search=${encodeURIComponent(search)}`)
      const data = await response.json()
      
      if (data.success) {
        setOrganizations(data.data)
        
        // 检测是否有完全匹配的组织
        const exactMatch = data.data.find((org: Organization) => 
          org.name.toLowerCase() === search.toLowerCase()
        )
        
        if (exactMatch && !selectedOrg) {
          // 如果找到完全匹配且当前没有选中的组织，自动设置为选中
          setSelectedOrg(exactMatch)
          onChange(exactMatch.name, exactMatch)
        }
      }
    } catch (error) {
      console.error("搜索组织失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // 防抖搜索 - 500ms 延迟
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchOrganizations(searchTerm)
    }, 500)

    return () => {
      clearTimeout(debounceTimer)
    }
  }, [searchTerm])

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchTerm(val)
    setShowDropdown(true)
    
    // 如果输入值改变，清除已选择的组织
    if (selectedOrg && val !== selectedOrg.name) {
      setSelectedOrg(null)
      onChange(val, null)
    } else if (!selectedOrg) {
      onChange(val, null)
    }
  }

  const handleSelectOrganization = (org: Organization) => {
    setSearchTerm(org.name)
    setSelectedOrg(org)
    setShowDropdown(false)
    onChange(org.name, org)
  }

  // 检测是否为新组织（没有完全匹配且没有选中）
  const isNewOrganization = searchTerm.trim() !== "" && 
    !selectedOrg && 
    !isLoading
  
  // 检测是否有完全匹配的组织
  const hasExactMatch = selectedOrg !== null

  return (
    <div className="space-y-2">
      <Label htmlFor="organization">
        空间/组织 {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            id="organization"
            type="text"
            placeholder="搜索或输入组织名称"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)}
            disabled={disabled}
            required={required}
            className="pl-9"
          />
        </div>

        {/* 下拉列表 */}
        {showDropdown && (organizations.length > 0 || isLoading) && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
          >
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                搜索中...
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelectOrganization(org)}
                    className={cn(
                      "relative flex w-full cursor-pointer items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      selectedOrg?.id === org.id && "bg-accent"
                    )}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <span>{org.name}</span>
                      {org.isVerified && (
                        <Shield className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    {selectedOrg?.id === org.id && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 状态标记 */}
        {searchTerm && (
          <div className="mt-1.5 text-xs">
            {hasExactMatch ? (
              <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                <Check className="h-3 w-3" />
                已存在
                {selectedOrg?.isVerified && (
                  <Shield className="h-3 w-3 text-blue-500" />
                )}
              </span>
            ) : isNewOrganization ? (
              <span className="text-amber-600 font-medium">
                未注册
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
