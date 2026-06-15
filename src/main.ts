import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

let cachedServer: express.Express;

async function bootstrap() {
  if (!cachedServer) {
    const server = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), { bufferLogs: true });
  const config = app.get(ConfigService);
  const requestBodyLimit = config.get<string>('app.requestBodyLimit', '2mb');

  app.useLogger(app.get(Logger));
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));
  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('app.corsOrigins'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaExceptionFilter(httpAdapter));

  if (config.get<string>('SWAGGER_ENABLED') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.get<string>('APP_NAME', 'HR Letter Management API'))
      .setDescription('API documentation for HR letter templates, approvals, numbering, and archives.')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(config.get<string>('SWAGGER_PATH', 'docs'), app, document);
  }

  await app.init();

    if (process.env.NODE_ENV !== 'production') {
      await app.listen(config.get<number>('app.port', 3000));
    }
    
    cachedServer = server;
  }
  return cachedServer;
}

if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}

export default async (req: express.Request, res: express.Response) => {
  const server = await bootstrap();
  return server(req, res);
};
