import React, { useState, useEffect } from 'react';
import { Filter, Info, Download, Printer } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getOccurrences } from '../supabaseClient';

const CLASSROOMS = ['Alegria', 'Carinho', 'União', 'Amizade', 'Felicidade'];

export default function ReportsPage() {
  const { isDark } = useAppContext();

  const [occurrences, setOccurrences] = useState([]);
  const [filters, setFilters] = useState({ type: 'all', classroom: '', dateStart: '', dateEnd: '' });
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const occData = await getOccurrences();
        setOccurrences(occData || []);
      } catch (err) {
        console.error('[ReportsPage] Erro ao carregar ocorrências:', err);
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

  const list = occurrences
    .filter(o => {
      const { type, classroom, dateStart, dateEnd } = filters;
      if (type !== 'all' && o.type !== type) return false;
      if (classroom && o.classroom !== classroom) return false;
      if (dateStart && o.date < dateStart) return false;
      if (dateEnd && o.date > dateEnd) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const exportExcel = () => {
    if (list.length === 0) { alert('Não há dados para exportar.'); return; }
    if (typeof window.XLSX === 'undefined') { alert('Biblioteca SheetJS não carregada.'); return; }
    const mapped = list.map((occ, idx) => {
      let details = '';
      if (occ.type === 'atraso') details = `Chegada: ${occ.time} - ${occ.motive} (Justificado: ${occ.justified === 'sim' ? 'Sim' : 'Não'})`;
      else if (occ.type === 'saida') details = `Saída: ${occ.time} - ${occ.motive}`;
      else if (occ.type === 'atestado') details = `Afastado de ${occ.startDate} a ${occ.endDate} (${occ.days}d) CID ${occ.cid}`;
      else if (occ.type === 'falta') details = `${occ.motive} (Justificada: ${occ.justified === 'sim' ? 'Sim' : 'Não'})`;
      else if (occ.type === 'amamentacao') details = `Quantidade: ${occ.quantity ?? '-'}`;
      return {
        'Nº': idx + 1,
        'Data': occ.date.split('-').reverse().join('/'),
        'Criança': occ.studentName,
        'Sala': occ.classroom,
        'Tipo': occ.type.toUpperCase(),
        'Detalhes': details,
        'Responsável': occ.guardian || 'N/A'
      };
    });
    const ws = window.XLSX.utils.json_to_sheet(mapped);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Ocorrências');
    const maxLens = {};
    mapped.forEach(row => Object.keys(row).forEach(k => { maxLens[k] = Math.max(maxLens[k] || 10, String(row[k]).length); }));
    ws['!cols'] = Object.keys(maxLens).map(k => ({ wch: maxLens[k] + 3 }));
    window.XLSX.writeFile(wb, `Relatorio_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    if (list.length === 0) { alert('Não há dados para exportar.'); return; }
    if (typeof window.jspdf === 'undefined') { alert('Biblioteca jsPDF não carregada.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('EducaGestão Portal Creche', 15, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Relatório Geral Consolidado de Frequência e Ocorrências', 15, 25);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} | Registros: ${list.length}`, 15, 30);
    let y = 50;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const drawHeader = () => {
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 5, 190, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Data', 12, y);
      doc.text('Criança', 35, y);
      doc.text('Sala', 85, y);
      doc.text('Tipo', 115, y);
      doc.text('Detalhes', 145, y);
      y += 10;
      doc.setFont('helvetica', 'normal');
    };
    drawHeader();
    list.forEach(occ => {
      if (y > 275) { doc.addPage(); y = 20; drawHeader(); }
      const dateBR = occ.date.split('-').reverse().join('/');
      let details = '';
      if (occ.type === 'atraso') details = `Chegada ${occ.time} (${occ.justified === 'sim' ? 'Justif.' : 'Não Justif.'})`;
      else if (occ.type === 'saida') details = `Saída ${occ.time}`;
      else if (occ.type === 'atestado') details = `(${occ.days}d) CID ${occ.cid}`;
      else if (occ.type === 'falta') details = occ.justified === 'sim' ? 'Justificada' : 'Sem Justif.';
      else if (occ.type === 'amamentacao') details = `Qtd: ${occ.quantity ?? '-'}`;
      const nameTrunc = occ.studentName.length > 22 ? occ.studentName.substring(0, 20) + '...' : occ.studentName;
      doc.text(dateBR, 12, y);
      doc.text(nameTrunc, 35, y);
      doc.text(occ.classroom, 85, y);
      doc.text(occ.type.toUpperCase(), 115, y);
      doc.text(details, 145, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(10, y + 3, 200, y + 3);
      y += 9;
    });
    doc.save(`Relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <section className="panel-section active">
      <div className="filter-card">
        <div className="filter-card-header">
          <div className="filter-card-title">
            <Filter size={18} />
            <span>Gerador de Relatórios Consolidados</span>
          </div>
          <div className="export-actions" style={{ display: 'flex', gap: '8px' }}>
            <button className="export-btn excel-btn" onClick={exportExcel}>📊 Exportar Excel</button>
            <button className="export-btn pdf-btn" onClick={exportPDF}>📄 Exportar PDF</button>
          </div>
        </div>
        <div className="filter-grid">
          <div className="filter-group">
            <label>Tipo de Ocorrência</label>
            <select value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}>
              <option value="all">Todas as ocorrências</option>
              <option value="atraso">Atrasos</option>
              <option value="saida">Saídas Antecipadas</option>
              <option value="atestado">Atestados Médicos</option>
              <option value="falta">Faltas</option>
              <option value="amamentacao">Sala de Amamentação</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Sala / Turma</label>
            <select value={filters.classroom} onChange={(e) => setFilters(f => ({ ...f, classroom: e.target.value }))}>
              <option value="">Todas as salas</option>
              {CLASSROOMS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Data Inicial</label>
            <input type="date" value={filters.dateStart} onChange={(e) => setFilters(f => ({ ...f, dateStart: e.target.value }))} />
          </div>
          <div className="filter-group">
            <label>Data Final</label>
            <input type="date" value={filters.dateEnd} onChange={(e) => setFilters(f => ({ ...f, dateEnd: e.target.value }))} />
          </div>
        </div>
        <div className="report-quick-presets">
          <span className="presets-title">Períodos Rápidos:</span>
          <button className="preset-btn" onClick={() => setPreset(7)}>Últimos 7 dias</button>
          <button className="preset-btn" onClick={() => setPreset(30)}>Últimos 30 dias</button>
          <button className="preset-btn" onClick={() => setPreset(90)}>Último Trimestre</button>
          <button className="preset-btn" onClick={() => setPreset(365)}>Este Ano</button>
        </div>
      </div>

      <div className="report-stats-banner">
        <div className="report-stat-item">
          <span className="report-stat-label">Total de Ocorrências</span>
          <span className="report-stat-val">{list.length}</span>
        </div>
        <div className="report-stat-item">
          <span className="report-stat-label">Crianças Impactadas</span>
          <span className="report-stat-val text-primary">{new Set(list.map(o => o.studentId)).size}</span>
        </div>
        <div className="report-stat-item">
          <span className="report-stat-label">Média Diária</span>
          <span className="report-stat-val text-warning">{(list.length / 30).toFixed(1)}</span>
        </div>
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Criança</th>
                <th>Sala</th>
                <th>Tipo</th>
                <th>Detalhes</th>
                <th>Responsável</th>
                <th>Comprovante</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                    <Info size={32} style={{ margin: '0 auto 8px', color: 'var(--text-light)' }} />
                    Nenhuma ocorrência correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                list.map(occ => (
                  <tr key={occ.id}>
                    <td><strong>{occ.date.split('-').reverse().join('/')}</strong></td>
                    <td style={{ fontWeight: 600 }}>{occ.studentName}</td>
                    <td><span className="occ-type-pill saida" style={{ backgroundColor: 'var(--color-saidas-bg)', color: 'var(--color-saidas)' }}>{occ.classroom}</span></td>
                    <td><span className={`occ-type-pill ${occ.type}`}>{occ.type.toUpperCase()}</span></td>
                    <td>
                      {occ.type === 'atraso' && `Chegou às ${occ.time} - ${occ.motive} (Justificado: ${occ.justified === 'sim' ? 'Sim' : 'Não'})`}
                      {occ.type === 'saida' && `Saída às ${occ.time} - ${occ.motive}`}
                      {occ.type === 'atestado' && `Afastado de ${occ.startDate?.split('-').reverse().join('/')} a ${occ.endDate?.split('-').reverse().join('/')} (${occ.days}d)`}
                      {occ.type === 'falta' && `${occ.motive} - ${occ.justified === 'sim' ? 'Justificada' : 'Sem Justif.'}`}
                      {occ.type === 'amamentacao' && `Quantidade: ${occ.quantity ?? '-'}${occ.obs ? ' | ' + occ.obs : ''}`}
                    </td>
                    <td>{occ.guardian || '-'}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Comprovante */}
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
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comprovante de Registro Único de Ocorrência</span>
                </div>
                <p style={{ margin: '6px 0' }}><strong>Tipo:</strong> {activeReceipt.type?.toUpperCase()}</p>
                <p style={{ margin: '6px 0' }}><strong>Criança:</strong> {activeReceipt.studentName}</p>
                <p style={{ margin: '6px 0' }}><strong>Sala:</strong> {activeReceipt.classroom}</p>
                <p style={{ margin: '6px 0' }}><strong>Data:</strong> {activeReceipt.date?.split('-').reverse().join('/')}</p>
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
