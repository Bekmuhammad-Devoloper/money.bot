import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { getBotToken } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create the application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get configuration
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Start the application
  await app.listen(port);

  // Manually launch the bot with polling
  try {
    const bot = app.get<Telegraf>(getBotToken());
    await bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'callback_query'],
    });

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📍 Environment: ${nodeEnv}`);
    logger.log(`🤖 Bot is ready and listening for updates!`);

    // Graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.log(`Received ${signal}, shutting down gracefully...`);
        bot.stop(signal);
        await app.close();
        process.exit(0);
      });
    });
  } catch (error: any) {
    logger.error(`❌ Failed to launch bot: ${error?.message || error}`);
    logger.error(error?.stack);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
