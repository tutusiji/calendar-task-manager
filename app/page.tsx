"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { MonthView } from "@/components/calendar/month-view"
import { WeekView } from "@/components/calendar/week-view"
import { PersonalWeekView } from "@/components/calendar/personal-week-view"
import { ViewToggle } from "@/components/calendar/view-toggle"
import { TaskDetailPanel } from "@/components/task/task-detail-panel"
import { TaskEditPanel } from "@/components/task/task-edit-panel"
import { MiniCalendar } from "@/components/sidebar/mini-calendar"
import { NavigationMenu } from "@/components/sidebar/navigation-menu"
import { UserMenu } from "@/components/user-menu"
import { MainNavigation } from "@/components/navigation/main-navigation"
import { SpaceSwitcher } from "@/components/space-switcher"
import { NotificationBell } from "@/components/notification-bell"
import { ListView } from "@/components/views/list-view"
import { StatsView } from "@/components/views/stats-view"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getToken } from "@/lib/api-client"
import { showToast } from "@/lib/toast"
import { LoadingLogo } from "@/components/loading-logo"

export default function Home() {
  const router = useRouter()
  const [showLoading, setShowLoading] = useState(false)
  
  const { 
    viewMode, 
    navigationMode, 
    mainViewMode, 
    taskCreation, 
    closeTaskCreation, 
    taskEdit, 
    closeTaskEdit,
    fetchAllData,
    isLoadingTasks,
    isLoadingProjects,
    isLoadingUsers,
    isLoadingTeams,
    error,
  } = useCalendarStore()

  // 检查登录状态并加载数据
  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser")
    const token = getToken()
    
    // 必须同时有用户信息和 token
    if (!currentUser || !token) {
      router.push("/login")
      return
    }

    // 加载所有数据
    fetchAllData()
  }, [router, fetchAllData])

  // 显示加载状态
  const isLoading = isLoadingTasks || isLoadingProjects || isLoadingUsers || isLoadingTeams

  // 处理 loading 的淡入淡出效果
  useEffect(() => {
    if (isLoading) {
      // 立即显示 loading（淡入）
      setShowLoading(true)
    } else {
      // 延迟隐藏 loading，让淡出动画完成
      const timer = setTimeout(() => {
        setShowLoading(false)
      }, 300) // 与 CSS transition 时间一致
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  // 显示错误提示
  useEffect(() => {
    if (error) {
      // 如果是认证错误，跳转到登录页
      if (error.includes('认证') || error.includes('Token') || error.includes('登录')) {
        showToast.error('认证失败', '请重新登录')
        localStorage.removeItem("currentUser")
        router.push("/login")
      } else {
        // 其他错误显示 toast 通知
        showToast.error('操作失败', error)
      }
    }
  }, [error, router])

  // 根据 navigationMode 决定渲染哪个视图
  const renderCalendarView = () => {
    if (viewMode === "month") {
      return <MonthView />
    }
    
    // 周视图
    if (navigationMode === "my-days") {
      // My Days 下的周视图是个人单行视图
      return <PersonalWeekView />
    } else {
      // Team 或 Project 下的周视图是团队多行视图
      return <WeekView />
    }
  }

  // 根据主视图模式渲染不同内容
  const renderMainContent = () => {
    switch (mainViewMode) {
      case "list":
        return (
          <>
            <CalendarHeader />
            <ListView />
          </>
        )
      case "stats":
        return (
          <>
            <CalendarHeader />
            <StatsView />
          </>
        )
      case "calendar":
      default:
        return (
          <>
            <CalendarHeader />
            <div className="flex-1 overflow-hidden">{renderCalendarView()}</div>
          </>
        )
    }
  }

  return (
    <div className="flex h-screen">
      <aside className="w-72 border-r border-border bg-background flex flex-col">
        {/* Logo */}
        <div className="border-b border-border bg-card px-6 pt-[14px] pb-[15px]">
          <div className="flex items-center gap-3">
            {/* Logo 图片 */}
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src="/logo.png"
                alt="OxHorse Planner Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-[22px] font-bold tracking-tight bg-linear-to-r from-purple-600 via-blue-500 to-red-500 bg-clip-text text-transparent">
                OxHorse Planner
              </h1>
              <p className="text-[11px] text-muted-foreground" style={{ fontFamily: 'MomoLite, sans-serif' }}>打工人必备的轻量任务管理工具</p>
            </div>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <NavigationMenu />
        </div>
        
        {/* Mini Calendar at bottom */}
        <div className="">
          <MiniCalendar />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Top Bar with Main Navigation and View Controls */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          {/* Left: Space Switcher + Main Navigation (日历/清单/统计) */}
          <div className="flex items-center gap-4">
            <SpaceSwitcher />
            <div className="h-6 w-px bg-border" />
            <MainNavigation />
          </div>
          
          {/* Right: View Toggle, Notification Bell and User Menu */}
          <div className="flex items-center gap-4">
            <ViewToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          {showLoading && (
            <div 
              className={`absolute inset-0 bg-background/50 z-40 flex items-center justify-center transition-opacity duration-300 ${
                isLoading ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <LoadingLogo />
            </div>
          )}
          {renderMainContent()}
        </div>
      </div>

      {taskCreation.isOpen && taskCreation.startDate && taskCreation.endDate && (
        <TaskDetailPanel
          startDate={taskCreation.startDate}
          endDate={taskCreation.endDate}
          onClose={closeTaskCreation}
        />
      )}

      {taskEdit.isOpen && taskEdit.task && <TaskEditPanel task={taskEdit.task} onClose={closeTaskEdit} />}
    </div>
  )
}
