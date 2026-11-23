"use client";

import type { Task,User } from "@/lib/types";
import { Avatar,AvatarFallback,AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function TaskBarAssignees({ task, taskBarSize, currentUserId, getUserById }: {
  task: Task;
  taskBarSize: "compact" | "comfortable";
  currentUserId?: string;
  getUserById: (id: string) => User | undefined;
}) {
  // 获取所有负责人
  const assignees = task.assignees || [];
  const assigneeCount = assignees.length;

  // 获取前三个负责人的用户信息（超过3人时，确保包含当前用户）
  const assigneeUsers = (() => {
    if (assigneeCount <= 3) {
      // 3人及以下，直接显示所有人
      return assignees
        .map((a) => getUserById(a.userId))
        .filter((u): u is User => !!u);
    } else {
      // 超过3人时，优先显示当前用户
      const currentUserAssignee = assignees.find(a => a.userId === currentUserId);

      if (currentUserAssignee) {
        // 如果当前用户在负责人列表中，确保显示当前用户
        const otherAssignees = assignees.filter(a => a.userId !== currentUserId);
        const displayAssignees = [currentUserAssignee, ...otherAssignees.slice(0, 2)];
        return displayAssignees
          .map((a) => getUserById(a.userId))
          .filter((u): u is User => !!u);
      } else {
        // 当前用户不在负责人列表中，显示前3个
        return assignees
          .slice(0, 3)
          .map((a) => getUserById(a.userId))
          .filter((u): u is User => !!u);
      }
    }
  })();

  // 如果没有负责人，使用创建者
  const fallbackUser = assigneeCount === 0 ? getUserById(task.creatorId) : null;

  const avatarSizeClass =
    taskBarSize === "compact" ? "h-4 w-4" : "h-[22px] w-[22px]";
  const avatarFallbackTextSize =
    taskBarSize === "compact" ? "text-[8px]" : "text-[10px]";

  // 获取用户名首字母
  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <>
      {assigneeCount === 1 ? (
        // 单个负责人：显示头像和姓名
        assigneeUsers[0] && (
          <>
            <Avatar
              className={cn(
                avatarSizeClass,
                "shrink-0 border border-white/30 bg-white"
              )}
            >
              <AvatarImage
                src={assigneeUsers[0].avatar}
                alt={assigneeUsers[0].name}
              />
              <AvatarFallback
                className={cn(
                  "bg-white/20 text-white",
                  avatarFallbackTextSize
                )}
              >
                {getUserInitial(assigneeUsers[0].name)}
              </AvatarFallback>
            </Avatar>
            <span className="shrink-0 font-semibold">
              {assigneeUsers[0].name}
            </span>
            <span className="opacity-60">|</span>
          </>
        )
      ) : assigneeCount === 0 ? (
        // 没有负责人：显示创建者
        fallbackUser && (
          <>
            <Avatar
              className={cn(
                avatarSizeClass,
                "shrink-0 border border-white/30 bg-white"
              )}
            >
              <AvatarImage
                src={fallbackUser.avatar}
                alt={fallbackUser.name}
              />
              <AvatarFallback
                className={cn(
                  "bg-white/20 text-white",
                  avatarFallbackTextSize
                )}
              >
                {getUserInitial(fallbackUser.name)}
              </AvatarFallback>
            </Avatar>
            <span className="shrink-0 font-semibold">
              {fallbackUser.name}
            </span>
            <span className="opacity-60">|</span>
          </>
        )
      ) : assigneeCount <= 3 ? (
        // 2-3个负责人：只显示头像
        <>
          <div className="flex items-center -space-x-1 shrink-0">
            {assigneeUsers.map((user, index) => (
              <Avatar
                key={user.id}
                className={cn(
                  avatarSizeClass,
                  "border border-white/30 bg-white"
                )}
                style={{ zIndex: assigneeCount - index }}
              >
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback
                  className={cn(
                    "bg-white/20 text-white",
                    avatarFallbackTextSize
                  )}
                >
                  {getUserInitial(user.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="opacity-60">|</span>
        </>
      ) : (
        // 4个或更多负责人：显示前3个头像（包括自己）+ "等N人"
        <>
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center -space-x-1">
              {assigneeUsers.slice(0, 3).map((user, index) => (
                <Avatar
                  key={user.id}
                  className={cn(
                    avatarSizeClass,
                    "border border-white/30 bg-white"
                  )}
                  style={{ zIndex: 3 - index }}
                >
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback
                    className={cn(
                      "bg-white/20 text-white",
                      avatarFallbackTextSize
                    )}
                  >
                    {getUserInitial(user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs font-semibold">
              等{assigneeCount}人
            </span>
          </div>
          <span className="opacity-60 -mr-0.5">|</span>
        </>
      )}
    </>
  );
}
