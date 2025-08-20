import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RentalService } from './rental.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class RentalCronService {
  private readonly logger = new Logger(RentalCronService.name);

  constructor(
    private readonly rentalService: RentalService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReturnReminders() {
    this.logger.log('Iniciando envio de lembretes de devolução...');

    try {
      const rentalsToRemind = await this.rentalService.sendReturnReminders();

      for (const rental of rentalsToRemind) {
        // Enviar email
        await this.emailService.sendReturnReminder({
          to: rental.renter.email,
          renterName: rental.renter.fullName,
          equipmentName: rental.equipment.name,
          returnDate: new Date(rental.endDate),
          ownerName: rental.owner.fullName,
          ownerEmail: rental.owner.email
        });

        this.logger.log(`Lembrete enviado para ${rental.renter.email} sobre equipamento ${rental.equipment.name}`);
      }

      this.logger.log(`Enviados ${rentalsToRemind.length} lembretes de devolução`);
    } catch (error) {
      this.logger.error('Erro ao enviar lembretes de devolução:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cancelExpiredApprovedRentals() {
    this.logger.log('Verificando pedidos aprovados expirados...');

    try {
      const cancelledRentals = await this.rentalService.cancelExpiredApprovedRentals();

      for (const rental of cancelledRentals) {
        // Enviar notificação por email para o locatário
        await this.emailService.sendRentalCancellationNotification({
          to: rental.renter.email,
          renterName: rental.renter.fullName,
          equipmentName: rental.equipment.name,
          ownerName: rental.owner.fullName,
          reason: 'Tempo limite para pagamento expirado'
        });

        // Enviar notificação para o locador
        await this.emailService.sendRentalCancellationNotification({
          to: rental.owner.email,
          renterName: rental.renter.fullName,
          equipmentName: rental.equipment.name,
          ownerName: rental.owner.fullName,
          reason: 'Locatário não efetuou pagamento no prazo'
        });

        this.logger.log(`Rental expirado cancelado: ${rental.id} - Equipamento: ${rental.equipment.name}`);
      }

      if (cancelledRentals.length > 0) {
        this.logger.log(`Cancelados ${cancelledRentals.length} pedidos expirados`);
      } else {
        this.logger.log('Nenhum pedido expirado encontrado');
      }
    } catch (error) {
      this.logger.error('Erro ao cancelar pedidos expirados:', error);
    }
  }
}
