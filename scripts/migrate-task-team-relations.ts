import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始数据库迁移...')
  
  try {
    // 1. 添加Task.teamId字段
    console.log('1. 添加Task.teamId字段...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
    `)
    
    // 2. 创建索引
    console.log('2. 创建索引...')
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Task_teamId_idx" ON "Task"("teamId");
    `)
    
    // 3. 添加外键约束（如果不存在）
    console.log('3. 添加外键约束...')
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Task_teamId_fkey'
        ) THEN
          ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" 
          FOREIGN KEY ("teamId") REFERENCES "Team"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `)
    
    // 4. 移除Project表中的teamId索引
    console.log('4. 移除Project.teamId索引...')
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "Project_teamId_idx";
    `)
    
    // 5. 移除Project.teamId的外键约束
    console.log('5. 移除Project.teamId外键约束...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_teamId_fkey";
    `)
    
    // 6. 删除Project表中的teamId列
    console.log('6. 删除Project.teamId列...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Project" DROP COLUMN IF EXISTS "teamId";
    `)
    
    console.log('✅ 迁移成功完成！')
  } catch (error) {
    console.error('❌ 迁移失败:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
