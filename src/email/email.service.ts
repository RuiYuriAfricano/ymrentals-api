import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verificar conexão
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connected successfully');
    } catch (error) {
      this.logger.error('Email service connection failed:', error);
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const mailOptions = {
        from: `"YMRentals" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendNotificationEmail(
    to: string,
    userName: string,
    title: string,
    message: string,
    template?: string,
  ) {
    const subject = `YMRentals - ${title}`;
    const html = this.getEmailTemplate(template || 'notification', {
      userName,
      title,
      message,
    });

    return this.sendEmail(to, subject, html);
  }

  async sendWelcomeEmail(to: string, userName: string) {
    const subject = 'Bem-vindo ao YMRentals!';
    const html = this.getEmailTemplate('welcome', { userName });
    return this.sendEmail(to, subject, html);
  }

  async sendRentalCreatedEmail(
    to: string,
    userName: string,
    equipmentName: string,
    rentalId: string,
  ) {
    const subject = 'Solicitação de Aluguel Criada - YMRentals';
    const html = this.getEmailTemplate('rental-created', {
      userName,
      equipmentName,
      rentalId,
    });
    return this.sendEmail(to, subject, html);
  }

  async sendRentalStatusChangeEmail(
    to: string,
    userName: string,
    equipmentName: string,
    status: string,
    rentalId: string,
  ) {
    const statusMessages = {
      APPROVED: 'aprovada',
      REJECTED: 'rejeitada',
      ACTIVE: 'ativada',
      COMPLETED: 'concluída',
      CANCELLED: 'cancelada',
    };

    const subject = `Status do Aluguel Atualizado - YMRentals`;
    const html = this.getEmailTemplate('rental-status-change', {
      userName,
      equipmentName,
      status: statusMessages[status] || status,
      rentalId,
    });
    return this.sendEmail(to, subject, html);
  }

  async sendEquipmentModerationEmail(
    to: string,
    userName: string,
    equipmentName: string,
    status: string,
    reason?: string,
  ) {
    const isApproved = status === 'APPROVED';
    const subject = `Equipamento ${isApproved ? 'Aprovado' : 'Rejeitado'} - YMRentals`;
    const html = this.getEmailTemplate('equipment-moderation', {
      userName,
      equipmentName,
      isApproved,
      reason,
    });
    return this.sendEmail(to, subject, html);
  }

  async sendAdminPendingApprovalEmail(
    to: string,
    adminName: string,
    type: 'user' | 'equipment',
    itemName: string,
  ) {
    const subject = `${type === 'user' ? 'Usuário' : 'Equipamento'} Pendente de Aprovação - YMRentals`;
    const html = this.getEmailTemplate('admin-pending-approval', {
      adminName,
      type: type === 'user' ? 'usuário' : 'equipamento',
      itemName,
    });
    return this.sendEmail(to, subject, html);
  }

  async sendModeratorPendingEquipmentEmail(
    to: string,
    moderatorName: string,
    equipmentName: string,
  ) {
    const subject = 'Equipamento Pendente de Moderação - YMRentals';
    const html = this.getEmailTemplate('moderator-pending-equipment', {
      moderatorName,
      equipmentName,
    });
    return this.sendEmail(to, subject, html);
  }

  private getEmailTemplate(template: string, data: any): string {
    const baseTemplate = this.getBaseTemplate();
    
    switch (template) {
      case 'welcome':
        return baseTemplate.replace(
          '{{CONTENT}}',
          `
          <h2 style="color: #3569b0;">Bem-vindo ao YMRentals, ${data.userName}!</h2>
          <p>Estamos muito felizes em tê-lo conosco. Nossa plataforma oferece os melhores equipamentos para aluguel em Angola.</p>
          <p>Explore nossa ampla seleção de equipamentos e encontre exatamente o que precisa para seu projeto.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/equipment" style="background-color: #3569b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Explorar Equipamentos</a>
          </div>
          `
        );

      case 'rental-created':
        return baseTemplate.replace(
          '{{CONTENT}}',
          `
          <h2 style="color: #3569b0;">Solicitação de Aluguel Criada</h2>
          <p>Olá ${data.userName},</p>
          <p>Sua solicitação de aluguel para <strong>"${data.equipmentName}"</strong> foi criada com sucesso.</p>
          <p><strong>ID da Solicitação:</strong> ${data.rentalId}</p>
          <p>Nossa equipe está analisando sua solicitação e você receberá uma atualização em breve.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/my-rentals" style="background-color: #3569b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Meus Aluguéis</a>
          </div>
          `
        );

      case 'rental-status-change':
        return baseTemplate.replace(
          '{{CONTENT}}',
          `
          <h2 style="color: #3569b0;">Status do Aluguel Atualizado</h2>
          <p>Olá ${data.userName},</p>
          <p>O status da sua solicitação de aluguel para <strong>"${data.equipmentName}"</strong> foi atualizado.</p>
          <p><strong>Novo Status:</strong> ${data.status}</p>
          <p><strong>ID da Solicitação:</strong> ${data.rentalId}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/my-rentals" style="background-color: #3569b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Detalhes</a>
          </div>
          `
        );

      case 'equipment-moderation':
        return baseTemplate.replace(
          '{{CONTENT}}',
          `
          <h2 style="color: ${data.isApproved ? '#10b981' : '#f59e0b'};">Equipamento ${data.isApproved ? 'Aprovado' : 'Rejeitado'}</h2>
          <p>Olá ${data.userName},</p>
          <p>Seu equipamento <strong>"${data.equipmentName}"</strong> foi ${data.isApproved ? 'aprovado' : 'rejeitado'}.</p>
          ${data.isApproved 
            ? '<p>Parabéns! Seu equipamento está agora disponível para aluguel em nossa plataforma.</p>'
            : `<p>Infelizmente, seu equipamento não atendeu aos nossos critérios de qualidade.</p>
               ${data.reason ? `<p><strong>Motivo:</strong> ${data.reason}</p>` : ''}`
          }
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/my-equipment" style="background-color: #3569b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Meus Equipamentos</a>
          </div>
          `
        );

      default:
        return baseTemplate.replace(
          '{{CONTENT}}',
          `
          <h2 style="color: #3569b0;">${data.title}</h2>
          <p>Olá ${data.userName},</p>
          <p>${data.message}</p>
          `
        );
    }
  }

  private getBaseTemplate(): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>YMRentals</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #3569b0; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">YMRentals</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px;">Sua plataforma de aluguel de equipamentos</p>
      </div>
      
      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
        {{CONTENT}}
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666; text-align: center;">
          Este é um email automático, por favor não responda.<br>
          © ${new Date().getFullYear()} YMRentals. Todos os direitos reservados.<br>
          Luanda, Angola
        </p>
      </div>
    </body>
    </html>
    `;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  async sendReturnReminder(data: {
    to: string;
    renterName: string;
    equipmentName: string;
    returnDate: Date;
    ownerName: string;
    ownerEmail: string;
  }) {
    const { to, renterName, equipmentName, returnDate, ownerName, ownerEmail } = data;

    const subject = 'Lembrete de Devolução - YMRentals';
    const html = this.getBaseTemplate().replace(
      '{{CONTENT}}',
      `
      <h2 style="color: #f59e0b;">⏰ Lembrete de Devolução</h2>
      <p>Olá <strong>${renterName}</strong>,</p>

      <p>Este é um lembrete amigável de que você deve devolver o equipamento alugado:</p>

      <div style="background-color: white; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <h3 style="margin: 0; color: #f59e0b;">${equipmentName}</h3>
        <p style="margin: 5px 0;"><strong>Data de devolução:</strong> ${returnDate.toLocaleDateString('pt-BR')}</p>
        <p style="margin: 5px 0;"><strong>Proprietário:</strong> ${ownerName}</p>
        <p style="margin: 5px 0;"><strong>Contato:</strong> ${ownerEmail}</p>
      </div>

      <p>Por favor, certifique-se de devolver o equipamento na data acordada para evitar taxas adicionais.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-rentals"
           style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Ver Meus Aluguéis
        </a>
      </div>
      `
    );

    return this.sendEmail(to, subject, html);
  }

  async sendOverdueNotification(data: {
    renter: { email: string; name: string };
    owner: { email: string; name: string };
    equipmentName: string;
    returnDate: Date;
    daysOverdue: number;
  }) {
    const { renter, owner, equipmentName, returnDate, daysOverdue } = data;

    // Email para o locatário
    const renterSubject = 'URGENTE: Equipamento em Atraso - YMRentals';
    const renterHtml = this.getBaseTemplate().replace(
      '{{CONTENT}}',
      `
      <h2 style="color: #dc2626;">⚠️ Equipamento em Atraso</h2>
      <p>Olá <strong>${renter.name}</strong>,</p>

      <p style="color: #dc2626; font-weight: bold;">Seu equipamento alugado está em atraso!</p>

      <div style="background-color: white; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
        <h3 style="margin: 0; color: #dc2626;">${equipmentName}</h3>
        <p style="margin: 5px 0;"><strong>Data de devolução:</strong> ${returnDate.toLocaleDateString('pt-BR')}</p>
        <p style="margin: 5px 0;"><strong>Dias em atraso:</strong> ${daysOverdue} dias</p>
        <p style="margin: 5px 0;"><strong>Proprietário:</strong> ${owner.name}</p>
      </div>

      <p>Por favor, entre em contato com o proprietário imediatamente para resolver esta situação.</p>

      <p style="color: #dc2626; font-weight: bold;">
        Atrasos podem resultar em taxas adicionais e afetar sua reputação na plataforma.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="mailto:${owner.email}"
           style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Contatar Proprietário
        </a>
      </div>
      `
    );

    // Email para o proprietário
    const ownerSubject = 'Equipamento em Atraso - YMRentals';
    const ownerHtml = this.getBaseTemplate().replace(
      '{{CONTENT}}',
      `
      <h2 style="color: #f59e0b;">⚠️ Equipamento em Atraso</h2>
      <p>Olá <strong>${owner.name}</strong>,</p>

      <p>Informamos que seu equipamento não foi devolvido na data prevista:</p>

      <div style="background-color: white; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <h3 style="margin: 0; color: #f59e0b;">${equipmentName}</h3>
        <p style="margin: 5px 0;"><strong>Data de devolução:</strong> ${returnDate.toLocaleDateString('pt-BR')}</p>
        <p style="margin: 5px 0;"><strong>Dias em atraso:</strong> ${daysOverdue} dias</p>
        <p style="margin: 5px 0;"><strong>Locatário:</strong> ${renter.name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${renter.email}</p>
      </div>

      <p>Recomendamos que entre em contato com o locatário para resolver a situação.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="mailto:${renter.email}"
           style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
          Contatar Locatário
        </a>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-rentals"
           style="background-color: #3569b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Ver Aluguéis
        </a>
      </div>
      `
    );

    try {
      await Promise.all([
        this.sendEmail(renter.email, renterSubject, renterHtml),
        this.sendEmail(owner.email, ownerSubject, ownerHtml)
      ]);
      this.logger.log(`Notificações de atraso enviadas para ${renter.email} e ${owner.email}`);
    } catch (error) {
      this.logger.error('Erro ao enviar notificações de atraso:', error);
      throw error;
    }
  }

  async sendRentalCancellationNotification(data: {
    to: string;
    renterName: string;
    equipmentName: string;
    ownerName: string;
    reason: string;
  }) {
    const { to, renterName, equipmentName, ownerName, reason } = data;

    const subject = `Pedido de Aluguel Cancelado - ${equipmentName}`;

    const html = this.getEmailTemplate(
      'Pedido de Aluguel Cancelado',
      `
      <div style="margin-bottom: 20px;">
        <p>Olá,</p>
        <p>Informamos que o pedido de aluguel foi cancelado:</p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #dc3545; margin-top: 0;">📋 Detalhes do Cancelamento</h3>
        <p><strong>Equipamento:</strong> ${equipmentName}</p>
        <p><strong>Locatário:</strong> ${renterName}</p>
        <p><strong>Locador:</strong> ${ownerName}</p>
        <p><strong>Motivo:</strong> ${reason}</p>
        <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-AO')}</p>
      </div>

      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <p style="margin: 0; color: #856404;">
          <strong>ℹ️ Informação:</strong> O equipamento está novamente disponível para novas solicitações.
        </p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL}/my-rentals"
           style="background-color: #3569b0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Ver Meus Aluguéis
        </a>
      </div>
      `
    );

    try {
      await this.sendEmail(to, subject, html);
      this.logger.log(`Notificação de cancelamento enviada para ${to}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar notificação de cancelamento para ${to}:`, error);
      throw error;
    }
  }
}
