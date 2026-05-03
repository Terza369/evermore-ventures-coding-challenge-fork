import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');
  await prisma.event.deleteMany();

  const now = new Date();

  await prisma.event.createMany({
    data: [
      {
        title: 'Weekly Sync',
        startTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 1), // Tomorrow
        endTime: new Date(
          now.getTime() + 1000 * 60 * 60 * 24 * 1 + 1000 * 60 * 60 * 1,
        ), // Tomorrow + 1h
        timezone: 'Europe/Zagreb',
      },
      {
        title: 'Team Building',
        startTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5),
        endTime: new Date(
          now.getTime() + 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 60 * 3,
        ), // + 3h
        timezone: 'America/New_York',
      },
      {
        title: 'Client Demo',
        startTime: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        endTime: new Date(
          now.getTime() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 1,
        ), // 1 hour duration
        timezone: 'Asia/Tokyo',
      },
      {
        title: 'All Hands Meeting',
        startTime: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10), // 10 days from now
        endTime: new Date(
          now.getTime() + 1000 * 60 * 60 * 24 * 10 + 1000 * 60 * 60 * 2,
        ),
        timezone: 'Europe/London',
      },
      {
        title: 'Coffee Chat',
        startTime: new Date(now.getTime() + 1000 * 60 * 60 * 2), // 2 hours from now
        endTime: new Date(now.getTime() + 1000 * 60 * 60 * 2 + 1000 * 60 * 30), // 30 mins
        timezone: 'Australia/Sydney',
      },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
