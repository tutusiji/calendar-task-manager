import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("开始为两个空间添加测试数据...")

  // 获取现有的两个组织
  const organizations = await prisma.organization.findMany({
    take: 2,
    orderBy: { createdAt: "asc" },
  })

  if (organizations.length < 2) {
    console.error("需要至少两个组织！请先创建组织。")
    return
  }

  const [org1, org2] = organizations
  console.log(`组织1: ${org1.name}`)
  console.log(`组织2: ${org2.name}`)

  // 为组织1创建用户
  const org1Users = await createUsersForOrg(org1.id, [
    { username: "alice_dev", name: "Alice Chen", email: "alice@company1.com", role: "前端开发" },
    { username: "bob_design", name: "Bob Wang", email: "bob@company1.com", role: "设计师" },
    { username: "carol_pm", name: "Carol Liu", email: "carol@company1.com", role: "产品经理" },
    { username: "david_backend", name: "David Zhang", email: "david@company1.com", role: "后端开发" },
    { username: "emma_ux", name: "Emma Wu", email: "emma@company1.com", role: "交互设计师" },
    { username: "frank_dev", name: "Frank Li", email: "frank@company1.com", role: "前端开发" },
  ])

  // 为组织2创建用户
  const org2Users = await createUsersForOrg(org2.id, [
    { username: "grace_lead", name: "Grace Zhao", email: "grace@company2.com", role: "项目管理" },
    { username: "henry_dev", name: "Henry Yang", email: "henry@company2.com", role: "后端开发" },
    { username: "iris_design", name: "Iris Sun", email: "iris@company2.com", role: "设计师" },
    { username: "jack_qa", name: "Jack Huang", email: "jack@company2.com", role: "前端开发" },
    { username: "kate_pm", name: "Kate Zhou", email: "kate@company2.com", role: "产品经理" },
    { username: "leo_dev", name: "Leo Ma", email: "leo@company2.com", role: "后端开发" },
  ])

  console.log(`为组织1创建了 ${org1Users.length} 个用户`)
  console.log(`为组织2创建了 ${org2Users.length} 个用户`)

  // 为组织1创建团队
  const org1Teams = await createTeamsForOrg(org1.id, org1Users, [
    { name: "前端开发团队", color: "#3b82f6", description: "负责前端界面开发", creatorIndex: 0 },
    { name: "设计团队", color: "#ec4899", description: "UI/UX设计团队", creatorIndex: 1 },
    { name: "后端开发团队", color: "#10b981", description: "服务端开发", creatorIndex: 3 },
  ])

  // 为组织2创建团队
  const org2Teams = await createTeamsForOrg(org2.id, org2Users, [
    { name: "产品研发团队", color: "#f59e0b", description: "产品研发与创新", creatorIndex: 0 },
    { name: "运营团队", color: "#8b5cf6", description: "产品运营与推广", creatorIndex: 2 },
    { name: "技术支持团队", color: "#06b6d4", description: "技术支持与维护", creatorIndex: 1 },
  ])

  console.log(`为组织1创建了 ${org1Teams.length} 个团队`)
  console.log(`为组织2创建了 ${org2Teams.length} 个团队`)

  // 为组织1创建项目
  const org1Projects = await createProjectsForOrg(org1.id, org1Users, [
    { name: "电商平台重构", color: "#3b82f6", description: "电商平台前端重构项目", creatorIndex: 0 },
    { name: "移动端适配", color: "#ec4899", description: "网站移动端响应式适配", creatorIndex: 1 },
    { name: "API服务升级", color: "#10b981", description: "后端API服务性能优化", creatorIndex: 3 },
    { name: "用户体验优化", color: "#f59e0b", description: "提升用户体验的优化项目", creatorIndex: 2 },
  ])

  // 为组织2创建项目
  const org2Projects = await createProjectsForOrg(org2.id, org2Users, [
    { name: "新产品开发", color: "#8b5cf6", description: "全新产品线开发", creatorIndex: 0 },
    { name: "数据分析平台", color: "#06b6d4", description: "企业数据分析平台", creatorIndex: 1 },
    { name: "客户管理系统", color: "#f97316", description: "CRM系统开发", creatorIndex: 4 },
  ])

  console.log(`为组织1创建了 ${org1Projects.length} 个项目`)
  console.log(`为组织2创建了 ${org2Projects.length} 个项目`)

  // 为组织1创建任务
  await createTasksForOrg(org1Users, org1Projects, org1Teams)

  // 为组织2创建任务
  await createTasksForOrg(org2Users, org2Projects, org2Teams)

  console.log("✅ 所有测试数据创建完成！")
}

async function createUsersForOrg(
  orgId: string,
  userData: Array<{ username: string; name: string; email: string; role: string }>
) {
  const users = []

  for (const data of userData) {
    // 检查用户是否已存在
    let user = await prisma.user.findUnique({
      where: { username: data.username },
    })

    if (!user) {
      // 创建新用户
      const hashedPassword = await bcrypt.hash("123456", 10)
      user = await prisma.user.create({
        data: {
          username: data.username,
          password: hashedPassword,
          name: data.name,
          email: data.email,
          role: data.role,
          currentOrganizationId: orgId,
        },
      })
      console.log(`  创建用户: ${user.name}`)
    } else {
      console.log(`  用户已存在: ${user.name}`)
    }

    // 确保用户是组织成员
    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    })

    if (!membership) {
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          role: "MEMBER",
        },
      })
    }

    users.push(user)
  }

  return users
}

