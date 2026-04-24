import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import StatsCard from '@/components/ui/StatsCard';
import { LoadingPage } from '@/components/ui/Loading';
import { catalogService } from '@/services/catalog.service';
import { DEMAND_TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/utils/constants';
import { formatMinutes } from '@/utils/formatters';
import { SLAConfig, DemandType, Priority } from '@/types';

const TYPES = Object.entries(DEMAND_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const PRIORITIES = Object.entries(PRIORITY_LABELS).map(([v, l]) => ({ value: v, label: l }));

interface SLAForm { demandType: string; priority: string; responseTime: string; resolutionTime: string }

export default function SLAPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: configs, isLoading } = useQuery({ queryKey: ['sla-configs'], queryFn: catalogService.getSlaConfigs });
  const { data: stats } = useQuery({ queryKey: ['sla-stats'], queryFn: catalogService.getSlaStats });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SLAForm>();

  const upsertMutation = useMutation({
    mutationFn: (d: SLAForm) => catalogService.upsertSla({
      demandType: d.demandType,
      priority: d.priority,
      responseTime: parseInt(d.responseTime),
      resolutionTime: parseInt(d.resolutionTime),
    }),
    onSuccess: () => {
      toast.success('Configuração SLA salva!');
      qc.invalidateQueries({ queryKey: ['sla-configs'] });
      qc.invalidateQueries({ queryKey: ['sla-stats'] });
      setShowCreate(false);
      reset();
    },
    onError: () => toast.error('Erro ao salvar configuração'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => catalogService.deleteSla(id),
    onSuccess: () => {
      toast.success('Configuração removida');
      qc.invalidateQueries({ queryKey: ['sla-configs'] });
    },
    onError: () => toast.error('Erro ao remover'),
  });

  if (isLoading) return <LoadingPage />;

  const slaStats = stats as { total?: number; breached?: number; nearBreach?: number; complianceRate?: number } | undefined;

  const grouped = configs?.reduce((acc, cfg) => {
    if (!acc[cfg.demandType]) acc[cfg.demandType] = [];
    acc[cfg.demandType].push(cfg);
    return acc;
  }, {} as Record<DemandType, SLAConfig[]>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de SLA"
        subtitle="Configuração de acordos de nível de serviço"
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>Nova Configuração</Button>}
      />

      {/* Stats */}
      {slaStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Monitoradas" value={slaStats.total ?? 0} icon={<Clock />} color="blue" />
          <StatsCard title="SLA Violado" value={slaStats.breached ?? 0} icon={<AlertTriangle />} color="red" />
          <StatsCard title="Próximo do Prazo" value={slaStats.nearBreach ?? 0} icon={<Clock />} color="orange" />
          <StatsCard title="Taxa de Conformidade" value={`${slaStats.complianceRate ?? 100}%`} icon={<CheckCircle />} color="green" />
        </div>
      )}

      {/* SLA Table by Type */}
      {grouped && Object.entries(grouped).map(([type, cfgs]) => (
        <div key={type} className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {DEMAND_TYPE_LABELS[type as DemandType]}
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-5 py-2.5 font-medium text-xs text-gray-500 uppercase tracking-wider">Prioridade</th>
                <th className="text-left px-5 py-2.5 font-medium text-xs text-gray-500 uppercase tracking-wider">Tempo de Resposta</th>
                <th className="text-left px-5 py-2.5 font-medium text-xs text-gray-500 uppercase tracking-wider">Tempo de Resolução</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {cfgs.sort((a, b) => ['CRITICAL','HIGH','MEDIUM','LOW'].indexOf(a.priority) - ['CRITICAL','HIGH','MEDIUM','LOW'].indexOf(b.priority)).map((cfg) => (
                <tr key={cfg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-5 py-3">
                    <span className={`badge ${PRIORITY_COLORS[cfg.priority as Priority]}`}>
                      {PRIORITY_LABELS[cfg.priority as Priority]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatMinutes(cfg.responseTime)}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatMinutes(cfg.resolutionTime)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(cfg.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {!configs?.length && (
        <div className="card p-8 text-center">
          <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhuma configuração de SLA definida.</p>
          <Button className="mt-4" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            Criar Configuração
          </Button>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset(); }}
        title="Nova Configuração SLA"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); reset(); }}>Cancelar</Button>
            <Button loading={upsertMutation.isPending} onClick={handleSubmit((d) => upsertMutation.mutate(d))}>Salvar</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Select label="Tipo de Demanda" required options={TYPES} placeholder="Selecione" error={errors.demandType?.message} {...register('demandType', { required: 'Obrigatório' })} />
          <Select label="Prioridade" required options={PRIORITIES} placeholder="Selecione" error={errors.priority?.message} {...register('priority', { required: 'Obrigatório' })} />
          <Input label="Tempo de Resposta (minutos)" type="number" required hint="Ex: 60 = 1 hora" error={errors.responseTime?.message} {...register('responseTime', { required: 'Obrigatório', min: { value: 1, message: 'Mín. 1 minuto' } })} />
          <Input label="Tempo de Resolução (minutos)" type="number" required hint="Ex: 480 = 8 horas" error={errors.resolutionTime?.message} {...register('resolutionTime', { required: 'Obrigatório', min: { value: 1, message: 'Mín. 1 minuto' } })} />
        </form>
      </Modal>
    </div>
  );
}
