
import React, { useEffect, useRef, useState } from 'react';
import topicData from './current_topic.json';
import { audioService } from './services/audioService';
import confetti from 'canvas-confetti';
const BRAND_NAME = "StatRevoltAI";

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(15000); // 15 seconds
  const confettiFiredRef = useRef(false);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    // Expose hooks for automation (capture_demo.js)
    (window as any).audioService = audioService;
    (window as any).startSorting = () => {
      console.log("Starting animation...");
      setIsStarted(true);
      audioService.resume();
    };

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Force High Resolution for 1080x1920 target
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let startTime: number | null = null;
    let animationFrame: number;
    let lastPlayedIndex = -1;

    const { timeline_labels, entities, topic, description } = topicData;
    const unit = (topicData as any).unit || "Value";
    const prefix = (topicData as any).value_prefix || "";
    const totalPoints = timeline_labels.length;

    const padding = { top: 520, bottom: 400, left: 180, right: 150 };

    (window as any).isSortingCompleted = false;

    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // --- CALCULATE PROGRESS INDICES ---
      const currentIndex = Math.min(Math.floor(progress * (totalPoints - 1)), totalPoints - 1);
      const subProgress = (progress * (totalPoints - 1)) - currentIndex;

      // Clear Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- DYNAMIC Y-AXIS SCALING ---
      const visibleEntitiesData = entities.map(e => {
        const currentPoints = e.values.slice(0, currentIndex + 2);
        return Math.max(...currentPoints);
      });
      const currentMaxVisible = Math.max(...visibleEntitiesData, 1);
      const targetMax = currentMaxVisible * 1.15;

      const currentMinVisible = Math.min(...entities.flatMap(e => e.values.slice(0, currentIndex + 1)));
      // BREATHING ROOM: Ensure the lowest line has some space from the X-axis (5% margin)
      const displayMin = currentMinVisible > 0 ? currentMinVisible * 0.95 : currentMinVisible * 1.05;
      const displayRange = Math.max(targetMax - displayMin, 1);

      // Draw Background Animated Year
      const currentLabel = timeline_labels[currentIndex];
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.font = 'bold 250px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(currentLabel), canvas.width / 2, canvas.height / 2 + 100);
      ctx.restore();

      // Draw Grid
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const y = padding.top + (canvas.height - padding.top - padding.bottom) * (i / 8);
        ctx.moveTo(padding.left, y);
        ctx.lineTo(canvas.width - padding.right, y);
      }
      ctx.stroke();

      // --- BRANDING (WATERMARK) ---
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Slightly more visible
      ctx.font = 'bold 45px "Plus Jakarta Sans", sans-serif'; // Slightly larger
      ctx.textAlign = 'center';
      // Raised position: Above the very bottom edge to be clearly visible
      ctx.fillText(BRAND_NAME, canvas.width / 2, canvas.height - 160);
      ctx.restore();

      // Draw MAIN AXES
      ctx.beginPath();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 6;
      ctx.lineCap = 'square';
      ctx.moveTo(padding.left, padding.top);
      ctx.lineTo(padding.left, canvas.height - padding.bottom);
      ctx.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
      ctx.stroke();

      // --- AXIS DESCRIPTIONS ---
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      const midY = padding.top + (canvas.height - padding.top - padding.bottom) / 2;
      ctx.save();
      ctx.translate(padding.left - 90, midY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(unit, 0, 0);
      ctx.restore();
      const midX = padding.left + (canvas.width - padding.left - padding.right) / 2;
      ctx.fillText("Timeline →", midX, canvas.height - padding.bottom + 120);

      // --- HEADER TEXT ---
      const maxWidth = canvas.width - 150;
      let currentY = 180;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 50px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      const titleWords = topic.split(' ');
      let titleLine = '';
      for (let n = 0; n < titleWords.length; n++) {
        const testLine = titleLine + titleWords[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          ctx.fillText(titleLine, canvas.width / 2, currentY);
          titleLine = titleWords[n] + ' ';
          currentY += 60;
        } else titleLine = testLine;
      }
      ctx.fillText(titleLine, canvas.width / 2, currentY);

      currentY += 45;
      ctx.fillStyle = '#aaa';
      ctx.font = 'italic 24px "Plus Jakarta Sans", sans-serif';
      const descWords = description.split(' ');
      let descLine = '';
      for (let n = 0; n < descWords.length; n++) {
        const testLine = descLine + descWords[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          ctx.fillText(descLine, canvas.width / 2, currentY);
          descLine = descWords[n] + ' ';
          currentY += 32;
        } else descLine = testLine;
      }
      ctx.fillText(descLine, canvas.width / 2, currentY);

      padding.top = Math.max(520, currentY + 120);

      // --- TOP LEGEND (CLEAN & ONE-WORD) ---
      const legendY = padding.top - 80;
      const totalLegendWidth = canvas.width - (padding.left + padding.right);
      const itemWidth = totalLegendWidth / entities.length;

      entities.forEach((entity, i) => {
        const currentVal = entity.values[currentIndex];
        let dVal = currentVal;
        if (currentIndex < totalPoints - 1) {
          dVal = currentVal + (entity.values[currentIndex + 1] - currentVal) * subProgress;
        }
        const x = padding.left + (i * itemWidth) + (itemWidth / 2);

        // Indicator
        ctx.beginPath();
        ctx.fillStyle = entity.color;
        ctx.arc(x - 80, legendY - 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // One-word name for legend
        const shortName = (entity as any).short_name ? (entity as any).short_name : entity.name.split(' ')[0];
        ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.textAlign = 'center';
        ctx.fillText(shortName.toUpperCase(), x, legendY - 35);

        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(prefix + Math.round(dVal).toLocaleString(), x, legendY);
      });

      // Year inside chart, just below legend
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 44px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(currentLabel), canvas.width / 2, padding.top - 10);
      ctx.restore();

      if (currentIndex > lastPlayedIndex && currentIndex < totalPoints) {
        audioService.playScan(progress * 100, '#00ffcc');
        lastPlayedIndex = currentIndex;
      }

      // X/Y Axis Labels
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      timeline_labels.forEach((label, idx) => {
        if (totalPoints > 15 && idx % 4 !== 0) return;
        const x = padding.left + (canvas.width - padding.left - padding.right) * (idx / (totalPoints - 1));
        ctx.fillText(String(label), x, canvas.height - padding.bottom + 65);
      });

      ctx.textAlign = 'right';
      for (let i = 0; i <= 8; i++) {
        const y = padding.top + (canvas.height - padding.top - padding.bottom) * (1 - i / 8);
        const val = displayMin + displayRange * (i / 8);
        let valStr = Math.round(val).toLocaleString();
        if (displayRange >= 1000000) valStr = (val / 1000000).toFixed(1) + 'M';
        else if (displayRange >= 1000) valStr = (val / 1000).toFixed(displayRange < 5000 ? 1 : 0) + 'k';
        ctx.fillText(prefix + valStr, padding.left - 25, y + 10);
      }

      // Lines
      entities.forEach((entity) => {
        ctx.beginPath();
        ctx.strokeStyle = entity.color;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.shadowColor = entity.color;
        ctx.shadowBlur = 15;
        for (let i = 0; i <= currentIndex; i++) {
          const x = padding.left + (canvas.width - padding.left - padding.right) * (i / (totalPoints - 1));
          const val = entity.values[i];
          const nVal = (val - displayMin) / displayRange;
          const y = canvas.height - padding.bottom - (nVal * (canvas.height - padding.top - padding.bottom));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          if (i === currentIndex && subProgress > 0 && i < totalPoints - 1) {
            const nextX = padding.left + (canvas.width - padding.left - padding.right) * ((i + 1) / (totalPoints - 1));
            const nextY = canvas.height - padding.bottom - (((entity.values[i + 1] - displayMin) / displayRange) * (canvas.height - padding.top - padding.bottom));
            ctx.lineTo(x + (nextX - x) * subProgress, y + (nextY - y) * subProgress);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Staggered Labels
      const sorted = entities.map(e => {
        const dVal = (currentIndex < totalPoints - 1) ? e.values[currentIndex] + (e.values[currentIndex + 1] - e.values[currentIndex]) * subProgress : e.values[currentIndex];
        const y = canvas.height - padding.bottom - (((dVal - displayMin) / displayRange) * (canvas.height - padding.top - padding.bottom));
        return { ...e, y, x: padding.left + (canvas.width - padding.left - padding.right) * progress, displayVal: dVal };
      }).sort((a, b) => a.y - b.y);

      let lastY = -9999;
      sorted.forEach(entity => {
        const text = `${entity.name}: ${prefix}${Math.round(entity.displayVal).toLocaleString()}`;
        ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
        const tWidth = ctx.measureText(text).width + 30;
        let lx = entity.x - tWidth / 2, ly = entity.y - 50;
        if (Math.abs(ly - lastY) < 50) ly = lastY + 50;
        lastY = ly;
        const maxR = canvas.width - padding.right;
        if (lx + tWidth > maxR) lx = maxR - tWidth;
        if (lx < padding.left) lx = padding.left;
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeStyle = entity.color;
        ctx.lineWidth = 2;
        ctx.fillRect(lx, ly, tWidth, 40);
        ctx.strokeRect(lx, ly, tWidth, 40);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(text, lx + tWidth / 2, ly + 28);
      });

      if (progress < 1 && isStarted) animationFrame = requestAnimationFrame(draw);
      else if (progress >= 1) {
        (window as any).isSortingCompleted = true;
        if (!confettiFiredRef.current) {
          confettiFiredRef.current = true;
          confetti({
            particleCount: 300,
            spread: 120,
            origin: { x: 0.5, y: 1 }
          });
          setTimeout(() => {
            confetti({
              particleCount: 200,
              spread: 100,
              origin: { x: 0.2, y: 0.8 }
            });
            confetti({
              particleCount: 200,
              spread: 100,
              origin: { x: 0.8, y: 0.8 }
            });
          }, 300);
        }
      }
    };

    if (isStarted) animationFrame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrame);
  }, [isStarted, duration]);

  return (
    <div style={{ background: '#050505', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
};

export default App;
