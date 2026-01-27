import { registerAs } from '@nestjs/config';

export default registerAs('scheduler', () => ({
  notificationCheckHour: parseInt(process.env.NOTIFICATION_CHECK_HOUR || '9', 10),
  notificationCheckMinute: parseInt(process.env.NOTIFICATION_CHECK_MINUTE || '0', 10),
}));
