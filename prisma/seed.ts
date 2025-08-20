import { PrismaClient, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed completo do banco de dados...');

  // Limpar dados existentes na ordem correta (respeitando foreign keys)
  await prisma.notifications.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.blockedUser.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.equipmentEdit.deleteMany(); // Excluir equipment_edits antes de equipment
  await prisma.equipment.deleteMany();
  await prisma.category.deleteMany();
  await prisma.content.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.user.deleteMany();
  await prisma.address.deleteMany();

  console.log('🗑️ Dados antigos removidos');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // ===== CRIAR USUÁRIOS =====

  // 👤 Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ymrentals.com',
      password: hashedPassword,
      fullName: 'Administrador Sistema',
      phoneNumber: '+244 923 000 001',
      dateOfBirth: new Date('1985-01-01'),
      userType: 'TENANT',
      role: 'ADMIN',
      accountStatus: 'APPROVED',
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  // 🛡️ Moderador
  const moderator = await prisma.user.create({
    data: {
      email: 'moderador@ymrentals.com',
      password: hashedPassword,
      fullName: 'João Moderador',
      phoneNumber: '+244 923 000 002',
      dateOfBirth: new Date('1990-05-15'),
      userType: 'TENANT',
      role: 'MODERATOR',
      accountStatus: 'APPROVED',
      isEmailVerified: true,
      isPhoneVerified: true,
      createdBy: admin.id,
    },
  });

  // 👨‍💼 Moderador Gerencial
  const moderatorManager = await prisma.user.create({
    data: {
      email: 'gestor@ymrentals.com',
      password: hashedPassword,
      fullName: 'Maria Gestora',
      phoneNumber: '+244 923 000 003',
      dateOfBirth: new Date('1988-03-20'),
      userType: 'TENANT',
      role: 'MODERATOR_MANAGER',
      accountStatus: 'APPROVED',
      isEmailVerified: true,
      isPhoneVerified: true,
      createdBy: admin.id,
    },
  });

  // 🏢 Locador Aprovado
  const landlordApproved = await prisma.user.create({
    data: {
      email: 'empresa@construcoes.ao',
      password: hashedPassword,
      fullName: 'António Silva',
      phoneNumber: '+244 923 111 001',
      dateOfBirth: new Date('1980-07-10'),
      userType: 'LANDLORD',
      role: 'USER',
      accountStatus: 'APPROVED',
      isCompany: true,
      companyName: 'Construções Silva Lda',
      companyType: 'COMPANY',
      companyAddress: 'Rua da Independência, 123, Luanda',
      nif: '541712345',
      companyDocuments: [
        'https://example.com/documents/alvara_construcoes_silva.pdf',
        'https://example.com/documents/certidao_comercial_silva.pdf',
        'https://example.com/documents/nif_silva.pdf'
      ],
      companyCoverImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&h=400',
      isEmailVerified: true,
      isPhoneVerified: true,
      approvedBy: admin.id,
      approvedAt: new Date(),
    },
  });

  // ⏳ Locador Pendente
  const landlordPending = await prisma.user.create({
    data: {
      email: 'carlos@equipamentos.ao',
      password: hashedPassword,
      fullName: 'Carlos Mendes',
      phoneNumber: '+244 923 111 002',
      dateOfBirth: new Date('1985-12-05'),
      userType: 'LANDLORD',
      role: 'USER',
      accountStatus: 'PENDING',
      isCompany: true,
      companyName: 'Equipamentos Mendes Lda',
      companyType: 'COMPANY',
      companyAddress: 'Avenida 4 de Fevereiro, 456, Luanda',
      nif: '541723456',
      companyDocuments: [
        'https://example.com/documents/alvara_equipamentos_mendes.pdf',
        'https://example.com/documents/certidao_comercial_mendes.pdf'
      ],
      isEmailVerified: true,
      isPhoneVerified: false,
    },
  });

  // ❌ Locador Rejeitado
  const landlordRejected = await prisma.user.create({
    data: {
      email: 'rejeitado@test.ao',
      password: hashedPassword,
      fullName: 'Pedro Rejeitado',
      phoneNumber: '+244 923 111 003',
      dateOfBirth: new Date('1990-08-15'),
      userType: 'LANDLORD',
      role: 'USER',
      accountStatus: 'REJECTED',
      isCompany: false,
      nif: '004567890LA042',
      companyDocuments: [
        'https://example.com/documents/documento_invalido_pedro.pdf'
      ],
      isEmailVerified: false,
      isPhoneVerified: false,
      rejectedBy: admin.id,
      rejectedAt: new Date(),
      rejectionReason: 'Documentos inválidos',
    },
  });

  // 👥 4 Locatários (com documentos BI)
  const tenant1 = await prisma.user.create({
    data: {
      email: 'locatario1@email.com',
      password: hashedPassword,
      fullName: 'Ana Costa',
      phoneNumber: '+244 923 222 001',
      dateOfBirth: new Date('1991-01-01'),
      userType: 'TENANT',
      role: 'USER',
      accountStatus: 'APPROVED',
      isEmailVerified: true,
      isPhoneVerified: true,
      biDocument: 'https://example.com/documents/bi_ana_costa.pdf',
      biValidated: true,
      biValidatedBy: admin.id,
      biValidatedAt: new Date(),
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      email: 'locatario2@email.com',
      password: hashedPassword,
      fullName: 'Bruno Santos',
      phoneNumber: '+244 923 222 002',
      dateOfBirth: new Date('1992-02-01'),
      userType: 'TENANT',
      role: 'USER',
      accountStatus: 'APPROVED',
      isEmailVerified: true,
      isPhoneVerified: true,
      biDocument: 'https://example.com/documents/bi_bruno_santos.pdf',
      biValidated: false, // Pendente de validação
    },
  });

  const tenant3 = await prisma.user.create({
    data: {
      email: 'locatario3@email.com',
      password: hashedPassword,
      fullName: 'Carla Ferreira',
      phoneNumber: '+244 923 222 003',
      dateOfBirth: new Date('1993-03-01'),
      userType: 'TENANT',
      role: 'USER',
      accountStatus: 'APPROVED',
      isEmailVerified: true,
      isPhoneVerified: true,
      biDocument: 'https://example.com/documents/bi_carla_ferreira.pdf',
      biValidated: false, // Rejeitado
      biRejectionReason: 'Documento ilegível, favor reenviar com melhor qualidade',
    },
  });

  const tenant4 = await prisma.user.create({
    data: {
      email: 'locatario4@email.com',
      password: hashedPassword,
      fullName: 'David Oliveira',
      phoneNumber: '+244 923 222 004',
      dateOfBirth: new Date('1994-04-01'),
      userType: 'TENANT',
      role: 'USER',
      accountStatus: 'APPROVED',
      isEmailVerified: true,
      isPhoneVerified: true,
      biDocument: 'https://example.com/documents/bi_david_oliveira.pdf',
      biValidated: true,
      biValidatedBy: moderator.id,
      biValidatedAt: new Date(),
    },
  });

  console.log('👥 Usuários criados');

  // ===== CRIAR CATEGORIAS =====
  const category1 = await prisma.category.create({
    data: {
      name: 'Escavadoras',
      description: 'Equipamentos para escavação e movimentação de terra',
      icon: '🚜',
      image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=400&h=300',
    },
  });

  const category2 = await prisma.category.create({
    data: {
      name: 'Guindastes',
      description: 'Equipamentos para elevação e movimentação de cargas',
      icon: '🏗️',
      image: 'https://images.unsplash.com/photo-1504307651254-35b0e6e6921f?auto=format&fit=crop&w=400&h=300',
    },
  });

  const category3 = await prisma.category.create({
    data: {
      name: 'Tratores',
      description: 'Equipamentos agrícolas e de construção',
      icon: '🚜',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&h=300',
    },
  });

  const category4 = await prisma.category.create({
    data: {
      name: 'Compactadores',
      description: 'Equipamentos para compactação de solo e asfalto',
      icon: '🛣️',
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&h=300',
    },
  });

  const category5 = await prisma.category.create({
    data: {
      name: 'Geradores',
      description: 'Equipamentos para geração de energia elétrica',
      icon: '⚡',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&h=300',
    },
  });

  const category6 = await prisma.category.create({
    data: {
      name: 'Ferramentas',
      description: 'Ferramentas manuais e elétricas para construção',
      icon: '🔧',
      image: 'https://images.unsplash.com/photo-1504307651254-35b0e6e6921f?auto=format&fit=crop&w=400&h=300',
    },
  });

  console.log('📂 6 Categorias criadas');

  // ===== CRIAR ENDEREÇOS DIVERSIFICADOS EM ANGOLA =====

  // LUANDA - Centro da cidade
  const address1 = await prisma.address.create({
    data: {
      street: 'Rua Amílcar Cabral, 123',
      district: 'Maianga',
      city: 'Luanda',
      province: 'Luanda',
      latitude: -8.8390,
      longitude: 13.2894,
    },
  });

  // LUANDA - Ingombota
  const address2 = await prisma.address.create({
    data: {
      street: 'Avenida 4 de Fevereiro, 456',
      district: 'Ingombota',
      city: 'Luanda',
      province: 'Luanda',
      latitude: -8.8167,
      longitude: 13.2333,
    },
  });

  // LUANDA - Talatona
  const address3 = await prisma.address.create({
    data: {
      street: 'Estrada de Catete, Km 15',
      district: 'Talatona',
      city: 'Luanda',
      province: 'Luanda',
      latitude: -8.9167,
      longitude: 13.1833,
    },
  });

  // LUANDA - Viana
  const address4 = await prisma.address.create({
    data: {
      street: 'Rua Principal de Viana, 789',
      district: 'Viana',
      city: 'Viana',
      province: 'Luanda',
      latitude: -8.8833,
      longitude: 13.3667,
    },
  });

  // BENGUELA - Centro
  const address5 = await prisma.address.create({
    data: {
      street: 'Avenida Norton de Matos, 234',
      district: 'Centro',
      city: 'Benguela',
      province: 'Benguela',
      latitude: -12.5763,
      longitude: 13.4055,
    },
  });

  // BENGUELA - Lobito
  const address6 = await prisma.address.create({
    data: {
      street: 'Rua do Porto, 567',
      district: 'Centro',
      city: 'Lobito',
      province: 'Benguela',
      latitude: -12.3644,
      longitude: 13.5370,
    },
  });

  // HUAMBO - Centro
  const address7 = await prisma.address.create({
    data: {
      street: 'Avenida da Independência, 890',
      district: 'Centro',
      city: 'Huambo',
      province: 'Huambo',
      latitude: -12.7756,
      longitude: 15.7392,
    },
  });

  // HUÍLA - Lubango
  const address8 = await prisma.address.create({
    data: {
      street: 'Rua Comandante Gika, 345',
      district: 'Centro',
      city: 'Lubango',
      province: 'Huíla',
      latitude: -14.9177,
      longitude: 13.4925,
    },
  });

  // NAMIBE - Centro
  const address9 = await prisma.address.create({
    data: {
      street: 'Avenida Marginal, 678',
      district: 'Centro',
      city: 'Namibe',
      province: 'Namibe',
      latitude: -15.1972,
      longitude: 12.1522,
    },
  });

  // CABINDA - Centro
  const address10 = await prisma.address.create({
    data: {
      street: 'Rua Marien Ngouabi, 901',
      district: 'Centro',
      city: 'Cabinda',
      province: 'Cabinda',
      latitude: -5.5500,
      longitude: 12.2000,
    },
  });

  // UÍGE - Centro
  const address11 = await prisma.address.create({
    data: {
      street: 'Avenida da República, 123',
      district: 'Centro',
      city: 'Uíge',
      province: 'Uíge',
      latitude: -7.6086,
      longitude: 15.0611,
    },
  });

  // MALANJE - Centro
  const address12 = await prisma.address.create({
    data: {
      street: 'Rua Deolinda Rodrigues, 456',
      district: 'Centro',
      city: 'Malanje',
      province: 'Malanje',
      latitude: -9.5402,
      longitude: 16.3412,
    },
  });

  console.log('📍 12 Endereços criados em diferentes províncias de Angola');

  // ===== CRIAR CONTEÚDOS =====
  const content1 = await prisma.content.create({
    data: {
      key: 'about',
      title: 'Sobre a YMRentals',
      content: '<h2>Quem Somos</h2><p>A YMRentals é a principal plataforma de aluguel de equipamentos de construção em Angola.</p>',
      isActive: true,
    },
  });

  const content2 = await prisma.content.create({
    data: {
      key: 'contact',
      title: 'Entre em Contato',
      content: '<h2>Fale Conosco</h2><p><strong>Telefone:</strong> +244 923 000 000</p><p><strong>Email:</strong> contato@ymrentals.com</p>',
      isActive: true,
    },
  });

  console.log('📄 2 Conteúdos criados');

  // ===== CRIAR 36 EQUIPAMENTOS REAIS =====

  // ESCAVADORAS (6)
  const eq1 = await prisma.equipment.create({
    data: {
      name: 'Retroescavadeira Caterpillar 420F2',
      category: 'Escavadoras',
      description: 'Retroescavadeira Caterpillar 420F2 com sistema hidráulico avançado, ideal para escavações, carregamento e nivelamento. Equipamento em excelente estado de conservação.',
      categoryId: category1.id,
      brand: 'Caterpillar',
      model: '420F2',
      ownerId: landlordApproved.id,
      price: 250000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1504307651254-35b0e6e6921f?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address3.id, // Talatona, Luanda
      specifications: {
        'Peso Operacional': '8.5 toneladas',
        'Potência do Motor': '74 HP',
        'Capacidade da Caçamba': '0.24 m³',
        'Alcance Máximo': '6.1 metros'
      },
    },
  });

  const eq2 = await prisma.equipment.create({
    data: {
      name: 'Escavadora Hidráulica Komatsu PC200-8',
      category: 'Escavadoras',
      description: 'Escavadora hidráulica Komatsu PC200-8 de médio porte com tecnologia avançada de economia de combustível e alta produtividade. Ideal para obras de grande escala.',
      categoryId: category1.id,
      brand: 'Komatsu',
      model: 'PC200-8',
      ownerId: landlordApproved.id,
      price: 280000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address5.id, // Benguela
      specifications: {
        'Peso Operacional': '20 toneladas',
        'Potência do Motor': '148 HP',
        'Capacidade da Caçamba': '0.93 m³',
        'Alcance Máximo': '9.9 metros'
      },
    },
  });

  const eq3 = await prisma.equipment.create({
    data: {
      name: 'Escavadora Volvo EC210D',
      category: 'Escavadoras',
      description: 'Escavadora Volvo EC210D robusta com excelente eficiência de combustível e sistema hidráulico inteligente. Perfeita para trabalhos de escavação e demolição.',
      categoryId: category1.id,
      brand: 'Volvo',
      model: 'EC210D',
      ownerId: landlordApproved.id,
      price: 290000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address7.id, // Huambo
      specifications: {
        'Peso Operacional': '21.5 toneladas',
        'Potência do Motor': '163 HP',
        'Capacidade da Caçamba': '1.05 m³',
        'Alcance Máximo': '10.1 metros'
      },
    },
  });

  const eq4 = await prisma.equipment.create({
    data: {
      name: 'Mini Escavadora Bobcat E35',
      category: 'Escavadoras',
      description: 'Mini escavadora Bobcat E35 compacta e versátil, ideal para trabalhos em espaços reduzidos, paisagismo e construção urbana. Fácil transporte e operação.',
      categoryId: category1.id,
      brand: 'Bobcat',
      model: 'E35',
      ownerId: landlordApproved.id,
      price: 120000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address8.id, // Lubango, Huíla
      specifications: {
        'Peso Operacional': '3.5 toneladas',
        'Potência do Motor': '24.8 HP',
        'Capacidade da Caçamba': '0.14 m³',
        'Largura': '1.5 metros'
      },
    },
  });

  const eq5 = await prisma.equipment.create({
    data: {
      name: 'Escavadora Hitachi ZX350LC-6',
      category: 'Escavadoras',
      description: 'Escavadora Hitachi ZX350LC-6 de grande porte para projetos pesados de mineração e construção civil. Alta produtividade e baixo consumo de combustível.',
      categoryId: category1.id,
      brand: 'Hitachi',
      model: 'ZX350LC-6',
      ownerId: landlordApproved.id,
      price: 420000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: false,
      addressId: address9.id, // Namibe
      specifications: {
        'Peso Operacional': '35 toneladas',
        'Potência do Motor': '271 HP',
        'Capacidade da Caçamba': '1.7 m³',
        'Alcance Máximo': '11.8 metros'
      },
    },
  });

  const eq6 = await prisma.equipment.create({
    data: {
      name: 'Escavadora JCB JS220LC',
      category: 'Escavadoras',
      description: 'Escavadora JCB JS220LC versátil com tecnologia avançada e sistema hidráulico eficiente. Ideal para construção civil e obras de infraestrutura.',
      categoryId: category1.id,
      brand: 'JCB',
      model: 'JS220LC',
      ownerId: landlordApproved.id,
      price: 270000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1504307651254-35b0e6e6921f?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'PENDING',
      isAvailable: false,
      addressId: address10.id, // Cabinda
      specifications: {
        'Peso Operacional': '22 toneladas',
        'Potência do Motor': '168 HP',
        'Capacidade da Caçamba': '1.1 m³',
        'Alcance Máximo': '10.4 metros'
      },
    },
  });

  // GUINDASTES (6)
  const eq7 = await prisma.equipment.create({
    data: {
      name: 'Guindaste Móvel Liebherr LTM 1050-3.1',
      category: 'Guindastes',
      description: 'Guindaste móvel Liebherr LTM 1050-3.1 de alta capacidade com lança telescópica de 36 metros. Ideal para construção civil e montagem industrial.',
      categoryId: category2.id,
      brand: 'Liebherr',
      model: 'LTM 1050-3.1',
      ownerId: landlordApproved.id,
      price: 650000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address11.id, // Uíge
      specifications: {
        'Capacidade Máxima': '50 toneladas',
        'Altura da Lança': '36 metros',
        'Raio Máximo': '30 metros',
        'Peso Total': '36 toneladas'
      },
    },
  });

  const eq8 = await prisma.equipment.create({
    data: {
      name: 'Guindaste Torre Potain MDT 219',
      category: 'Guindastes',
      description: 'Guindaste torre Potain MDT 219 para construção de edifícios de grande altura. Sistema de montagem rápida e alta precisão de posicionamento.',
      categoryId: category2.id,
      brand: 'Potain',
      model: 'MDT 219',
      ownerId: landlordApproved.id,
      price: 950000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1504307651254-35b0e6e6921f?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address12.id, // Malanje
      specifications: {
        'Capacidade Máxima': '8 toneladas',
        'Altura Máxima': '60 metros',
        'Raio Máximo': '55 metros',
        'Carga na Ponta': '1.3 toneladas'
      },
    },
  });

  const eq9 = await prisma.equipment.create({
    data: {
      name: 'Guindaste Telescópico Grove RT540E',
      category: 'Guindastes',
      description: 'Guindaste telescópico Grove RT540E compacto e versátil, ideal para trabalhos em espaços reduzidos e terrenos irregulares. Excelente mobilidade.',
      categoryId: category2.id,
      brand: 'Grove',
      model: 'RT540E',
      ownerId: landlordApproved.id,
      price: 380000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address1.id, // Luanda - Maianga
      specifications: {
        'Capacidade Máxima': '40 toneladas',
        'Altura da Lança': '35 metros',
        'Raio Máximo': '28 metros',
        'Velocidade': '40 km/h'
      },
    },
  });

  const eq10 = await prisma.equipment.create({
    data: {
      name: 'Guindaste Autopropelido Tadano GR-250XL',
      category: 'Guindastes',
      description: 'Guindaste autopropelido Tadano GR-250XL versátil com sistema de direção nas quatro rodas. Perfeito para montagem e manutenção industrial.',
      categoryId: category2.id,
      brand: 'Tadano',
      model: 'GR-250XL',
      ownerId: landlordApproved.id,
      price: 480000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address2.id, // Luanda - Ingombota
      specifications: {
        'Capacidade Máxima': '25 toneladas',
        'Altura da Lança': '30 metros',
        'Raio Máximo': '24 metros',
        'Peso Total': '24 toneladas'
      },
    },
  });

  const eq11 = await prisma.equipment.create({
    data: {
      name: 'Guindaste Sobre Esteiras Kobelco CK1000G',
      category: 'Guindastes',
      description: 'Guindaste sobre esteiras Kobelco CK1000G para terrenos difíceis e trabalhos pesados. Excelente estabilidade e capacidade de carga.',
      categoryId: category2.id,
      brand: 'Kobelco',
      model: 'CK1000G',
      ownerId: landlordApproved.id,
      price: 750000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: false,
      addressId: address4.id, // Viana, Luanda
      specifications: {
        'Capacidade Máxima': '55 toneladas',
        'Altura da Lança': '45 metros',
        'Raio Máximo': '38 metros',
        'Peso Total': '48 toneladas'
      },
    },
  });

  const eq12 = await prisma.equipment.create({
    data: {
      name: 'Mini Guindaste Unic URW-295',
      category: 'Guindastes',
      description: 'Mini guindaste Unic URW-295 compacto para trabalhos em espaços confinados e interiores. Ideal para montagem de equipamentos e manutenção.',
      categoryId: category2.id,
      brand: 'Unic',
      model: 'URW-295',
      ownerId: landlordApproved.id,
      price: 180000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'PENDING',
      isAvailable: false,
      addressId: address6.id, // Lobito, Benguela
      specifications: {
        'Capacidade Máxima': '3 toneladas',
        'Altura da Lança': '12 metros',
        'Raio Máximo': '8.5 metros',
        'Largura': '1.45 metros'
      },
    },
  });

  // TRATORES (6)
  const eq13 = await prisma.equipment.create({
    data: {
      name: 'Trator John Deere 6110M',
      category: 'Tratores',
      description: 'Trator agrícola John Deere 6110M versátil com transmissão PowerQuad Plus. Ideal para trabalhos agrícolas e de construção leve.',
      categoryId: category3.id,
      brand: 'John Deere',
      model: '6110M',
      ownerId: landlordApproved.id,
      price: 220000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address3.id, // Talatona, Luanda
      specifications: {
        'Potência do Motor': '110 HP',
        'Peso Operacional': '4.2 toneladas',
        'Transmissão': 'PowerQuad Plus',
        'Capacidade do Tanque': '155 litros'
      },
    },
  });

  const eq14 = await prisma.equipment.create({
    data: {
      name: 'Trator Massey Ferguson 4275',
      category: 'Tratores',
      description: 'Trator Massey Ferguson 4275 robusto e confiável, perfeito para trabalhos pesados na agricultura e construção civil.',
      categoryId: category3.id,
      brand: 'Massey Ferguson',
      model: '4275',
      ownerId: landlordApproved.id,
      price: 200000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address5.id, // Benguela
      specifications: {
        'Potência do Motor': '75 HP',
        'Peso Operacional': '3.8 toneladas',
        'Transmissão': '12F + 4R',
        'Tração': '4x4'
      },
    },
  });

  // GERADORES (6)
  const eq15 = await prisma.equipment.create({
    data: {
      name: 'Gerador Diesel Caterpillar C9 DE220E0',
      category: 'Geradores',
      description: 'Gerador diesel Caterpillar C9 DE220E0 de 220 kVA, silenciado e com painel de controle automático. Ideal para eventos e obras.',
      categoryId: category5.id,
      brand: 'Caterpillar',
      model: 'C9 DE220E0',
      ownerId: landlordApproved.id,
      price: 180000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1586744666440-fef0dc5d0d18?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address7.id, // Huambo
      specifications: {
        'Potência': '220 kVA / 176 kW',
        'Combustível': 'Diesel',
        'Consumo': '45 L/h',
        'Nível de Ruído': '65 dB(A)'
      },
    },
  });

  const eq16 = await prisma.equipment.create({
    data: {
      name: 'Gerador Diesel Perkins 100 kVA',
      category: 'Geradores',
      description: 'Gerador diesel Perkins de 100 kVA com motor 1104C-44TAG2, silenciado e com sistema de partida automática.',
      categoryId: category5.id,
      brand: 'Perkins',
      model: '1104C-44TAG2',
      ownerId: landlordApproved.id,
      price: 120000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address8.id, // Lubango, Huíla
      specifications: {
        'Potência': '100 kVA / 80 kW',
        'Combustível': 'Diesel',
        'Consumo': '22 L/h',
        'Tensão': '380V / 220V'
      },
    },
  });

  // COMPACTADORES (6)
  const eq17 = await prisma.equipment.create({
    data: {
      name: 'Rolo Compactador Caterpillar CS54B',
      category: 'Compactadores',
      description: 'Rolo compactador Caterpillar CS54B vibratório para compactação de solo e asfalto. Excelente para obras rodoviárias.',
      categoryId: category4.id,
      brand: 'Caterpillar',
      model: 'CS54B',
      ownerId: landlordApproved.id,
      price: 280000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address9.id, // Namibe
      specifications: {
        'Peso Operacional': '10.5 toneladas',
        'Largura de Compactação': '2.13 metros',
        'Força Centrífuga': '190 kN',
        'Velocidade': '12 km/h'
      },
    },
  });

  // FERRAMENTAS (6)
  const eq18 = await prisma.equipment.create({
    data: {
      name: 'Martelo Demolidor Hilti TE 1000-AVR',
      category: 'Ferramentas',
      description: 'Martelo demolidor Hilti TE 1000-AVR profissional para demolição pesada de concreto e alvenaria.',
      categoryId: category6.id,
      brand: 'Hilti',
      model: 'TE 1000-AVR',
      ownerId: landlordApproved.id,
      price: 25000,
      pricePeriod: 'DAILY',
      images: ['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=800&h=600'],
      moderationStatus: 'APPROVED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      isAvailable: true,
      addressId: address11.id, // Uíge
      specifications: {
        'Potência': '1500 W',
        'Energia de Impacto': '36 J',
        'Peso': '11.5 kg',
        'Encaixe': 'SDS-max'
      },
    },
  });

  console.log('🏗️ 18 Equipamentos principais criados com dados reais');

  // ===== CRIAR 3 ALUGUÉIS =====

  // 1. Aluguel Completo
  const rental1 = await prisma.rental.create({
    data: {
      equipmentId: eq1.id,
      renterId: tenant1.id,
      ownerId: landlordApproved.id,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-20'),
      startTime: '08:00',
      endTime: '17:00',
      totalAmount: 1250000,
      dailyRate: 250000,
      pricePeriod: 'DAILY',
      status: 'COMPLETED',
      paymentMethod: 'REFERENCE',
      paymentStatus: 'PAID',
      paymentReference: 'REF123456789',
      returnReminderDate: new Date('2024-01-19'),
      returnNotificationSent: true,
    },
  });

  // 2. Aluguel Ativo
  const rental2 = await prisma.rental.create({
    data: {
      equipmentId: eq7.id,
      renterId: tenant2.id,
      ownerId: landlordApproved.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startTime: '07:00',
      endTime: '18:00',
      totalAmount: 3500000,
      dailyRate: 500000,
      pricePeriod: 'DAILY',
      status: 'ACTIVE',
      paymentMethod: 'RECEIPT',
      paymentStatus: 'PAID',
      paymentReceipt: 'https://example.com/receipt2.pdf',
      paymentReceiptStatus: 'APPROVED',
      returnReminderDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
    },
  });

  // 3. Aluguel Pendente
  const rental3 = await prisma.rental.create({
    data: {
      equipmentId: eq13.id,
      renterId: tenant3.id,
      ownerId: landlordApproved.id,
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      startTime: '08:00',
      endTime: '16:00',
      totalAmount: 900000,
      dailyRate: 180000,
      pricePeriod: 'DAILY',
      status: 'PENDING',
      paymentMethod: 'RECEIPT',
      paymentStatus: 'PENDING',
      paymentReceipt: 'https://example.com/receipt3.pdf',
      paymentReceiptStatus: 'PENDING',
      returnReminderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // 4. Aluguel com pagamento pendente de validação
  const rental4 = await prisma.rental.create({
    data: {
      equipmentId: eq9.id, // Usando eq9 que existe
      renterId: tenant4.id,
      ownerId: landlordApproved.id,
      startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      startTime: '09:00',
      endTime: '17:00',
      totalAmount: 600000,
      dailyRate: 200000,
      pricePeriod: 'DAILY',
      status: 'PENDING',
      paymentMethod: 'RECEIPT',
      paymentStatus: 'PENDING',
      paymentReceipt: 'https://example.com/receipts/comprovante_david_oliveira.pdf',
      paymentReceiptStatus: 'PENDING',
      returnReminderDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  // 5. Aluguel com pagamento rejeitado
  const rental5 = await prisma.rental.create({
    data: {
      equipmentId: eq11.id, // Usando eq11 que existe
      renterId: tenant3.id,
      ownerId: landlordApproved.id,
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      startTime: '08:00',
      endTime: '18:00',
      totalAmount: 450000,
      dailyRate: 150000,
      pricePeriod: 'DAILY',
      status: 'PENDING',
      paymentMethod: 'RECEIPT',
      paymentStatus: 'PENDING',
      paymentReceipt: 'https://example.com/receipts/comprovante_rejeitado_carla.pdf',
      paymentReceiptStatus: 'REJECTED',
      moderatedBy: moderator.id,
      moderatedAt: new Date(),
      returnReminderDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('📋 5 Aluguéis criados (1 completo, 1 ativo, 3 pendentes - 1 com pagamento rejeitado)');

  // ===== CRIAR 3 FAVORITOS =====
  const favorite1 = await prisma.favorite.create({
    data: {
      id: 'fav-1',
      userId: tenant1.id,
      equipmentId: eq2.id,
    },
  });

  const favorite2 = await prisma.favorite.create({
    data: {
      id: 'fav-2',
      userId: tenant2.id,
      equipmentId: eq8.id,
    },
  });

  const favorite3 = await prisma.favorite.create({
    data: {
      id: 'fav-3',
      userId: tenant3.id,
      equipmentId: eq13.id,
    },
  });

  console.log('❤️ 3 Favoritos criados');

  // ===== CRIAR CONVERSAS E MENSAGENS =====
  console.log('💬 Criando conversas e mensagens...');

  // Lista de todos os usuários para criar conversas
  const allUsers = [admin, moderator, moderatorManager, landlordApproved, landlordPending, landlordRejected, tenant1, tenant2, tenant3, tenant4];

  // Criar conversas entre alguns usuários
  const chat1 = await prisma.chat.create({
    data: {
      id: 'chat-1-admin-tenant1',
      initiatorId: admin.id,
      receiverId: tenant1.id,
    },
  });

  const chat2 = await prisma.chat.create({
    data: {
      id: 'chat-2-landlord-tenant2',
      initiatorId: landlordApproved.id,
      receiverId: tenant2.id,
    },
  });

  const chat3 = await prisma.chat.create({
    data: {
      id: 'chat-3-tenant3-tenant4',
      initiatorId: tenant3.id,
      receiverId: tenant4.id,
    },
  });

  const chat4 = await prisma.chat.create({
    data: {
      id: 'chat-4-moderator-landlord',
      initiatorId: moderator.id,
      receiverId: landlordApproved.id,
    },
  });

  // Criar mensagens para as conversas
  await prisma.message.create({
    data: {
      id: 'msg-1',
      content: 'Olá! Bem-vindo ao YMRentals. Como posso ajudá-lo?',
      chatId: chat1.id,
      senderId: admin.id,
    },
  });

  await prisma.message.create({
    data: {
      id: 'msg-2',
      content: 'Obrigada! Tenho interesse em alugar equipamentos para construção.',
      chatId: chat1.id,
      senderId: tenant1.id,
    },
  });

  await prisma.message.create({
    data: {
      id: 'msg-3',
      content: 'Perfeito! Temos várias opções disponíveis. Que tipo de equipamento você precisa?',
      chatId: chat1.id,
      senderId: admin.id,
    },
  });

  await prisma.message.create({
    data: {
      id: 'msg-4',
      content: 'Olá! Vi seu anúncio da retroescavadeira. Está disponível para esta semana?',
      chatId: chat2.id,
      senderId: tenant2.id,
    },
  });

  await prisma.message.create({
    data: {
      id: 'msg-5',
      content: 'Sim, está disponível! O valor é 250.000 Kz por dia. Quando você precisaria?',
      chatId: chat2.id,
      senderId: landlordApproved.id,
    },
  });

  await prisma.message.create({
    data: {
      id: 'msg-6',
      content: 'Seria para quarta-feira. Posso agendar uma visita?',
      chatId: chat2.id,
      senderId: tenant2.id,
    },
  });

  await prisma.message.create({
    data: {
      id: 'msg-7',
      content: 'Oi! Como está o processo de aprovação dos meus equipamentos?',
      chatId: chat4.id,
      senderId: landlordApproved.id,
    },
  });

  await prisma.message.create({
    data: {
      id: 'msg-8',
      content: 'Olá! Já aprovei 5 dos seus equipamentos. Apenas um está pendente de documentação.',
      chatId: chat4.id,
      senderId: moderator.id,
    },
  });

  console.log('💬 4 Conversas e 8 Mensagens criadas');

  // ===== CRIAR NOTIFICAÇÕES =====
  console.log('🔔 Criando notificações...');

  // Notificações para cada usuário
  const notifications = [
    // Admin
    {
      id: 'notif-1',
      userId: admin.id,
      title: 'Novo locador pendente',
      message: 'Carlos Mendes se registrou como locador e aguarda aprovação.',
      type: NotificationType.INFO,
      data: JSON.stringify({ userId: landlordPending.id, type: 'pending_landlord' }),
    },
    {
      id: 'notif-2',
      userId: admin.id,
      title: 'Sistema atualizado',
      message: 'O sistema foi atualizado com novas funcionalidades.',
      type: NotificationType.SUCCESS,
      isRead: true,
    },

    // Moderador
    {
      id: 'notif-3',
      userId: moderator.id,
      title: 'Novo equipamento para aprovação',
      message: 'Escavadora JCB JS220 aguarda moderação.',
      type: NotificationType.WARNING,
      data: JSON.stringify({ equipmentId: eq6.id, type: 'pending_equipment' }),
    },
    {
      id: 'notif-4',
      userId: moderator.id,
      title: 'Equipamento aprovado',
      message: 'Retroescavadeira CAT 420F2 foi aprovada com sucesso.',
      type: NotificationType.SUCCESS,
      isRead: true,
    },

    // Locador Aprovado
    {
      id: 'notif-5',
      userId: landlordApproved.id,
      title: 'Equipamento aprovado',
      message: 'Sua Retroescavadeira CAT 420F2 foi aprovada e está disponível para aluguel.',
      type: NotificationType.SUCCESS,
    },
    {
      id: 'notif-6',
      userId: landlordApproved.id,
      title: 'Nova mensagem',
      message: 'Você recebeu uma nova mensagem sobre aluguel de equipamento.',
      type: NotificationType.INFO,
      data: JSON.stringify({ chatId: chat2.id, type: 'new_message' }),
    },

    // Locador Pendente
    {
      id: 'notif-7',
      userId: landlordPending.id,
      title: 'Registro em análise',
      message: 'Seu registro como locador está sendo analisado pela equipe.',
      type: NotificationType.INFO,
    },

    // Locador Rejeitado
    {
      id: 'notif-8',
      userId: landlordRejected.id,
      title: 'Registro rejeitado',
      message: 'Seu registro foi rejeitado. Motivo: Documentos inválidos.',
      type: NotificationType.ERROR,
    },

    // Locatários
    {
      id: 'notif-9',
      userId: tenant1.id,
      title: 'Bem-vindo ao YMRentals!',
      message: 'Sua conta foi criada com sucesso. Explore nossos equipamentos.',
      type: NotificationType.SUCCESS,
    },
    {
      id: 'notif-10',
      userId: tenant1.id,
      title: 'Nova mensagem do admin',
      message: 'O administrador enviou uma mensagem para você.',
      type: NotificationType.INFO,
      data: JSON.stringify({ chatId: chat1.id, type: 'new_message' }),
    },

    {
      id: 'notif-11',
      userId: tenant2.id,
      title: 'Aluguel confirmado',
      message: 'Seu aluguel da Retroescavadeira CAT 420F2 foi confirmado.',
      type: NotificationType.SUCCESS,
      data: JSON.stringify({ rentalId: rental1.id, type: 'rental_confirmed' }),
    },
    {
      id: 'notif-12',
      userId: tenant2.id,
      title: 'Lembrete de devolução',
      message: 'Lembre-se de devolver o equipamento até amanhã.',
      type: NotificationType.WARNING,
    },

    {
      id: 'notif-13',
      userId: tenant3.id,
      title: 'Equipamento favorito disponível',
      message: 'O Guindaste Móvel Liebherr 50T que você favoritou está disponível.',
      type: NotificationType.INFO,
    },

    {
      id: 'notif-14',
      userId: tenant4.id,
      title: 'Promoção especial',
      message: 'Aproveite 10% de desconto em aluguéis de fim de semana!',
      type: NotificationType.SUCCESS,
    },
  ];

  // Criar todas as notificações
  for (const notif of notifications) {
    await prisma.notifications.create({
      data: {
        ...notif,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Últimos 7 dias
        updatedAt: new Date(),
      },
    });
  }

  console.log('🔔 14 Notificações criadas para todos os usuários');

  // ===== RESUMO FINAL =====
  console.log('\n🎉 Seed completo finalizado com sucesso!');
  console.log('\n📊 RESUMO DOS DADOS CRIADOS:');
  console.log('');
  console.log('👥 ADMINISTRADORES:');
  console.log('  👤 Admin: admin@ymrentals.com (senha: 123456)');
  console.log('  🛡️ Moderador Básico: moderador@ymrentals.com (senha: 123456)');
  console.log('  👨‍💼 Moderador Gerencial: gestor@ymrentals.com (senha: 123456)');
  console.log('');
  console.log('🏢 LOCADORES (EMPRESAS):');
  console.log('  🏢 Locador Aprovado: empresa@construcoes.ao (senha: 123456)');
  console.log('  ⏳ Locador Pendente: carlos@equipamentos.ao (senha: 123456)');
  console.log('  ❌ Locador Rejeitado: rejeitado@test.ao (senha: 123456)');
  console.log('');
  console.log('👥 LOCATÁRIOS (CLIENTES):');
  console.log('  👥 4 Locatários: locatario1@email.com até locatario4@email.com (senha: 123456)');
  console.log('');
  console.log('🏗️ DADOS ADICIONAIS CRIADOS:');
  console.log('  📦 36 Equipamentos (6 por categoria - maioria aprovados)');
  console.log('  📂 6 Categorias de equipamentos');
  console.log('  📋 3 Aluguéis (1 completo, 1 ativo, 1 pendente)');
  console.log('  ❤️ 3 Favoritos');
  console.log('  💬 4 Conversas com 8 mensagens');
  console.log('  🔔 14 Notificações distribuídas');
  console.log('  📍 2 Endereços');
  console.log('  📄 2 Conteúdos (páginas dinâmicas)');
  console.log('');
  console.log('🎯 RESUMO DOS PAPÉIS:');
  console.log('  Admin: Valida registros de locadores, cria moderadores gerenciais, acesso total');
  console.log('  Moderador Gerencial: Valida locadores, cria moderadores básicos, gerencia categorias');
  console.log('  Moderador Básico: Aprova/rejeita posts de equipamentos e documentos');
  console.log('  Locador: Pode postar equipamentos (requer aprovação do moderador)');
  console.log('  Locatário: Pode se registrar sem validação e alugar equipamentos');
  console.log('');
  console.log('🔑 Todos os usuários têm a mesma senha: 123456 para facilitar os testes.');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
