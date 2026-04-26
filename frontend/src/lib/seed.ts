import {
  Firestore,
  collection,
  writeBatch,
  getDocs,
  query,
  limit,
  Timestamp,
  doc,
} from 'firebase/firestore';

const UNITS = [
  { name: 'Hospital Central', code: 'HC', type: 'HOSPITAL', address: 'Av. Principal, 100', active: true },
  { name: 'UPA Norte', code: 'UPAN', type: 'UPA', address: 'Rua Norte, 200', active: true },
  { name: 'Clínica Sul', code: 'CS', type: 'CLINIC', address: 'Av. Sul, 300', active: true },
  { name: 'Posto de Saúde Leste', code: 'PSL', type: 'HEALTH_POST', address: 'Rua Leste, 400', active: true },
  { name: 'Laboratório Central', code: 'LAB', type: 'LAB', address: 'Rua Central, 500', active: true },
];

const CATEGORIES = [
  { name: 'Infraestrutura de TI', type: 'INCIDENT', color: '#ef4444', active: true },
  { name: 'Sistemas Clínicos', type: 'REQUEST', color: '#3b82f6', active: true },
  { name: 'Hardware', type: 'INCIDENT', color: '#f97316', active: true },
  { name: 'Redes e Conectividade', type: 'INCIDENT', color: '#8b5cf6', active: true },
  { name: 'Prontuário Eletrônico', type: 'IMPROVEMENT', color: '#10b981', active: true },
];

const SLA_CONFIGS = [
  { demandType: 'INCIDENT',    priority: 'CRITICAL', responseTime: 1,  resolutionTime: 4 },
  { demandType: 'INCIDENT',    priority: 'HIGH',     responseTime: 2,  resolutionTime: 8 },
  { demandType: 'INCIDENT',    priority: 'MEDIUM',   responseTime: 4,  resolutionTime: 24 },
  { demandType: 'REQUEST',     priority: 'CRITICAL', responseTime: 2,  resolutionTime: 8 },
  { demandType: 'REQUEST',     priority: 'HIGH',     responseTime: 4,  resolutionTime: 24 },
  { demandType: 'REQUEST',     priority: 'MEDIUM',   responseTime: 8,  resolutionTime: 48 },
  { demandType: 'REQUEST',     priority: 'LOW',      responseTime: 24, resolutionTime: 120 },
  { demandType: 'IMPROVEMENT', priority: 'HIGH',     responseTime: 8,  resolutionTime: 72 },
  { demandType: 'IMPROVEMENT', priority: 'MEDIUM',   responseTime: 24, resolutionTime: 168 },
  { demandType: 'PROJECT',     priority: 'MEDIUM',   responseTime: 24, resolutionTime: 720 },
];

export async function runSeed(db: Firestore): Promise<{ units: number; categories: number; slaConfigs: number }> {
  const now = Timestamp.fromDate(new Date());

  // Check all collections in parallel
  const [existingUnits, existingCategories, existingSla] = await Promise.all([
    getDocs(query(collection(db, 'units'), limit(1))),
    getDocs(query(collection(db, 'categories'), limit(1))),
    getDocs(query(collection(db, 'slaConfigs'), limit(1))),
  ]);

  const batch = writeBatch(db);
  let unitsCreated = 0;
  let categoriesCreated = 0;
  let slaConfigsCreated = 0;

  if (existingUnits.empty) {
    UNITS.forEach((unit) => {
      batch.set(doc(collection(db, 'units')), { ...unit, createdAt: now, updatedAt: now });
      unitsCreated++;
    });
  }

  if (existingCategories.empty) {
    CATEGORIES.forEach((category) => {
      batch.set(doc(collection(db, 'categories')), { ...category, createdAt: now, updatedAt: now });
      categoriesCreated++;
    });
  }

  if (existingSla.empty) {
    SLA_CONFIGS.forEach((sla) => {
      batch.set(doc(collection(db, 'slaConfigs')), { ...sla, createdAt: now, updatedAt: now });
      slaConfigsCreated++;
    });
  }

  // Single commit for all documents
  if (unitsCreated + categoriesCreated + slaConfigsCreated > 0) {
    await batch.commit();
  }

  return { units: unitsCreated, categories: categoriesCreated, slaConfigs: slaConfigsCreated };
}
