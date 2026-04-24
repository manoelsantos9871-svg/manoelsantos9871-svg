import { PrismaClient, UserRole, DemandType, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed units
  const units = await Promise.all([
    prisma.unit.upsert({ where: { code: 'SMS-CENTRAL' }, create: { name: 'Secretaria Municipal de Saúde - Central', code: 'SMS-CENTRAL', type: 'Secretaria' }, update: {} }),
    prisma.unit.upsert({ where: { code: 'UBS-CENTRO' }, create: { name: 'UBS Centro', code: 'UBS-CENTRO', type: 'UBS' }, update: {} }),
    prisma.unit.upsert({ where: { code: 'UPA-NORTE' }, create: { name: 'UPA Norte', code: 'UPA-NORTE', type: 'UPA' }, update: {} }),
    prisma.unit.upsert({ where: { code: 'HOSP-MUNI' }, create: { name: 'Hospital Municipal', code: 'HOSP-MUNI', type: 'Hospital' }, update: {} }),
    prisma.unit.upsert({ where: { code: 'LAB-CENTRAL' }, create: { name: 'Laboratório Central', code: 'LAB-CENTRAL', type: 'Laboratório' }, update: {} }),
  ]);

  // Seed categories
  await Promise.all([
    prisma.category.upsert({ where: { id: 'cat-infra' }, create: { id: 'cat-infra', name: 'Infraestrutura', type: 'INFRASTRUCTURE', color: '#ef4444' }, update: {} }),
    prisma.category.upsert({ where: { id: 'cat-sistemas' }, create: { id: 'cat-sistemas', name: 'Sistemas', type: 'SYSTEMS', color: '#3b82f6' }, update: {} }),
    prisma.category.upsert({ where: { id: 'cat-redes' }, create: { id: 'cat-redes', name: 'Redes', type: 'NETWORKS', color: '#10b981' }, update: {} }),
    prisma.category.upsert({ where: { id: 'cat-equipamentos' }, create: { id: 'cat-equipamentos', name: 'Equipamentos', type: 'EQUIPMENT', color: '#f59e0b' }, update: {} }),
    prisma.category.upsert({ where: { id: 'cat-suporte' }, create: { id: 'cat-suporte', name: 'Suporte ao Usuário', type: 'SUPPORT', color: '#8b5cf6' }, update: {} }),
  ]);

  // Seed SLA configs
  const slaConfigs = [
    { demandType: DemandType.INCIDENT, priority: Priority.CRITICAL, responseTime: 15, resolutionTime: 60 },
    { demandType: DemandType.INCIDENT, priority: Priority.HIGH, responseTime: 60, resolutionTime: 240 },
    { demandType: DemandType.INCIDENT, priority: Priority.MEDIUM, responseTime: 240, resolutionTime: 1440 },
    { demandType: DemandType.INCIDENT, priority: Priority.LOW, responseTime: 480, resolutionTime: 2880 },
    { demandType: DemandType.REQUEST, priority: Priority.HIGH, responseTime: 120, resolutionTime: 480 },
    { demandType: DemandType.REQUEST, priority: Priority.MEDIUM, responseTime: 480, resolutionTime: 2880 },
    { demandType: DemandType.REQUEST, priority: Priority.LOW, responseTime: 960, resolutionTime: 5760 },
    { demandType: DemandType.IMPROVEMENT, priority: Priority.HIGH, responseTime: 480, resolutionTime: 10080 },
    { demandType: DemandType.IMPROVEMENT, priority: Priority.MEDIUM, responseTime: 1440, resolutionTime: 20160 },
    { demandType: DemandType.PROJECT, priority: Priority.HIGH, responseTime: 1440, resolutionTime: 43200 },
  ];

  for (const sla of slaConfigs) {
    await prisma.sLAConfig.upsert({
      where: { demandType_priority: { demandType: sla.demandType, priority: sla.priority } },
      create: sla,
      update: sla,
    });
  }

  // Seed admin user
  const adminPassword = await bcrypt.hash('Admin@2024!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@saude.gov.br' },
    create: {
      name: 'Administrador do Sistema',
      matricula: '000001',
      role: UserRole.ADMIN,
      sector: 'DETS - Departamento de Tecnologia em Saúde',
      email: 'admin@saude.gov.br',
      passwordHash: adminPassword,
    },
    update: {},
  });

  // Seed manager
  const managerPassword = await bcrypt.hash('Gestor@2024!', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'gestor@saude.gov.br' },
    create: {
      name: 'Gestor de TI',
      matricula: '000002',
      role: UserRole.MANAGER,
      sector: 'DETS - Coordenação',
      email: 'gestor@saude.gov.br',
      passwordHash: managerPassword,
    },
    update: {},
  });

  // Seed technicians
  const techPassword = await bcrypt.hash('Tecnico@2024!', 12);
  const tech1 = await prisma.user.upsert({
    where: { email: 'tecnico1@saude.gov.br' },
    create: {
      name: 'João Silva',
      matricula: '000003',
      role: UserRole.TECHNICIAN,
      sector: 'DETS - Suporte',
      email: 'tecnico1@saude.gov.br',
      passwordHash: techPassword,
    },
    update: {},
  });

  const tech2 = await prisma.user.upsert({
    where: { email: 'tecnico2@saude.gov.br' },
    create: {
      name: 'Maria Santos',
      matricula: '000004',
      role: UserRole.TECHNICIAN,
      sector: 'DETS - Infraestrutura',
      email: 'tecnico2@saude.gov.br',
      passwordHash: techPassword,
    },
    update: {},
  });

  // Seed requester
  const reqPassword = await bcrypt.hash('Solicitante@2024!', 12);
  await prisma.user.upsert({
    where: { email: 'solicitante@saude.gov.br' },
    create: {
      name: 'Carlos Oliveira',
      matricula: '000005',
      role: UserRole.REQUESTER,
      sector: 'Regulação',
      email: 'solicitante@saude.gov.br',
      passwordHash: reqPassword,
    },
    update: {},
  });

  // Sample demands
  const sampleDemands = [
    {
      type: DemandType.INCIDENT,
      title: 'Sistema de prontuário eletrônico indisponível',
      description: 'O sistema de prontuário eletrônico (PEP) está inacessível nas UBSs da região norte desde as 08h00. Aproximadamente 200 atendimentos afetados.',
      priority: Priority.CRITICAL,
      unitId: units[1].id,
      createdById: admin.id,
      assignedToId: tech1.id,
    },
    {
      type: DemandType.INCIDENT,
      title: 'Impressora da farmácia não funciona',
      description: 'A impressora HP LaserJet da farmácia do Hospital Municipal parou de funcionar. Receitas sendo emitidas manualmente.',
      priority: Priority.HIGH,
      unitId: units[3].id,
      createdById: manager.id,
      assignedToId: tech2.id,
    },
    {
      type: DemandType.REQUEST,
      title: 'Instalação de novo computador na recepção',
      description: 'Necessidade de instalação e configuração de novo computador na recepção da UPA Norte conforme aquisição realizada.',
      priority: Priority.MEDIUM,
      unitId: units[2].id,
      createdById: manager.id,
    },
    {
      type: DemandType.IMPROVEMENT,
      title: 'Atualização do sistema de agendamento online',
      description: 'Melhoria no módulo de agendamento para suportar teleconsultas e integração com WhatsApp Business.',
      priority: Priority.MEDIUM,
      unitId: units[0].id,
      createdById: admin.id,
      assignedToId: tech1.id,
    },
    {
      type: DemandType.PROJECT,
      title: 'Implantação de WiFi em todas as unidades',
      description: 'Projeto de expansão da rede WiFi institucional para todas as 15 unidades de saúde do município.',
      priority: Priority.HIGH,
      unitId: units[0].id,
      createdById: admin.id,
      assignedToId: manager.id,
    },
  ];

  for (let i = 0; i < sampleDemands.length; i++) {
    const d = sampleDemands[i];
    const year = new Date().getFullYear();
    const number = `DEM-${year}-${String(i + 1).padStart(5, '0')}`;

    const existing = await prisma.demand.findUnique({ where: { number } });
    if (!existing) {
      await prisma.demand.create({
        data: { ...d, number },
      });
    }
  }

  console.log('Seed completed successfully!');
  console.log('\nDefault credentials:');
  console.log('Admin:      admin@saude.gov.br / Admin@2024!');
  console.log('Gestor:     gestor@saude.gov.br / Gestor@2024!');
  console.log('Técnico:    tecnico1@saude.gov.br / Tecnico@2024!');
  console.log('Solicitante: solicitante@saude.gov.br / Solicitante@2024!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
