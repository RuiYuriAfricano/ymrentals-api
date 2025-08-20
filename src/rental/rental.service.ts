import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletTransactionType } from '../wallet/dto/wallet-transaction.dto';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';

@Injectable()
export class RentalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService
  ) {}

  async create(createRentalDto: CreateRentalDto & { renterId: string }) {
    console.log('Creating rental with data:', createRentalDto);

    // Verificar se o equipamento existe e está disponível
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: createRentalDto.equipmentId, deletedAt: null },
      include: { owner: true }
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    if (!equipment.isAvailable) {
      throw new BadRequestException('Equipment is not available');
    }

    // Verificar se o usuário não está tentando alugar seu próprio equipamento
    if (equipment.ownerId === createRentalDto.renterId) {
      throw new BadRequestException('You cannot rent your own equipment');
    }

    // Verificar se o usuário que está tentando alugar é um locatário
    const renter = await this.prisma.user.findUnique({
      where: { id: createRentalDto.renterId }
    });

    if (!renter) {
      throw new NotFoundException('Renter not found');
    }

    if (renter.userType === 'LANDLORD') {
      throw new BadRequestException('Landlords cannot rent equipment. Only tenants can rent equipment.');
    }

    // Validar datas
    const startDate = new Date(createRentalDto.startDate);
    const endDate = new Date(createRentalDto.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calcular dias de aluguel
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Verificar limite máximo de dias se especificado
    if (createRentalDto.maxRentalDays && days > createRentalDto.maxRentalDays) {
      throw new BadRequestException(`Rental period cannot exceed ${createRentalDto.maxRentalDays} days`);
    }

    // Calcular valor total baseado no período de precário
    let totalAmount = createRentalDto.totalAmount;
    const dailyRate = createRentalDto.dailyRate || equipment.price || 0;

    if (!createRentalDto.totalAmount) {
      switch (createRentalDto.pricePeriod || equipment.pricePeriod) {
        case 'HOURLY':
          // Para cálculo por hora, assumir 8 horas por dia
          totalAmount = dailyRate * days * 8;
          break;
        case 'WEEKLY':
          const weeks = Math.ceil(days / 7);
          totalAmount = dailyRate * weeks;
          break;
        case 'MONTHLY':
          const months = Math.ceil(days / 30);
          totalAmount = dailyRate * months;
          break;
        default: // DAILY
          totalAmount = dailyRate * days;
          break;
      }
    }

    // Calcular data de lembrete de devolução (1 dia antes)
    const returnReminderDate = new Date(endDate);
    returnReminderDate.setDate(returnReminderDate.getDate() - 1);

    const rental = await this.prisma.rental.create({
      data: {
        equipmentId: createRentalDto.equipmentId,
        renterId: createRentalDto.renterId,
        ownerId: equipment.ownerId,
        startDate: new Date(createRentalDto.startDate),
        endDate: new Date(createRentalDto.endDate),
        startTime: createRentalDto.startTime,
        endTime: createRentalDto.endTime,
        totalAmount,
        dailyRate,
        maxRentalDays: createRentalDto.maxRentalDays,
        paymentMethod: createRentalDto.paymentMethod as any,
        paymentReference: createRentalDto.paymentReference,
        returnReminderDate,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentReceiptStatus: createRentalDto.paymentMethod === 'RECEIPT' ? 'PENDING' : undefined,
        pricePeriod: createRentalDto.pricePeriod as any || equipment.pricePeriod as any,
        // Localização do locatário
        renterLatitude: createRentalDto.renterLatitude,
        renterLongitude: createRentalDto.renterLongitude,
        renterAddress: createRentalDto.renterAddress,
        // Sistema de prioridade
        hasPriority: createRentalDto.hasPriority || false,
        priorityAmount: createRentalDto.priorityAmount,
        priorityPaidAt: createRentalDto.hasPriority ? new Date() : undefined
      },
      include: {
        equipment: {
          include: {
            owner: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true
              }
            }
          }
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true
          }
        }
      }
    });

    // Não marcar equipamento como indisponível ainda
    // O equipamento só ficará indisponível quando a solicitação for aprovada

    // Processar taxa de prioridade se solicitada
    if (createRentalDto.hasPriority && createRentalDto.priorityAmount) {
      try {
        const wallet = await this.walletService.getWalletByUserId(createRentalDto.renterId);
        if (wallet.balance >= createRentalDto.priorityAmount) {
          await this.walletService.createTransaction({
            walletId: wallet.id,
            type: WalletTransactionType.PRIORITY_FEE,
            amount: -createRentalDto.priorityAmount,
            description: `Taxa de prioridade - Aluguel ${equipment.name}`,
            status: 'COMPLETED' as any,
            metadata: {
              rentalId: rental.id,
              equipmentId: equipment.id
            }
          });
        } else {
          // Se não tem saldo suficiente, remover prioridade
          await this.prisma.rental.update({
            where: { id: rental.id },
            data: {
              hasPriority: false,
              priorityAmount: null,
              priorityPaidAt: null
            }
          });
        }
      } catch (error) {
        console.error('Erro ao processar taxa de prioridade:', error);
        // Continuar sem prioridade se houver erro
        await this.prisma.rental.update({
          where: { id: rental.id },
          data: {
            hasPriority: false,
            priorityAmount: null,
            priorityPaidAt: null
          }
        });
      }
    }

    return rental;
  }

  async findAll(filters?: {
    status?: string;
    userId?: string;
    equipmentId?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = { deletedAt: null };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.userId) {
      where.OR = [
        { renterId: filters.userId },
        { ownerId: filters.userId }
      ];
    }

    if (filters?.equipmentId) {
      where.equipmentId = filters.equipmentId;
    }

    const skip = filters?.page && filters?.limit ? (filters.page - 1) * filters.limit : 0;
    const take = filters?.limit || undefined;

    const [rentals, total] = await Promise.all([
      this.prisma.rental.findMany({
        where,
        skip,
        take,
        include: {
          equipment: {
            include: {
              owner: {
                select: {
                  id: true,
                  fullName: true,
                  profilePicture: true
                }
              }
            }
          },
          renter: {
            select: {
              id: true,
              fullName: true,
              profilePicture: true
            }
          }
        },
        orderBy: [
          { hasPriority: 'desc' }, // Prioridade primeiro
          { priorityPaidAt: 'desc' }, // Depois por data de pagamento da prioridade
          { createdAt: 'desc' } // Por último, por data de criação
        ]
      }),
      this.prisma.rental.count({ where })
    ]);

    return {
      data: rentals,
      total,
      page: filters?.page || 1,
      limit: filters?.limit || total,
      totalPages: filters?.limit ? Math.ceil(total / filters.limit) : 1
    };
  }

  async findOne(id: string, userId?: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id, deletedAt: null },
      include: {
        equipment: {
          include: {
            owner: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                profilePicture: true
              }
            }
          }
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            profilePicture: true
          }
        }
      }
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    // Verificar se o usuário tem permissão para ver este aluguel
    if (userId && rental.renterId !== userId && rental.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to view this rental');
    }

    return rental;
  }

  async update(id: string, updateRentalDto: UpdateRentalDto, userId: string) {
    const rental = await this.findOne(id, userId);

    // Verificar se o usuário tem permissão para atualizar
    if (rental.renterId !== userId && rental.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to update this rental');
    }

    return this.prisma.rental.update({
      where: { id: rental.id },
      data: updateRentalDto,
    });
  }

  async updateStatus(id: string, status: string, userId: string) {
    const rental = await this.findOne(id, userId);

    // Verificar permissões baseadas no status
    if (status === 'APPROVED' && rental.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can approve rentals');
    }

    if (status === 'CANCELLED' && rental.renterId !== userId && rental.ownerId !== userId) {
      throw new ForbiddenException('Only the renter or owner can cancel rentals');
    }

    const updatedRental = await this.prisma.rental.update({
      where: { id: rental.id },
      data: { status: status as any },
    });

    // Se aprovado, marcar equipamento como indisponível e rejeitar outras solicitações pendentes
    if (status === 'APPROVED') {
      // Marcar equipamento como indisponível
      await this.prisma.equipment.update({
        where: { id: rental.equipmentId },
        data: { isAvailable: false }
      });

      // Rejeitar automaticamente outras solicitações pendentes para o mesmo equipamento
      await this.prisma.rental.updateMany({
        where: {
          equipmentId: rental.equipmentId,
          status: 'PENDING',
          id: { not: rental.id } // Excluir a solicitação atual
        },
        data: { status: 'REJECTED' }
      });

      // Registrar data de aprovação para controle de expiração
      await this.prisma.rental.update({
        where: { id: rental.id },
        data: { approvedAt: new Date() }
      });
    }

    // Se cancelado ou rejeitado, verificar se deve liberar equipamento
    if (status === 'CANCELLED' || status === 'REJECTED') {
      // Verificar se há outras solicitações aprovadas para este equipamento
      const hasApprovedRentals = await this.prisma.rental.findFirst({
        where: {
          equipmentId: rental.equipmentId,
          status: { in: ['APPROVED', 'PAID', 'ACTIVE'] },
          endDate: { gte: new Date() }
        }
      });

      // Se não há outras solicitações aprovadas, liberar equipamento
      if (!hasApprovedRentals) {
        await this.prisma.equipment.update({
          where: { id: rental.equipmentId },
          data: { isAvailable: true }
        });
      }
    }

    return updatedRental;
  }

  async processPayment(id: string, paymentData: any, userId: string) {
    const rental = await this.findOne(id, userId);

    if (rental.renterId !== userId) {
      throw new ForbiddenException('Only the renter can process payment');
    }

    if (rental.status !== 'APPROVED') {
      throw new BadRequestException('Rental must be approved before payment');
    }

    // Aqui seria integrado com gateway de pagamento real
    // Por enquanto, simular pagamento bem-sucedido
    const paymentResult = {
      success: true,
      transactionId: `txn_${Date.now()}`,
      amount: rental.totalAmount,
      method: paymentData.method || 'credit_card'
    };

    return this.prisma.rental.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS' as any,
        // paymentStatus: 'COMPLETED', // Campo não existe no modelo atual
        // paymentMethod: paymentResult.method, // Campo não existe no modelo atual
        // transactionId: paymentResult.transactionId // Campo não existe no modelo atual
      }
    });
  }

  async getUserRentals(userId: string, type?: 'renter' | 'owner') {
    const where: any = { deletedAt: null };

    if (type === 'renter') {
      where.renterId = userId;
    } else if (type === 'owner') {
      where.ownerId = userId;
    } else {
      where.OR = [
        { renterId: userId },
        { ownerId: userId }
      ];
    }

    return this.prisma.rental.findMany({
      where,
      include: {
        equipment: {
          include: {
            owner: {
              select: {
                id: true,
                fullName: true,
                profilePicture: true
              }
            }
          }
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getRentalHistory(userId: string) {
    return this.prisma.rental.findMany({
      where: {
        OR: [
          { renterId: userId },
          { ownerId: userId }
        ],
        status: { in: ['COMPLETED', 'CANCELLED'] },
        deletedAt: null
      },
      include: {
        equipment: {
          include: {
            owner: {
              select: {
                id: true,
                fullName: true,
                profilePicture: true
              }
            }
          }
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async cancelRental(id: string, userId: string) {
    const rental = await this.findOne(id, userId);

    if (rental.renterId !== userId && rental.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this rental');
    }

    if (rental.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed rental');
    }

    const updatedRental = await this.prisma.rental.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        deletedAt: new Date()
      }
    });

    // Liberar equipamento
    await this.prisma.equipment.update({
      where: { id: rental.equipmentId },
      data: { isAvailable: true }
    });

    return updatedRental;
  }

  async uploadPaymentReceipt(id: string, receiptUrl: string, userId: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: { renter: true }
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    if (rental.renterId !== userId) {
      throw new ForbiddenException('You can only upload receipt for your own rentals');
    }

    if (rental.paymentMethod !== 'RECEIPT') {
      throw new BadRequestException('This rental does not use receipt payment method');
    }

    return this.prisma.rental.update({
      where: { id },
      data: {
        paymentReceipt: receiptUrl,
        paymentReceiptStatus: 'PENDING'
      },
      include: {
        equipment: true,
        renter: true,
        owner: true
      }
    });
  }

  async validatePaymentReceipt(id: string, isApproved: boolean, moderatorId: string, rejectionReason?: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id },
      include: { equipment: true, renter: true, owner: true }
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    if (rental.paymentReceiptStatus !== 'PENDING') {
      throw new BadRequestException('Payment receipt is not pending validation');
    }

    const updateData: any = {
      paymentReceiptStatus: isApproved ? 'APPROVED' : 'REJECTED',
      moderatedBy: moderatorId,
      moderatedAt: new Date()
    };

    if (isApproved) {
      updateData.paymentStatus = 'PAID';
      updateData.status = 'PAID';
    } else if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    return this.prisma.rental.update({
      where: { id },
      data: updateData,
      include: {
        equipment: true,
        renter: true,
        owner: true,
        moderator: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });
  }

  async getPendingPaymentReceipts() {
    return this.prisma.rental.findMany({
      where: {
        paymentReceiptStatus: 'PENDING',
        paymentReceipt: { not: null },
        deletedAt: null
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            images: true
          }
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profilePicture: true
          }
        },
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async sendReturnReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rentalsToRemind = await this.prisma.rental.findMany({
      where: {
        returnReminderDate: {
          lte: today
        },
        returnNotificationSent: false,
        status: { in: ['ACTIVE', 'PAID'] },
        deletedAt: null
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true
          }
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // Marcar como notificado
    if (rentalsToRemind.length > 0) {
      await this.prisma.rental.updateMany({
        where: {
          id: { in: rentalsToRemind.map(r => r.id) }
        },
        data: {
          returnNotificationSent: true
        }
      });
    }

    return rentalsToRemind;
  }

  // Pagamento com carteira digital
  async payWithWallet(rentalId: string, userId: string) {
    const rental = await this.prisma.rental.findUnique({
      where: { id: rentalId },
      include: {
        equipment: true,
        renter: true
      }
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    if (rental.renterId !== userId) {
      throw new ForbiddenException('You can only pay for your own rentals');
    }

    if (rental.paymentStatus === 'PAID') {
      throw new BadRequestException('Rental already paid');
    }

    // Verificar saldo da carteira
    const wallet = await this.walletService.getWalletByUserId(userId);
    if (wallet.balance < rental.totalAmount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Processar pagamento
    await this.walletService.createTransaction({
      walletId: wallet.id,
      type: WalletTransactionType.PAYMENT,
      amount: -rental.totalAmount,
      description: `Pagamento de aluguel - ${rental.equipment.name}`,
      status: 'COMPLETED' as any,
      metadata: {
        rentalId: rental.id,
        equipmentId: rental.equipmentId,
        ownerId: rental.ownerId
      }
    });

    // Atualizar status do pagamento
    const updatedRental = await this.prisma.rental.update({
      where: { id: rentalId },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'WALLET' as any,
        status: 'PAID'
      },
      include: {
        equipment: true,
        renter: true,
        owner: true
      }
    });

    return updatedRental;
  }

  async cancelExpiredApprovedRentals() {
    // Obter timeout das variáveis de ambiente (padrão: 24 horas)
    const timeoutHours = parseInt(process.env.RENTAL_PAYMENT_TIMEOUT_HOURS || '24');

    // Calcular data limite (agora - timeout)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() - timeoutHours);

    // Buscar rentals aprovados que expiraram
    const expiredRentals = await this.prisma.rental.findMany({
      where: {
        status: 'APPROVED',
        paymentStatus: 'PENDING',
        approvedAt: {
          lte: expirationDate, // Aprovados há mais tempo que o timeout
        },
      },
      include: {
        equipment: true,
        renter: true,
        owner: true,
      },
    });

    const cancelledRentals: any[] = [];

    for (const rental of expiredRentals) {
      try {
        // Cancelar o rental
        await this.prisma.rental.update({
          where: { id: rental.id },
          data: { status: 'CANCELLED' },
        });

        // Verificar se há outras solicitações aprovadas para este equipamento
        const hasOtherApprovedRentals = await this.prisma.rental.findFirst({
          where: {
            equipmentId: rental.equipmentId,
            status: { in: ['APPROVED', 'PAID', 'ACTIVE'] },
            endDate: { gte: new Date() },
            id: { not: rental.id }
          }
        });

        // Se não há outras solicitações aprovadas, liberar equipamento
        if (!hasOtherApprovedRentals) {
          await this.prisma.equipment.update({
            where: { id: rental.equipmentId },
            data: { isAvailable: true }
          });
        }

        cancelledRentals.push(rental);
      } catch (error) {
        console.error(`Erro ao cancelar rental expirado ${rental.id}:`, error);
      }
    }

    return cancelledRentals;
  }
}
