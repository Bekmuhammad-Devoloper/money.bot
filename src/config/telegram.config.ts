import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  botToken: process.env.BOT_TOKEN || '',
  adminIds: (process.env.ADMIN_IDS || '')
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id)),
}));
