import React, { useRef, useState, useEffect } from 'react';

export default function SignaturePad({ onSave, onClear, id, label }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Ajusta o tamanho real do canvas com base no CSS renderizado
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 300;
      canvas.height = rect.height || 100;
      
      // Limpa e reseta estilos pós redimensionamento
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Tratamento para Toque (Mobile)
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    // Tratamento para Mouse
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    e.preventDefault();
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    // Dispara salvamento em tempo real (converte canvas para dataURL)
    if (onSave) {
      onSave(canvas.toDataURL());
    }
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="signature-wrapper">
      <label className="form-label">{label}</label>
      <div className="canvas-container" style={{ position: 'relative', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
        <canvas
          ref={canvasRef}
          id={id}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ width: '100%', height: '100px', display: 'block', cursor: 'crosshair' }}
        />
      </div>
      <button type="button" className="btn-clear-signature" onClick={handleClear} style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600 }}>
        Limpar Assinatura
      </button>
    </div>
  );
}
