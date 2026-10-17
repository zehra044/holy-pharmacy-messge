import { PrismaClient } from '@prisma/client';

// One shared client for the whole app.
// Every file that needs the database imports this same instance.
const prisma = new PrismaClient();

export default prisma;