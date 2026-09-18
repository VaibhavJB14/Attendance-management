import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prismaClientSingleton = () => {
  let dbUrl = process.env.DATABASE_URL;

  // If on Vercel, copy SQLite to /tmp to bypass read-only filesystem restrictions
  if (process.env.VERCEL) {
    const sourceDb = path.join(process.cwd(), 'prisma', 'dev.db');
    const targetDb = '/tmp/dev.db';
    try {
      if (!fs.existsSync(targetDb) && fs.existsSync(sourceDb)) {
        fs.copyFileSync(sourceDb, targetDb);
      }
      dbUrl = 'file:/tmp/dev.db';
    } catch (e) {
      console.error('Failed to copy DB to /tmp', e);
    }
  }

  return new PrismaClient({
    ...(dbUrl ? { datasourceUrl: dbUrl } : {})
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
