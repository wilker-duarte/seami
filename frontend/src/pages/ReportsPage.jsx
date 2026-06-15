import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Info, Printer, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getOccurrences, getAttendance } from '../supabaseClient';

const CLASSROOMS = ['Alegria', 'Carinho', 'União', 'Amizade', 'Felicidade'];
const ABSENCE_LIMIT = 10;

export default function ReportsPage() {
  const { isDark, students } = useAppContext();
  const activeStudents = students.filter(s => s.active !== false);

  const [occurrences, setOccurrences] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [filters, setFilters] = useState({
    justified: 'all',  // 'all' | 'sim' | 'nao'
    classroom: '',
    studentId: '',
    dateStart: '',
    dateEnd: ''
  });
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [occData, attData] = await Promise.all([
          getOccurrences(),
          getAttendance()
        ]);
        setOccurrences(occData || []);
        setAttendanceList(attData || []);
      } catch (err) {
        console.error('[ReportsPage] Erro ao carregar dados:', err);
      }
    };
    load();
  }, []);

  const setPreset = (days) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);
    setFilters(f => ({
      ...f,
      dateStart: past.toISOString().split('T')[0],
      dateEnd: today.toISOString().split('T')[0]
    }));
  };

  // Apenas faltas do caderno SEAMI (type === 'falta')
  const allAbsences = useMemo(() =>
    occurrences.filter(o => o.type === 'falta'),
    [occurrences]
  );

  // Lista filtrada
  const list = useMemo(() => {
    return allAbsences
      .filter(o => {
        const { justified, classroom, studentId, dateStart, dateEnd } = filters;
        if (justified === 'sim' && o.justified !== 'sim') return false;
        if (justified === 'nao' && o.justified === 'sim') return false;
        if (classroom && o.classroom !== classroom) return false;
        if (studentId && o.studentId !== studentId) return false;
        if (dateStart && o.date < dateStart) return false;
        if (dateEnd && o.date > dateEnd) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allAbsences, filters]);

  // Estatísticas da lista filtrada
  const justifiedCount = list.filter(o => o.justified === 'sim').length;
  const unjustifiedCount = list.filter(o => o.justified !== 'sim').length;

  // Total de faltas no ano atual (ignorando filtros de data/justificativa, mantendo sala/aluno)
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  const annualAbsences = useMemo(() => {
    return allAbsences.filter(o => {
      if (o.date < yearStart || o.date > yearEnd) return false;
      if (filters.classroom && o.classroom !== filters.classroom) return false;
      if (filters.studentId && o.studentId !== filters.studentId) return false;
      return true;
    });
  }, [allAbsences, filters.classroom, filters.studentId, yearStart, yearEnd]);

  const annualJustified = annualAbsences.filter(o => o.justified === 'sim').length;
  const annualUnjustified = annualAbsences.filter(o => o.justified !== 'sim').length;
  const annualTotal = annualAbsences.length;

  // Calcula faltas anuais por aluno (para alertas de limite)
  const studentAnnualMap = useMemo(() => {
    const map = {};
    allAbsences.forEach(o => {
      if (o.date >= yearStart && o.date <= yearEnd && o.studentId) {
        if (!map[o.studentId]) map[o.studentId] = { name: o.studentName, total: 0 };
        map[o.studentId].total++;
      }
    });
    return map;
  }, [allAbsences, yearStart, yearEnd]);

  const studentsOverLimit = Object.values(studentAnnualMap).filter(s => s.total >= ABSENCE_LIMIT);

  // Alunos filtrados pela sala selecionada
  const filteredStudents = useMemo(() =>
    activeStudents
      .filter(s => !filters.classroom || s.classroom === filters.classroom)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [activeStudents, filters.classroom]
  );

  // ── EXPORTAR EXCEL ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (list.length === 0) { alert('Não há dados para exportar.'); return; }
    if (typeof window.XLSX === 'undefined') { alert('Biblioteca SheetJS não carregada.'); return; }
    const mapped = list.map((occ, idx) => ({
      'Data Reg. Ausência': occ.date ? occ.date.split('-').reverse().join('/') : '-',
      'Criança': occ.studentName || '-',
      'Sala': occ.classroom || '-',
      'Motivo Declarado': occ.motive || '-',
      'Data de Início da Ausência': occ.startDate ? occ.startDate.split('-').reverse().join('/') : '-',
      'Data de Fim da Ausência': occ.endDate ? occ.endDate.split('-').reverse().join('/') : '-',
      'Dias': occ.days || '-',
      'Falta Justificada por Escrito?': occ.justified === 'sim' ? 'Sim' : 'Não',
      'Houve Aviso Prévio dos Pais?': occ.notified === 'sim' ? 'Sim' : 'Não',
      'Mensagem/Justificativa da Família': occ.obs || '-',
      'Responsável': occ.guardian || 'N/A',
      'Registrado por': occ.recordedBy || '-'
    }));
    const ws = window.XLSX.utils.json_to_sheet(mapped);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Faltas');
    const maxLens = {};
    mapped.forEach(row => Object.keys(row).forEach(k => { maxLens[k] = Math.max(maxLens[k] || 10, String(row[k]).length); }));
    ws['!cols'] = Object.keys(maxLens).map(k => ({ wch: maxLens[k] + 3 }));
    window.XLSX.writeFile(wb, `Relatorio_Faltas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── EXPORTAR PDF ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (list.length === 0) { alert('Não há dados para exportar.'); return; }
    if (typeof window.jspdf === 'undefined') { alert('Biblioteca jsPDF não carregada.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Cabeçalho
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 297, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('EducaGestão Portal Creche', 12, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Relatório de Gestão de Faltas (Justificadas e Não Justificadas)', 12, 24);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} | Total filtrado: ${list.length} | Justificadas: ${justifiedCount} | Não justificadas: ${unjustifiedCount}`, 12, 31);

    let y = 50;
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    const drawHeader = () => {
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 5, 277, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Data', 12, y);
      doc.text('Criança', 31, y);
      doc.text('Sala', 79, y);
      doc.text('Tipo de Falta', 99, y);
      doc.text('Justificativa / Motivo', 129, y);
      doc.text('Detalhes', 185, y);
      doc.text('Responsável', 241, y);
      y += 10;
      doc.setFont('helvetica', 'normal');
    };
    drawHeader();

    list.forEach(occ => {
      if (y > 188) { doc.addPage(); y = 20; drawHeader(); }
      const dateBR = occ.date ? occ.date.split('-').reverse().join('/') : '-';
      const tipoFalta = occ.justified === 'sim' ? 'Justificada' : 'Não Justificada';
      const nameTrunc = occ.studentName && occ.studentName.length > 22 ? occ.studentName.substring(0, 20) + '...' : (occ.studentName || '-');
      const justificativa = occ.motive ? (occ.motive.length > 26 ? occ.motive.substring(0, 24) + '...' : occ.motive) : '-';
      const detalhes = occ.obs ? (occ.obs.length > 26 ? occ.obs.substring(0, 24) + '...' : occ.obs) : '-';
      const guardian = occ.guardian ? (occ.guardian.length > 20 ? occ.guardian.substring(0, 18) + '...' : occ.guardian) : '-';

      // Cor por tipo
      if (occ.justified === 'sim') {
        doc.setTextColor(146, 64, 14); // âmbar
      } else {
        doc.setTextColor(153, 27, 27); // vermelho
      }
      doc.text(dateBR, 12, y);
      doc.setTextColor(30, 41, 59);
      doc.text(nameTrunc, 31, y);
      doc.text(occ.classroom || '-', 79, y);
      if (occ.justified === 'sim') {
        doc.setTextColor(146, 64, 14);
      } else {
        doc.setTextColor(153, 27, 27);
      }
      doc.text(tipoFalta, 99, y);
      doc.setTextColor(30, 41, 59);
      doc.text(justificativa, 129, y);
      doc.text(detalhes, 185, y);
      doc.text(guardian, 241, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(10, y + 3, 287, y + 3);
      y += 9;
    });

    doc.save(`Relatorio_Faltas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <section className="panel-section active">
      {/* ── FILTROS ──────────────────────────────────────────────────── */}
      <div className="filter-card">
        <div className="filter-card-header">
          <div className="filter-card-title">
            <Filter size={18} />
            <span>Relatório de Gestão de Faltas</span>
          </div>
          <div className="export-actions" style={{ display: 'flex', gap: '8px' }}>
            <button className="export-btn excel-btn" onClick={exportExcel}>📊 Exportar Excel</button>
            <button className="export-btn pdf-btn" onClick={exportPDF}>📄 Exportar PDF</button>
          </div>
        </div>

        <div className="filter-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {/* Tipo de falta */}
          <div className="filter-group">
            <label>Tipo de Falta</label>
            <select value={filters.justified} onChange={e => setFilters(f => ({ ...f, justified: e.target.value }))}>
              <option value="all">Todas as faltas</option>
              <option value="sim">Apenas Justificadas</option>
              <option value="nao">Apenas Não Justificadas</option>
            </select>
          </div>

          {/* Sala */}
          <div className="filter-group">
            <label>Sala / Turma</label>
            <select value={filters.classroom} onChange={e => setFilters(f => ({ ...f, classroom: e.target.value, studentId: '' }))}>
              <option value="">Todas as salas</option>
              {CLASSROOMS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Criança */}
          <div className="filter-group">
            <label>Criança</label>
            <select value={filters.studentId} onChange={e => setFilters(f => ({ ...f, studentId: e.target.value }))}>
              <option value="">Todas as crianças</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Data inicial */}
          <div className="filter-group">
            <label>Data Inicial</label>
            <input type="date" value={filters.dateStart} onChange={e => setFilters(f => ({ ...f, dateStart: e.target.value }))} />
          </div>

          {/* Data final */}
          <div className="filter-group">
            <label>Data Final</label>
            <input type="date" value={filters.dateEnd} onChange={e => setFilters(f => ({ ...f, dateEnd: e.target.value }))} />
          </div>
        </div>

        <div className="report-quick-presets">
          <span className="presets-title">Períodos Rápidos:</span>
          <button className="preset-btn" onClick={() => setPreset(7)}>Últimos 7 dias</button>
          <button className="preset-btn" onClick={() => setPreset(30)}>Últimos 30 dias</button>
          <button className="preset-btn" onClick={() => setPreset(90)}>Último Trimestre</button>
          <button className="preset-btn" onClick={() => setFilters(f => ({ ...f, dateStart: `${currentYear}-01-01`, dateEnd: `${currentYear}-12-31` }))}>Este Ano</button>
          <button className="preset-btn" style={{ color: 'var(--text-secondary)' }} onClick={() => setFilters({ justified: 'all', classroom: '', studentId: '', dateStart: '', dateEnd: '' })}>Limpar Filtros</button>
        </div>
      </div>

      {/* ── BANNER DE ESTATÍSTICAS ───────────────────────────────────── */}
      <div className="report-stats-banner" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {/* Faltas no filtro */}
        <div className="report-stat-item" style={{ borderLeft: '4px solid #ef4444' }}>
          <span className="report-stat-label">Faltas no Filtro</span>
          <span className="report-stat-val" style={{ color: '#b91c1c' }}>{list.length}</span>
        </div>
        <div className="report-stat-item" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span className="report-stat-label">✅ Justificadas</span>
          <span className="report-stat-val" style={{ color: '#92400e' }}>{justifiedCount}</span>
        </div>
        <div className="report-stat-item" style={{ borderLeft: '4px solid #ef4444' }}>
          <span className="report-stat-label">❌ Não Justificadas</span>
          <span className="report-stat-val" style={{ color: '#991b1b' }}>{unjustifiedCount}</span>
        </div>

        {/* Total anual */}
        <div className="report-stat-item" style={{ borderLeft: '4px solid #6366f1', backgroundColor: 'rgba(99,102,241,0.05)' }}>
          <span className="report-stat-label">📅 Total Ano {currentYear}</span>
          <span className="report-stat-val" style={{ color: '#4338ca' }}>{annualTotal}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {annualJustified} just. · {annualUnjustified} n/just.
          </span>
        </div>
        <div className="report-stat-item" style={{ borderLeft: '4px solid #10b981' }}>
          <span className="report-stat-label">Crianças Impactadas</span>
          <span className="report-stat-val text-primary">{new Set(list.map(o => o.studentId)).size}</span>
        </div>

        {/* Limite de 10 faltas */}
        {studentsOverLimit.length > 0 && (
          <div className="report-stat-item" style={{ borderLeft: '4px solid #dc2626', backgroundColor: 'rgba(239,68,68,0.07)', gridColumn: 'span 1' }}>
            <span className="report-stat-label" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={13} /> Limite de {ABSENCE_LIMIT} Faltas/Ano
            </span>
            <span className="report-stat-val" style={{ color: '#991b1b', fontSize: '22px' }}>{studentsOverLimit.length}</span>
            <span style={{ fontSize: '11px', color: '#b91c1c' }}>
              {studentsOverLimit.map(s => s.name).join(', ').length > 40
                ? studentsOverLimit.map(s => s.name).join(', ').substring(0, 38) + '...'
                : studentsOverLimit.map(s => s.name).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* ── TABELA ──────────────────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Criança</th>
                <th>Sala</th>
                <th>Tipo de Falta</th>
                <th>Justificativa / Motivo</th>
                <th>Responsável</th>
                <th>Faltas no Ano</th>
                <th>Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                    <Info size={32} style={{ margin: '0 auto 8px', color: 'var(--text-light)' }} />
                    Nenhuma falta encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                list.map(occ => {
                  const annualCount = studentAnnualMap[occ.studentId]?.total ?? 0;
                  const isOver = annualCount >= ABSENCE_LIMIT;
                  return (
                    <tr key={occ.id}>
                      <td><strong>{occ.date.split('-').reverse().join('/')}</strong></td>
                      <td style={{ fontWeight: 600 }}>{occ.studentName}</td>
                      <td>
                        <span className="occ-type-pill saida" style={{ backgroundColor: 'var(--color-saidas-bg)', color: 'var(--color-saidas)' }}>
                          {occ.classroom}
                        </span>
                      </td>
                      <td>
                        {occ.justified === 'sim' ? (
                          <span className="occ-type-pill" style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
                            ✅ Justificada
                          </span>
                        ) : (
                          <span className="occ-type-pill" style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                            ❌ Não Justificada
                          </span>
                        )}
                      </td>
                      <td style={{ maxWidth: '220px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {occ.motive || <em style={{ color: 'var(--text-light)' }}>Sem justificativa</em>}
                      </td>
                      <td>{occ.guardian || '-'}</td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          padding: '2px 10px',
                          borderRadius: '20px',
                          backgroundColor: isOver ? '#fef2f2' : (annualCount >= 7 ? '#fffbeb' : '#f0fdf4'),
                          color: isOver ? '#991b1b' : (annualCount >= 7 ? '#92400e' : '#166534'),
                          border: `1px solid ${isOver ? '#fca5a5' : (annualCount >= 7 ? '#fcd34d' : '#bbf7d0')}`
                        }}>
                          {annualCount}/{ABSENCE_LIMIT} {isOver ? '⚠️' : ''}
                        </span>
                      </td>
                      <td>
                        {(occ.signature || occ.filePreview) ? (
                          <button
                            className="status-pill active"
                            style={{ border: 'none', cursor: 'pointer' }}
                            onClick={() => { setActiveReceipt(occ); setIsReceiptModalOpen(true); }}
                          >
                            Ver
                          </button>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL COMPROVANTE ────────────────────────────────────────── */}
      {isReceiptModalOpen && activeReceipt && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Visualizar Comprovante Escolar</h2>
              <button className="modal-close-btn" onClick={() => setIsReceiptModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <h3>🧸 EducaGestão Creche</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comprovante de Registro de Falta</span>
                </div>
                <p style={{ margin: '6px 0' }}><strong>Tipo:</strong> {activeReceipt.justified === 'sim' ? '✅ Falta Justificada' : '❌ Falta Não Justificada'}</p>
                <p style={{ margin: '6px 0' }}><strong>Criança:</strong> {activeReceipt.studentName}</p>
                <p style={{ margin: '6px 0' }}><strong>Sala:</strong> {activeReceipt.classroom}</p>
                <p style={{ margin: '6px 0' }}><strong>Data:</strong> {activeReceipt.date?.split('-').reverse().join('/')}</p>
                {activeReceipt.motive && (
                  <p style={{ margin: '6px 0' }}><strong>Justificativa:</strong> {activeReceipt.motive}</p>
                )}
                {(activeReceipt.signature || activeReceipt.filePreview) && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'center' }}>
                    <img
                      src={activeReceipt.signature || activeReceipt.filePreview}
                      alt="Comprovante"
                      style={{ maxWidth: '100%', maxHeight: '120px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'white' }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setIsReceiptModalOpen(false)}>Fechar</button>
              <button type="button" className="primary-btn" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
