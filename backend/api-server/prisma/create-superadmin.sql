-- SQL Script to create or update the superadmin user on dev.mercon.tech / production DB
-- Run via psql or PgAdmin on the target database:

INSERT INTO "User" (
  id, username, email, phone, name, role, "isSuperAdmin", "isActive", password_hash, "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'superadmin',
  'superadmin@mercon.tech',
  '+966500000000',
  'Platform SuperAdmin',
  'SuperAdmin'::"Role",
  true,
  true,
  '$2b$10$jaPshazOd6YkRzsT.ZSN8O7VnIPyNQqOig/GHH7QQN/xr030FDwua',
  NOW(),
  NOW()
)
ON CONFLICT (username)
DO UPDATE SET
  role = 'SuperAdmin'::"Role",
  "isSuperAdmin" = true,
  "isActive" = true,
  password_hash = '$2b$10$jaPshazOd6YkRzsT.ZSN8O7VnIPyNQqOig/GHH7QQN/xr030FDwua',
  "updatedAt" = NOW();
