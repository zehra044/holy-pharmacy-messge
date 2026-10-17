import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/prisma.js';

const BUSINESS_NAME = 'Holy Pharmacy';
const OWNER_NAME = 'admin';
const OWNER_EMAIL = 'admin@gmail.com';

async function main() {
  const password = process.env.SEED_OWNER_PASSWORD;
  if (!password) {
    throw new Error('SEED_OWNER_PASSWORD is not set in .env');
  }

  // Safe to run twice: skip if the owner already exists.
  const existing = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
  });
  if (existing) {
    console.log('Owner already exists. Nothing to do.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Creates the business and its first owner in one operation.
  const business = await prisma.business.create({
    data: {
      name: BUSINESS_NAME,
      users: {
        create: {
          fullName: OWNER_NAME,
          email: OWNER_EMAIL,
          passwordHash,
          role: 'OWNER',
        },
      },
    },
  });

  console.log(`Created business "${business.name}" with owner ${OWNER_EMAIL}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());