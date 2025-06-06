import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('YMRentals API')//
    .setDescription('API para plataforma de aluguel de equipamentos')
    .setVersion('1.0')
    .addBearerAuth() // Adiciona autenticação JWT no Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Configuração global de validação
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,  // Remove propriedades não definidas nos DTOs
    transform: true,  // Converte tipos automaticamente (ex: string para number)
    transformOptions: { enableImplicitConversion: true }, // Permite conversões automáticas
    forbidNonWhitelisted: true, // Retorna erro se um campo não esperado for enviado
  }));

  // Configuração de CORS
  app.enableCors({
    origin: '*', // Permite requisições de qualquer origem (alterar conforme necessário)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // Definir porta do servidor via variável de ambiente ou padrão 3000
  const PORT = process.env.PORT || 3000;
  // Aumentar limite para 50MB, por exemplo
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  await app.listen(PORT);
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
}
bootstrap();
