"use client"

import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Shield } from "lucide-react"
import type * as React from "react"

export function OrganizationCreateDialog({
  isCreating,
  setIsCreating,
  setSearchResults,
  setSelectedExistingOrg,
  searchTimeout,
  formData,
  handleNameChange,
  isSearching,
  searchResults,
  selectSearchResult,
  selectedExistingOrg,
  setFormData,
  isLoading,
  handleSaveCreate,
}: {
  isCreating: boolean
  setIsCreating: React.Dispatch<React.SetStateAction<boolean>>
  setSearchResults: React.Dispatch<React.SetStateAction<{ id: string; name: string; description?: string; isVerified: boolean; }[]>>
  setSelectedExistingOrg: React.Dispatch<React.SetStateAction<string | null>>
  searchTimeout: NodeJS.Timeout | null
  formData: { name: string; description: string; joinRequiresApproval: boolean; }
  handleNameChange: (value: string) => void
  isSearching: boolean
  searchResults: { id: string; name: string; description?: string; isVerified: boolean; }[]
  selectSearchResult: (org: any) => void
  selectedExistingOrg: string | null
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; description: string; joinRequiresApproval: boolean; }>>
  isLoading: boolean
  handleSaveCreate: () => Promise<void>
}) {
  return (
    <Dialog open={isCreating} onOpenChange={(open) => {
      if (!open) {
        setIsCreating(false)
        setSearchResults([])
        setSelectedExistingOrg(null)
        if (searchTimeout) clearTimeout(searchTimeout)
      }
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新增空间</DialogTitle>
          <DialogDescription>
            搜索并加入已有空间，或创建一个新的空间/组织
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">空间名称 *</Label>
            <div className="relative">
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="输入空间名称搜索或创建"
                autoComplete="off"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>

            {/* 搜索结果下拉列表 */}
            {searchResults.length > 0 && (
              <div className="border rounded-md shadow-lg bg-background max-h-60 overflow-y-auto">
                {searchResults.map((org) => (
                  <div
                    key={org.id}
                    className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                    onClick={() => selectSearchResult(org)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{org.name}</span>
                          {org.isVerified && (
                            <Badge variant="secondary" className="text-xs">
                              <Shield className="h-3 w-3 mr-1" />
                              已认证
                            </Badge>
                          )}
                        </div>
                        {org.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {org.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 提示信息 - 只在未选择已有空间时显示 */}
            {!selectedExistingOrg && formData.name.trim() && !isSearching && searchResults.length === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <div className="shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    这是一个新的未注册空间
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    点击"创建"将创建名为 "<span className="font-semibold">{formData.name}</span>" 的新空间，您将成为所有者
                  </p>
                </div>
              </div>
            )}

            {selectedExistingOrg && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <div className="shrink-0 mt-0.5">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                    已选择现有空间
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    点击"申请加入"将向 "<span className="font-semibold">{formData.name}</span>" 的创建者发送加入申请
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-description">
              {selectedExistingOrg ? "申请留言" : "描述"}
            </Label>
            <Textarea
              id="create-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={
                selectedExistingOrg
                  ? "输入申请留言（可选）"
                  : "输入空间描述（可选）"
              }
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false)
                setSearchResults([])
                setSelectedExistingOrg(null)
                if (searchTimeout) clearTimeout(searchTimeout)
              }}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveCreate}
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? "处理中..." : selectedExistingOrg ? "申请加入" : "创建"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
