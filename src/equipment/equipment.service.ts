import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { LocationSearchDto } from './dto/location-search.dto';

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  private getOrderBy(sortBy?: string) {
    switch (sortBy) {
      case 'price_asc':
        return { price: 'asc' as const };
      case 'price_desc':
        return { price: 'desc' as const };
      case 'name_asc':
        return { name: 'asc' as const };
      case 'name_desc':
        return { name: 'desc' as const };
      case 'newest':
        return { createdAt: 'desc' as const };
      default:
        return { createdAt: 'desc' as const }; // relevance/default
    }
  }

  async create(createEquipmentDto: CreateEquipmentDto) {
    const {
      name,
      description,
      category,
      brand,
      model,
      price,
      pricePeriod,
      salePrice,
      images,
      videos,
      isAvailable,
      ownerId,
      specifications,
      addressId,
    } = createEquipmentDto;

    // Verificar se o usuário é um locador aprovado
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId }
    });

    if (!owner) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se o usuário é um locador (apenas locadores podem criar equipamentos)
    if (owner.userType !== 'LANDLORD') {
      throw new ForbiddenException('Apenas locadores podem criar equipamentos. Locatários não podem criar anúncios.');
    }

    if (owner.userType === 'LANDLORD' && owner.accountStatus !== 'APPROVED') {
      throw new ForbiddenException('Apenas locadores aprovados podem criar equipamentos');
    }

    return this.prisma.equipment.create({
      data: {
        name,
        description,
        category,
        brand,
        model,
        price,
        pricePeriod,
        salePrice,
        images,
        videos,
        isAvailable: false, // Não disponível até aprovação
        ownerId,
        specifications,
        addressId,
        moderationStatus: 'PENDING', // Equipamento criado como pendente
      },
    });
  }
  

  async findAll(filters?: {
    category?: string;
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    page?: number;
    limit?: number;
    showAll?: boolean; // Para moderadores/admins verem todos
    sortBy?: string; // Ordenação
    brands?: string[]; // Filtro por marcas múltiplas
  }) {
    const where: any = {
      deletedAt: null,
      // Mostrar apenas equipamentos aprovados para usuários comuns
      moderationStatus: filters?.showAll ? undefined : 'APPROVED'
    };

    if (filters?.category) {
      // Verificar se é um UUID (categoryId) ou string (category name)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.category);

      if (isUUID) {
        where.categoryId = filters.category;
      } else {
        where.category = { contains: filters.category, mode: 'insensitive' };
      }
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.minPrice || filters?.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }

    // Filtro por marcas múltiplas
    if (filters?.brands && filters.brands.length > 0) {
      where.brand = {
        in: filters.brands
      };
    }

    const skip = filters?.page && filters?.limit ? (filters.page - 1) * filters.limit : 0;
    const take = filters?.limit || undefined;

    const [equipment, total] = await Promise.all([
      this.prisma.equipment.findMany({
        where,
        skip,
        take,
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              profilePicture: true,
              isEmailVerified: true,
              isPhoneVerified: true,
            },
          },
          Address: true,
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: this.getOrderBy(filters?.sortBy),
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return {
      data: equipment,
      total,
      page: filters?.page || 1,
      limit: filters?.limit || total,
      totalPages: filters?.limit ? Math.ceil(total / filters.limit) : 1,
    };
  }

  async findNearby(filters: LocationSearchDto) {
    const { latitude, longitude, radius = 10, page = 1, limit = 10, ...otherFilters } = filters;

    if (!latitude || !longitude) {
      // Se não há coordenadas, retornar busca normal
      return this.findAll({ page, limit, ...otherFilters });
    }

    // Construir filtros base
    const where: any = {
      deletedAt: null,
      moderationStatus: 'APPROVED',
      Address: {
        latitude: { not: null },
        longitude: { not: null },
      },
    };

    // Aplicar outros filtros
    if (otherFilters.category) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(otherFilters.category);
      if (isUUID) {
        where.categoryId = otherFilters.category;
      } else {
        where.category = { contains: otherFilters.category, mode: 'insensitive' };
      }
    }

    if (otherFilters.search) {
      where.OR = [
        { name: { contains: otherFilters.search, mode: 'insensitive' } },
        { description: { contains: otherFilters.search, mode: 'insensitive' } },
      ];
    }

    if (otherFilters.minPrice || otherFilters.maxPrice) {
      where.price = {};
      if (otherFilters.minPrice) where.price.gte = otherFilters.minPrice;
      if (otherFilters.maxPrice) where.price.lte = otherFilters.maxPrice;
    }

    // Filtro por marcas múltiplas
    if (otherFilters.brands && otherFilters.brands.length > 0) {
      where.brand = {
        in: otherFilters.brands
      };
    }

    const skip = (page - 1) * limit;

    // Buscar equipamentos com endereços
    const equipment = await this.prisma.equipment.findMany({
      where,
      skip,
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true,
            isEmailVerified: true,
            isPhoneVerified: true,
          },
        },
        Address: true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular distâncias e filtrar por raio
    const equipmentWithDistance = equipment
      .map(item => {
        if (!item.Address?.latitude || !item.Address?.longitude) {
          return null;
        }

        const distance = this.calculateDistance(
          latitude,
          longitude,
          item.Address.latitude,
          item.Address.longitude
        );

        return {
          ...item,
          distance: Math.round(distance * 100) / 100, // Arredondar para 2 casas decimais
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.distance <= radius)
      .sort((a, b) => a.distance - b.distance); // Ordenar por distância

    const total = equipmentWithDistance.length;

    return {
      data: equipmentWithDistance,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      searchCenter: { latitude, longitude },
      searchRadius: radius,
    };
  }

  /**
   * Calcula a distância entre duas coordenadas usando a fórmula Haversine
   * @param lat1 Latitude do ponto 1
   * @param lon1 Longitude do ponto 1
   * @param lat2 Latitude do ponto 2
   * @param lon2 Longitude do ponto 2
   * @returns Distância em quilômetros
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em quilômetros
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * Converte graus para radianos
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id, deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            profilePicture: true,
            isEmailVerified: true,
            isPhoneVerified: true,
            userType: true,
          },
        },
        Address: true,
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });
    if (!equipment) throw new NotFoundException('Equipment not found');
    return equipment;
  }

  async update(id: string, updateEquipmentDto: UpdateEquipmentDto, userId: string) {
    const equipment = await this.findOne(id);

    // Verificar se o usuário é o dono do equipamento
    if (equipment.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own equipment');
    }

    return this.prisma.equipment.update({
      where: { id },
      data: updateEquipmentDto,
    });
  }

  async updateAvailability(id: string, isAvailable: boolean, userId: string) {
    const equipment = await this.findOne(id);

    // Verificar se o usuário é o dono do equipamento
    if (equipment.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own equipment');
    }

    return this.prisma.equipment.update({
      where: { id: equipment.id },
      data: { isAvailable },
    });
  }

  async findByOwner(ownerId: string) {
    return this.prisma.equipment.findMany({
      where: { ownerId, deletedAt: null },
      include: {
        Address: true,
        reviews: {
          select: {
            rating: true,
          },
        },
        rentals: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
          },
          where: {
            // Incluir apenas aluguéis ativos ou em processo
            status: {
              in: ['PENDING', 'APPROVED', 'PAID', 'ACTIVE']
            },
            // E que não expiraram
            endDate: {
              gte: new Date()
            }
          }
        },
        _count: {
          select: {
            rentals: true,
          },
        },
        edits: {
          where: {
            status: 'PENDING'
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCategories() {
    const categories = await this.prisma.equipment.findMany({
      where: { deletedAt: null },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map(c => c.category).filter(Boolean);
  }

  async getUniqueBrands() {
    const brands = await this.prisma.equipment.findMany({
      where: {
        deletedAt: null,
        moderationStatus: 'APPROVED',
        brand: { not: null }
      },
      select: { brand: true },
      distinct: ['brand'],
    });

    return brands.map(b => b.brand).filter(Boolean).sort();
  }

  async softDelete(id: string, userId: string) {
    const equipment = await this.findOne(id);

    // Verificar se o usuário é o dono do equipamento
    if (equipment.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own equipment');
    }

    return this.prisma.equipment.update({
      where: { id: equipment.id },
      data: { deletedAt: new Date() },
    });
  }
}
