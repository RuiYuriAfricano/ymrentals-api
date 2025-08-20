import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WalletTransactionType } from '../wallet/dto/wallet-transaction.dto';

export interface CreateSponsorshipDto {
  targetUserId?: string;
  equipmentId?: string;
  amount: number;
  duration: number; // em dias
}

export interface SponsorshipFilters {
  sponsorId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class SponsorshipService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService
  ) {}

  async createSponsorship(sponsorId: string, createSponsorshipDto: CreateSponsorshipDto) {
    const { targetUserId, equipmentId, amount, duration } = createSponsorshipDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    if (duration <= 0) {
      throw new BadRequestException('Duration must be positive');
    }

    // Verificar se já existe um patrocínio ativo para este sponsor
    const now = new Date();
    const existingSponsorship = await this.prisma.adSponsorship.findFirst({
      where: {
        sponsorId,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now }
      }
    });

    if (existingSponsorship) {
      throw new BadRequestException(
        'Você já possui um patrocínio ativo. Aguarde a expiração ou cancele o atual para criar um novo.'
      );
    }

    // Verificar se o usuário tem saldo suficiente na carteira
    const wallet = await this.walletService.getWalletByUserId(sponsorId);
    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Verificar se o equipamento existe (se especificado)
    if (equipmentId) {
      const equipment = await this.prisma.equipment.findUnique({
        where: { id: equipmentId, ownerId: sponsorId, deletedAt: null }
      });
      if (!equipment) {
        throw new NotFoundException('Equipment not found or not owned by user');
      }
    }

    // Verificar se o usuário alvo existe (se especificado)
    if (targetUserId) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: targetUserId }
      });
      if (!targetUser) {
        throw new NotFoundException('Target user not found');
      }
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + duration);

    // Criar patrocínio
    const sponsorship = await this.prisma.adSponsorship.create({
      data: {
        sponsorId,
        targetUserId,
        equipmentId,
        amount,
        duration,
        startDate,
        endDate,
        status: 'ACTIVE'
      },
      include: {
        sponsor: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true
          }
        },
        targetUser: targetUserId ? {
          select: {
            id: true,
            fullName: true,
            profilePicture: true
          }
        } : undefined,
        equipment: equipmentId ? {
          select: {
            id: true,
            name: true,
            images: true
          }
        } : undefined
      }
    });

    // Debitar da carteira
    await this.walletService.createTransaction({
      walletId: wallet.id,
      type: WalletTransactionType.PROMOTION_FEE,
      amount: -amount, // Valor negativo para débito
      description: `Patrocínio de anúncio - ${duration} dias`,
      status: 'COMPLETED' as any,
      metadata: {
        sponsorshipId: sponsorship.id,
        targetUserId,
        equipmentId,
        duration
      }
    });

    return sponsorship;
  }

  async findAll(filters: SponsorshipFilters = {}) {
    const where: any = {};

    if (filters.sponsorId) {
      where.sponsorId = filters.sponsorId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const skip = filters.page && filters.limit ? (filters.page - 1) * filters.limit : 0;
    const take = filters.limit || undefined;

    const [sponsorships, total] = await Promise.all([
      this.prisma.adSponsorship.findMany({
        where,
        skip,
        take,
        include: {
          sponsor: {
            select: {
              id: true,
              fullName: true,
              profilePicture: true
            }
          },
          targetUser: {
            select: {
              id: true,
              fullName: true,
              profilePicture: true
            }
          },
          equipment: {
            select: {
              id: true,
              name: true,
              images: true,
              category: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.adSponsorship.count({ where })
    ]);

    return {
      data: sponsorships,
      total,
      page: filters.page || 1,
      limit: filters.limit || total,
      totalPages: filters.limit ? Math.ceil(total / filters.limit) : 1
    };
  }

  async findOne(id: string) {
    const sponsorship = await this.prisma.adSponsorship.findUnique({
      where: { id },
      include: {
        sponsor: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true
          }
        },
        targetUser: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true
          }
        },
        equipment: {
          select: {
            id: true,
            name: true,
            images: true,
            category: true
          }
        }
      }
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    return sponsorship;
  }

  async updateStatus(id: string, status: string, userId: string) {
    const sponsorship = await this.prisma.adSponsorship.findUnique({
      where: { id }
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    if (sponsorship.sponsorId !== userId) {
      throw new BadRequestException('You can only update your own sponsorships');
    }

    return this.prisma.adSponsorship.update({
      where: { id },
      data: { status: status as any }
    });
  }

  async incrementImpression(id: string) {
    return this.prisma.adSponsorship.update({
      where: { id },
      data: {
        impressions: {
          increment: 1
        }
      }
    });
  }

  async incrementClick(id: string) {
    return this.prisma.adSponsorship.update({
      where: { id },
      data: {
        clicks: {
          increment: 1
        }
      }
    });
  }

  // Buscar anúncios patrocinados para um usuário específico
  async getSponsoredAdsForUser(userId: string) {
    const now = new Date();

    // Buscar patrocínios ativos
    const activeSponsorships = await this.prisma.adSponsorship.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        sponsor: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true
          }
        }
      },
      orderBy: [
        { amount: 'desc' }, // Maior valor pago primeiro
        { createdAt: 'desc' }
      ]
    });

    // Para cada patrocínio, buscar os equipamentos do sponsor
    const sponsoredAds: any[] = [];

    for (const sponsorship of activeSponsorships) {
      if (sponsorship.equipmentId) {
        // Se tem equipamento específico, buscar apenas esse
        const equipment = await this.prisma.equipment.findUnique({
          where: {
            id: sponsorship.equipmentId,
            deletedAt: null,
            isAvailable: true
          },
          select: {
            id: true,
            name: true,
            images: true,
            category: true,
            price: true,
            pricePeriod: true
          }
        });

        if (equipment) {
          sponsoredAds.push({
            ...sponsorship,
            equipment
          });
        }
      } else {
        // Se não tem equipamento específico, buscar todos os equipamentos do sponsor
        const equipments = await this.prisma.equipment.findMany({
          where: {
            ownerId: sponsorship.sponsorId,
            deletedAt: null,
            isAvailable: true
          },
          select: {
            id: true,
            name: true,
            images: true,
            category: true,
            price: true,
            pricePeriod: true
          },
          take: 3 // Máximo 3 equipamentos por patrocínio
        });

        // Adicionar cada equipamento como um anúncio patrocinado separado
        for (const equipment of equipments) {
          sponsoredAds.push({
            ...sponsorship,
            equipment
          });
        }
      }
    }

    return sponsoredAds.slice(0, 5); // Máximo 5 anúncios patrocinados no total
  }

  // Expirar patrocínios automaticamente
  async expireOldSponsorships() {
    const now = new Date();
    
    const expiredSponsorships = await this.prisma.adSponsorship.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    return expiredSponsorships;
  }

  // Buscar equipamentos patrocinados para mostrar nas listagens
  async getSponsoredEquipments(limit: number = 10) {
    const now = new Date();

    // Buscar patrocínios ativos
    const activeSponsorships = await this.prisma.adSponsorship.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: [
        { amount: 'desc' }, // Maior valor pago primeiro
        { createdAt: 'desc' }
      ]
    });

    const sponsoredEquipmentIds = new Set<string>();

    for (const sponsorship of activeSponsorships) {
      if (sponsorship.equipmentId) {
        // Equipamento específico
        sponsoredEquipmentIds.add(sponsorship.equipmentId);
      } else {
        // Todos os equipamentos do sponsor
        const equipments = await this.prisma.equipment.findMany({
          where: {
            ownerId: sponsorship.sponsorId,
            deletedAt: null,
            isAvailable: true
          },
          select: { id: true },
          take: 5 // Máximo 5 equipamentos por patrocínio geral
        });

        equipments.forEach(eq => sponsoredEquipmentIds.add(eq.id));
      }
    }

    // Buscar os equipamentos completos
    return this.prisma.equipment.findMany({
      where: {
        id: { in: Array.from(sponsoredEquipmentIds) },
        deletedAt: null,
        isAvailable: true
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true
          }
        },
        Address: true,
        reviews: {
          select: {
            rating: true
          }
        }
      },
      take: limit
    });
  }

  // Verificar se um equipamento está patrocinado
  async isEquipmentSponsored(equipmentId: string): Promise<boolean> {
    const now = new Date();

    // Primeiro, buscar o equipamento para obter o ownerId
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { ownerId: true }
    });

    if (!equipment) {
      return false;
    }

    // Verificar se há patrocínio ativo para este equipamento específico ou para todos os equipamentos do dono
    const sponsorship = await this.prisma.adSponsorship.findFirst({
      where: {
        OR: [
          { equipmentId }, // Patrocínio específico do equipamento
          {
            equipmentId: null, // Patrocínio geral
            sponsorId: equipment.ownerId // Do mesmo dono
          }
        ],
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now }
      }
    });

    return !!sponsorship;
  }

  // Estender patrocínio existente
  async extendSponsorship(sponsorId: string, sponsorshipId: string, additionalDays: number, additionalAmount: number) {
    if (additionalDays <= 0) {
      throw new BadRequestException('Additional days must be positive');
    }

    if (additionalAmount <= 0) {
      throw new BadRequestException('Additional amount must be positive');
    }

    // Verificar se o patrocínio existe e pertence ao usuário
    const sponsorship = await this.prisma.adSponsorship.findUnique({
      where: { id: sponsorshipId }
    });

    if (!sponsorship) {
      throw new NotFoundException('Sponsorship not found');
    }

    if (sponsorship.sponsorId !== sponsorId) {
      throw new BadRequestException('You can only extend your own sponsorships');
    }

    if (sponsorship.status !== 'ACTIVE') {
      throw new BadRequestException('Can only extend active sponsorships');
    }

    // Verificar saldo
    const wallet = await this.walletService.getWalletByUserId(sponsorId);
    if (wallet.balance < additionalAmount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Estender o patrocínio
    const newEndDate = new Date(sponsorship.endDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    const updatedSponsorship = await this.prisma.adSponsorship.update({
      where: { id: sponsorshipId },
      data: {
        endDate: newEndDate,
        duration: sponsorship.duration + additionalDays,
        amount: sponsorship.amount + additionalAmount
      }
    });

    // Debitar da carteira
    await this.walletService.createTransaction({
      walletId: wallet.id,
      type: WalletTransactionType.PROMOTION_FEE,
      amount: -additionalAmount,
      description: `Extensão de patrocínio - ${additionalDays} dias adicionais`,
      status: 'COMPLETED' as any,
      metadata: {
        sponsorshipId,
        additionalDays,
        originalEndDate: sponsorship.endDate,
        newEndDate
      }
    });

    return updatedSponsorship;
  }

  // Verificar se locador pode criar novo patrocínio
  async canCreateNewSponsorship(sponsorId: string): Promise<{canCreate: boolean, reason?: string, activeSponsorship?: any}> {
    const now = new Date();

    const activeSponsorship = await this.prisma.adSponsorship.findFirst({
      where: {
        sponsorId,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        sponsor: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    if (activeSponsorship) {
      return {
        canCreate: false,
        reason: 'Você já possui um patrocínio ativo',
        activeSponsorship
      };
    }

    return { canCreate: true };
  }
}