async function createTeamsForOrg(
  orgId: string,
  users: any[],
  teamData: Array<{ name: string; color: string; description: string; creatorIndex: number }>
) {
  const teams = []

  for (const data of teamData) {
    const creator = users[data.creatorIndex]

    const team = await prisma.team.create({
      data: {
        name: data.name,
        color: data.color,
        description: data.description,
        organizationId: orgId,
        creatorId: creator.id,
        taskPermission: "ALL_MEMBERS",
      },
    })

    console.log(`  创建团队: ${team.name} (创建者: ${creator.name})`)

    // 为团队添加成员（包括创建者和其他几个成员）
    const memberCount = Math.min(4, users.length)
    for (let i = 0; i < memberCount; i++) {
      await prisma.teamMember.create({
        data: {
          userId: users[i].id,
          teamId: team.id,
        },
      })
    }

    teams.push(team)
  }

  return teams
}

async function createProjectsForOrg(
  orgId: string,
  users: any[],
  projectData: Array<{ name: string; color: string; description: string; creatorIndex: number }>
) {
  const projects = []

  for (const data of projectData) {
    const creator = users[data.creatorIndex]

    const project = await prisma.project.create({
      data: {
        name: data.name,
        color: data.color,
        description: data.description,
        organizationId: orgId,
        creatorId: creator.id,
        taskPermission: "ALL_MEMBERS",
      },
    })

    console.log(`  创建项目: ${project.name} (创建者: ${creator.name})`)

    // 为项目添加成员
    const memberCount = Math.min(5, users.length)
    for (let i = 0; i < memberCount; i++) {
      await prisma.projectMember.create({
        data: {
          userId: users[i].id,
          projectId: project.id,
        },
      })
    }

    projects.push(project)
  }

  return projects
}

async function createTasksForOrg(users: any[], projects: any[], teams: any[]) {
  const now = new Date()
  const tasks = []

  // 为每个项目创建一些任务
  for (const project of projects) {
    // 创建日常任务
    for (let i = 0; i < 3; i++) {
      const daysOffset = i - 1 // 昨天、今天、明天
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() + daysOffset)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)

      const user = users[i % users.length]

      const task = await prisma.task.create({
        data: {
          title: `${project.name} - 日常开发任务 ${i + 1}`,
          description: `完成${project.name}的相关开发工作`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startTime: "09:00",
          endTime: "18:00",
          type: "daily",
          userId: user.id,
          projectId: project.id,
        },
      })
      tasks.push(task)
    }

    // 创建会议
    for (let i = 0; i < 2; i++) {
      const daysOffset = i * 2 // 今天和后天
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() + daysOffset)
      const endDate = new Date(startDate)

      const user = users[(i + 1) % users.length]

      const task = await prisma.task.create({
        data: {
          title: `${project.name} - 项目进度会议`,
          description: `讨论${project.name}的当前进度和下一步计划`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startTime: i === 0 ? "14:00" : "10:00",
          endTime: i === 0 ? "15:30" : "11:30",
          type: "meeting",
          userId: user.id,
          projectId: project.id,
        },
      })
      tasks.push(task)
    }
  }

  // 为每个团队创建一些任务
  for (const team of teams) {
    // 团队日常任务 - 关联到第一个项目
    const defaultProject = projects[0]
    
    for (let i = 0; i < 2; i++) {
      const daysOffset = i
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() + daysOffset)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 2)

      const user = users[i % users.length]

      const task = await prisma.task.create({
        data: {
          title: `${team.name} - 团队协作任务`,
          description: `${team.name}的日常协作工作`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startTime: "09:00",
          endTime: "18:00",
          type: "daily",
          userId: user.id,
          projectId: defaultProject.id,
          teamId: team.id,
        },
      })
      tasks.push(task)
    }

    // 团队会议
    const meetingDate = new Date(now)
    meetingDate.setDate(meetingDate.getDate() + 1)
    const user = users[0]

    const task = await prisma.task.create({
      data: {
        title: `${team.name} - 每周例会`,
        description: `${team.name}的每周工作总结与计划`,
        startDate: meetingDate.toISOString(),
        endDate: meetingDate.toISOString(),
        startTime: "15:00",
        endTime: "16:00",
        type: "meeting",
        userId: user.id,
        projectId: defaultProject.id,
        teamId: team.id,
      },
    })
    tasks.push(task)
  }

  // 为用户创建一些个人休假 - 关联到第一个项目
  const defaultProject = projects[0]
  for (let i = 0; i < Math.min(3, users.length); i++) {
    const user = users[i]
    const vacationStart = new Date(now)
    vacationStart.setDate(vacationStart.getDate() + 7 + i * 3)
    const vacationEnd = new Date(vacationStart)
    vacationEnd.setDate(vacationEnd.getDate() + 2) // 3天假期

    const task = await prisma.task.create({
      data: {
        title: `${user.name}的年假`,
        description: "休年假，外出旅游",
        startDate: vacationStart.toISOString(),
        endDate: vacationEnd.toISOString(),
        type: "vacation",
        userId: user.id,
        projectId: defaultProject.id,
      },
    })
    tasks.push(task)
  }

  // 创建一些跨天的长期任务
  for (let i = 0; i < Math.min(2, projects.length); i++) {
    const project = projects[i]
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() + 3)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 7) // 一周的长期任务

    const user = users[i % users.length]

    const task = await prisma.task.create({
      data: {
        title: `${project.name} - 长期开发任务`,
        description: `${project.name}的一个较大功能模块开发`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startTime: "09:00",
        endTime: "18:00",
        type: "daily",
        userId: user.id,
        projectId: project.id,
      },
    })
    tasks.push(task)
  }

  console.log(`  创建了 ${tasks.length} 个任务`)
}

main()
  .catch((e) => {
    console.error("错误:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

