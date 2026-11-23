import { prisma } from "@/lib/prisma"

export function findCurrentOrganization(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { currentOrganizationId: true },
  })
}

export function findOrganizationMembership(userId: string, organizationId: string) {
  return prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { id: true },
  })
}

export function setCurrentOrganization(userId: string, organizationId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { currentOrganizationId: organizationId },
  })
}

export function searchOrganizationDirectory(search: string) {
  return prisma.organization.findMany({
    where: {
      name: {
        contains: search,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      isVerified: true,
      description: true,
    },
    take: 10,
  })
}

export function findOrganizationMemberships(userId: string, organizationId?: string | null) {
  // 返回用户所属的所有组织
  return prisma.organizationMember.findMany({
    where: { userId, ...(organizationId ? { organizationId } : {}) },
    include: {
      organization: {
        include: {
          _count: {
            select: {
              members: true,
              teams: true,
              projects: true,
            },
          },
        },
      },
    },
  })
}
