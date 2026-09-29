import React, { useEffect, useRef, useState } from 'react';
import topicData from './current_topic.json';
import { audioService } from './services/audioService';
import { drawBrandAvatar } from './src/utils/brandLogos';
import { MonotoneCubicSpline } from './src/utils/spline';
import { extractDramaEvents, DramaEvent } from './src/utils/dramaEvents';

const BRAND_NAME = "@StatRevoltAI";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ConfettiRibbon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  flutter: number;
  vFlutter: number;
  width: number;
  height: number;
  color: string;
  shape: 'ribbon' | 'strip' | 'sparkle' | 'circle';
  life: number;
  decay: number;
  gravity: number;
  drag: number;
  isMetallic?: boolean;
}

interface Shockwave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  alpha: number;
}

interface FloatingBadgeState {
  currentY: number;
  targetY: number;
  vy: number;
}

interface LeaderboardCardState {
  currentX: number;
  targetX: number;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration] = useState(14000); // 14 seconds for cinematic pacing
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    (window as any).audioService = audioService;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Fixed 9:16 Vertical HD resolution
    const W = 1080;
    const H = 1920;
    canvas.width = W;
    canvas.height = H;

    const { timeline_labels, entities, topic, description } = topicData;
    const unit = (topicData as any).unit || "Value";
    const prefix = (topicData as any).value_prefix || "";
    const totalPoints = timeline_labels.length;
    const totalSteps = Math.max(totalPoints - 1, 1);

    // Default vibrant cyber neon palette
    const defaultColors = [
      '#00f0ff', // Vivid Cyan
      '#dd1aff', // Neon Magenta
      '#ff8800', // Electric Amber
      '#2bf055', // Neon Mint
      '#a855f7', // Electric Purple
      '#ff3b30'  // Coral Red
    ];

    entities.forEach((entity, i) => {
      if (!entity.color || entity.color === 'Leave empty') {
        entity.color = defaultColors[i % defaultColors.length];
      }
    });

    // Stable global scale for Y axis
    const allValues = entities.flatMap(e => e.values);
    const globalMax = Math.max(...allValues, 1);
    const rawMin = Math.min(...allValues);
    const displayMin = rawMin < 0 ? rawMin * 1.1 : 0;
    const displayMax = globalMax * 1.15;
    const displayRange = Math.max(displayMax - displayMin, 1);

    // Layout margins - expanded for maximum curve drama
    const padding = {
      left: 135,
      right: 170, // Balanced right margin
      top: 530,   // Moved up to give curves 110px more vertical height!
      bottom: 350 // Clearance above axis labels
    };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;
    const chartBottom = H - padding.bottom;
    const chartTop = padding.top;

    // Build Monotone Spline for each entity
    const splineData = entities.map(entity => {
      const knots = entity.values.map((val, idx) => {
        const px = padding.left + (chartW * idx) / totalSteps;
        const py = chartBottom - ((val - displayMin) / displayRange) * chartH;
        return { x: px, y: py, val };
      });
      const spline = new MonotoneCubicSpline(knots);
      return { entity, knots, spline };
    });

    // Extract dynamic story/drama events
    const dramaEvents = extractDramaEvents(timeline_labels, entities, unit, prefix);

    // State tracking
    const badgeStates: { [name: string]: FloatingBadgeState } = {};
    const cardStates: { [name: string]: LeaderboardCardState } = {};
    let particles: Particle[] = [];
    let confettiList: ConfettiRibbon[] = [];
    let shockwaves: Shockwave[] = [];
    let hasExploded = false;
    let completionTimerStarted = false;
    let bgStars: { x: number; y: number; r: number; alpha: number; speed: number }[] = [];
    let lastPlayedStep = -1;
    let startTime: number | null = null;
    let animationFrame: number;

    const triggerConfettiBlast = (winnerX: number, winnerY: number, winnerColor: string) => {
      audioService.playComplete();

      // Clean, elegant palette: Gold, White, Cyan, Winner Color
      const palette = ['#ffd700', '#ffffff', '#00f0ff', winnerColor, '#ffb700'];

      // 1. Subtle Golden Sparkle at Winner Head (Small, clean, no blockage)
      for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 3;
        confettiList.push({
          x: winnerX,
          y: winnerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          flutter: Math.random() * Math.PI * 2,
          vFlutter: Math.random() * 0.2 + 0.1,
          width: 5,
          height: 7,
          color: palette[Math.floor(Math.random() * palette.length)],
          shape: 'sparkle',
          life: 1,
          decay: 0.015,
          gravity: 0.15,
          drag: 0.95,
          isMetallic: true
        });
      }

      // 2. GENTLE BOTTOM-LEFT CORNER CANNON (Small, tasteful, stays in footer zone)
      for (let i = 0; i < 35; i++) {
        const angle = -Math.PI * (0.32 + Math.random() * 0.2); // ~-60 deg
        const speed = Math.random() * 14 + 10;
        confettiList.push({
          x: 40 + Math.random() * 30,
          y: H - 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          flutter: Math.random() * Math.PI * 2,
          vFlutter: Math.random() * 0.2 + 0.1,
          width: Math.random() * 3 + 5,   // Small: 5-8px
          height: Math.random() * 4 + 7,  // Small: 7-11px
          color: palette[Math.floor(Math.random() * palette.length)],
          shape: 'ribbon',
          life: 1,
          decay: 0.012,
          gravity: 0.32,
          drag: 0.96,
          isMetallic: true
        });
      }

      // 3. GENTLE BOTTOM-RIGHT CORNER CANNON (Small, tasteful, stays in footer zone)
      for (let i = 0; i < 35; i++) {
        const angle = -Math.PI * (0.68 - Math.random() * 0.2); // ~-120 deg
        const speed = Math.random() * 14 + 10;
        confettiList.push({
          x: W - 40 - Math.random() * 30,
          y: H - 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          flutter: Math.random() * Math.PI * 2,
          vFlutter: Math.random() * 0.2 + 0.1,
          width: Math.random() * 3 + 5,   // Small: 5-8px
          height: Math.random() * 4 + 7,  // Small: 7-11px
          color: palette[Math.floor(Math.random() * palette.length)],
          shape: 'ribbon',
          life: 1,
          decay: 0.012,
          gravity: 0.32,
          drag: 0.96,
          isMetallic: true
        });
      }

      // 4. Subtle expanding gold ring around winner token
      shockwaves.push({
        x: winnerX,
        y: winnerY,
        r: 10,
        maxR: 120,
        color: '#ffd700',
        alpha: 0.8
      });
    };

    // Leaderboard cards layout geometry
    const numEntities = entities.length;
    const cardGap = 14;
    const totalHudW = W - 140;
    const cardW = Math.min(225, (totalHudW - (numEntities - 1) * cardGap) / numEntities);
    const cardH = 76;
    const hudTotalWidth = numEntities * cardW + (numEntities - 1) * cardGap;
    const hudStartX = (W - hudTotalWidth) / 2;

    entities.forEach((entity, i) => {
      const initialY = chartBottom - ((entity.values[0] - displayMin) / displayRange) * chartH;
      badgeStates[entity.name] = { currentY: initialY, targetY: initialY, vy: 0 };
      cardStates[entity.name] = {
        currentX: hudStartX + i * (cardW + cardGap),
        targetX: hudStartX + i * (cardW + cardGap)
      };
    });

    // Generate ambient background dust/stars
    for (let i = 0; i < 60; i++) {
      bgStars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.35 + 0.1,
        speed: Math.random() * 0.4 + 0.2
      });
    }

    // Number formatting helper ($1.2B, $450M, 15.2k)
    const formatValue = (val: number) => {
      const abs = Math.abs(val);
      if (abs >= 1_000_000_000) return prefix + (val / 1_000_000_000).toFixed(1) + 'B';
      if (abs >= 1_000_000) return prefix + (val / 1_000_000).toFixed(1) + 'M';
      if (abs >= 10_000) return prefix + (val / 1_000).toFixed(0) + 'k';
      if (abs >= 1_000) return prefix + (val / 1_000).toFixed(1) + 'k';
      return prefix + Math.round(val).toLocaleString();
    };

    (window as any).isSortingCompleted = false;

    // RENDER FUNCTION (Can be called in real-time or stepped deterministically)
    const renderScene = (easedProgress: number, rawProgress: number, timeMs: number) => {
      const fltStep = easedProgress * totalSteps;
      const currentYearIdx = Math.min(Math.floor(fltStep), totalSteps);
      const subYearProgress = fltStep - Math.floor(fltStep);
      const currentHeadX = padding.left + chartW * easedProgress;

      // ==========================================
      // 1. BACKGROUND & AMBIENT SCI-FI ATMOSPHERE
      // ==========================================
      // Deep obsidian radial gradient
      const bgGrad = ctx.createRadialGradient(W / 2, H * 0.45, 120, W / 2, H * 0.5, H * 0.88);
      bgGrad.addColorStop(0, '#0a1024');
      bgGrad.addColorStop(0.35, '#050814');
      bgGrad.addColorStop(0.8, '#03040a');
      bgGrad.addColorStop(1, '#010205');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Ambient drifting particles
      ctx.save();
      bgStars.forEach(s => {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = s.alpha * (0.8 + 0.2 * Math.sin(timeMs * 0.002 + s.x));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        s.y -= s.speed;
        if (s.y < 0) s.y = H;
      });
      ctx.restore();

      // Cyber Grid with perspective glow floor
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridCols = 8;
      for (let c = 0; c <= gridCols; c++) {
        const gx = padding.left + (chartW * c) / gridCols;
        ctx.beginPath();
        ctx.setLineDash([4, 8]);
        ctx.moveTo(gx, padding.top);
        ctx.lineTo(gx, chartBottom);
        ctx.stroke();
      }
      const gridRows = 6;
      for (let r = 0; r <= gridRows; r++) {
        const gy = padding.top + (chartH * r) / gridRows;
        ctx.beginPath();
        ctx.setLineDash([4, 8]);
        ctx.moveTo(padding.left, gy);
        ctx.lineTo(W - padding.right, gy);
        ctx.stroke();
      }
      ctx.restore();

      // Big Year Watermark in Center
      const activeYearLabel = timeline_labels[Math.min(currentYearIdx, totalPoints - 1)];
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.038)';
      ctx.font = '900 240px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(activeYearLabel), W / 2, padding.top + chartH * 0.48);
      ctx.restore();

      // ==========================================
      // 2. HEADER: TITLE & SUBTITLE
      // ==========================================
      ctx.save();
      // Category tag pill
      const categoryTag = "⚡ STATREVOLT INTELLIGENCE • BATTLE RECORD";
      ctx.font = '800 17px "Plus Jakarta Sans", sans-serif';
      const tagW = ctx.measureText(categoryTag).width + 36;
      const tagX = W / 2 - tagW / 2;
      const tagY = 115;

      const tagGrad = ctx.createLinearGradient(tagX, 0, tagX + tagW, 0);
      tagGrad.addColorStop(0, 'rgba(0, 240, 255, 0.18)');
      tagGrad.addColorStop(1, 'rgba(221, 26, 255, 0.18)');
      ctx.fillStyle = tagGrad;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, 34, 17);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(categoryTag, W / 2, tagY + 17);

      // Main Topic Title (Multi-line centered with glow)
      let titleY = 205;
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
      ctx.shadowColor = 'rgba(0, 240, 255, 0.25)';
      ctx.shadowBlur = 16;
      const words = topic.split(' ');
      let line = '';
      const maxTextW = W - 180;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        if (ctx.measureText(testLine).width > maxTextW && n > 0) {
          ctx.fillText(line.trim(), W / 2, titleY);
          line = words[n] + ' ';
          titleY += 54;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), W / 2, titleY);
      ctx.shadowBlur = 0;

      // Subtitle / Narrative context (Auto-wrapped, cleanly balanced)
      titleY += 36;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.64)';
      ctx.font = '400 20px "Plus Jakarta Sans", sans-serif';
      const descWords = description.split(' ');
      const descLines: string[] = [];
      let curLine = '';
      for (let n = 0; n < descWords.length; n++) {
        const testLine = curLine ? curLine + ' ' + descWords[n] : descWords[n];
        if (ctx.measureText(testLine).width > maxTextW) {
          descLines.push(curLine);
          curLine = descWords[n];
          if (descLines.length === 2) {
            // Last allowed line: append ellipsis if remaining
            curLine += '…';
            break;
          }
        } else {
          curLine = testLine;
        }
      }
      if (curLine && descLines.length < 2) {
        descLines.push(curLine);
      }

      descLines.forEach((l) => {
        ctx.fillText(l.trim(), W / 2, titleY);
        titleY += 28;
      });
      ctx.restore();

      // ==========================================
      // 3. TIMELINE PROGRESS TRACKER
      // ==========================================
      const timelinePillY = titleY + 22;
      const timelinePillW = 380;
      const timelinePillH = 46;
      const timelinePillX = W / 2 - timelinePillW / 2;

      ctx.save();
      // Glass pill
      ctx.fillStyle = 'rgba(12, 18, 36, 0.88)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(timelinePillX, timelinePillY, timelinePillW, timelinePillH, 23);
      ctx.fill();
      ctx.stroke();

      // Progress fill line inside pill
      const barPadding = 8;
      const totalBarW = timelinePillW - barPadding * 2;
      const curBarW = Math.max(4, totalBarW * easedProgress);
      const barGrad = ctx.createLinearGradient(timelinePillX + barPadding, 0, timelinePillX + timelinePillW - barPadding, 0);
      barGrad.addColorStop(0, '#00f0ff');
      barGrad.addColorStop(1, '#dd1aff');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(timelinePillX + barPadding, timelinePillY + timelinePillH - 8, curBarW, 4, 2);
      ctx.fill();

      // Glowing progress head
      ctx.beginPath();
      ctx.arc(timelinePillX + barPadding + curBarW, timelinePillY + timelinePillH - 6, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Text inside pill
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 23px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`YEAR: ${activeYearLabel}`, W / 2, timelinePillY + 21);
      ctx.restore();

      // ==========================================
      // 4. DYNAMIC SLIDING LEADERBOARD HUD
      // ==========================================
      const hudY = timelinePillY + timelinePillH + 24;

      // Evaluate current values for each entity along the spline
      const currentStats = splineData.map(({ entity, knots, spline }, i) => {
        const curY = spline.evalY(currentHeadX);
        // Inverse value from Y
        const normVal = (chartBottom - curY) / chartH;
        const curVal = displayMin + normVal * displayRange;
        return {
          entity,
          index: i,
          headX: currentHeadX,
          headY: curY,
          val: curVal,
          shortName: (entity as any).short_name || entity.name.split(' ')[0]
        };
      });

      // Rank order (Descending by value)
      const rankedStats = [...currentStats].sort((a, b) => b.val - a.val);

      // Update smooth target X positions for cards
      rankedStats.forEach((stat, rankIndex) => {
        const cardState = cardStates[stat.entity.name];
        cardState.targetX = hudStartX + rankIndex * (cardW + cardGap);
        // Smooth spring relaxation
        cardState.currentX += (cardState.targetX - cardState.currentX) * 0.18;
      });

      // Render cards
      currentStats.forEach((stat) => {
        const rank = rankedStats.findIndex(r => r.entity.name === stat.entity.name) + 1;
        const isLeader = rank === 1;
        const cardState = cardStates[stat.entity.name];
        const cx = cardState.currentX;

        ctx.save();
        // Glass Background
        ctx.fillStyle = isLeader ? 'rgba(18, 24, 46, 0.92)' : 'rgba(10, 15, 30, 0.82)';
        ctx.strokeStyle = isLeader ? '#ffd700' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = isLeader ? 2 : 1;
        if (isLeader) {
          ctx.shadowColor = 'rgba(255, 215, 0, 0.35)';
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.roundRect(cx, hudY, cardW, cardH, 12);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Rank indicator
        const rankBadgeColor = rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.4)';
        ctx.fillStyle = rankBadgeColor;
        ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(rank === 1 ? '👑 #1' : `#${rank}`, cx + 12, hudY + 26);

        // Circular Brand Avatar Token
        drawBrandAvatar(ctx, cx + 58, hudY + 23, 14, stat.entity.name, stat.shortName, stat.entity.color, {
          isLeader: false,
          glow: false
        });

        // Entity Name
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
        const displayLabel = stat.shortName.length > 9 ? stat.shortName.substring(0, 8) + '…' : stat.shortName;
        ctx.fillText(displayLabel, cx + 78, hudY + 28);

        // Live Value
        ctx.fillStyle = stat.entity.color;
        ctx.font = '800 22px "Fira Code", monospace';
        ctx.fillText(formatValue(stat.val), cx + 12, hudY + 60);
        ctx.restore();
      });

      // Sound Trigger on Step Advance
      if (currentYearIdx > lastPlayedStep && currentYearIdx < totalPoints) {
        audioService.playScan(easedProgress * 100, rankedStats[0].entity.color);
        lastPlayedStep = currentYearIdx;
      }

      // ==========================================
      // 5. AXES & TICKS
      // ==========================================
      // Y-Axis Ticks & Reference Guidelines
      ctx.save();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '600 20px "Fira Code", monospace';
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const norm = i / yTicks;
        const yVal = displayMin + norm * displayRange;
        const gy = chartBottom - norm * chartH;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, gy);
        ctx.lineTo(W - padding.right, gy);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillText(formatValue(yVal), padding.left - 20, gy);
      }

      // X-Axis Labels (Timeline years)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = '700 21px "Plus Jakarta Sans", sans-serif';
      const labelStep = totalPoints > 12 ? Math.ceil(totalPoints / 8) : 1;
      timeline_labels.forEach((label, idx) => {
        if (idx % labelStep !== 0 && idx !== totalPoints - 1) return;
        const gx = padding.left + (chartW * idx) / totalSteps;
        const isCurrent = idx === currentYearIdx;
        ctx.fillStyle = isCurrent ? '#00f0ff' : 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(String(label), gx, chartBottom + 20);
      });

      // Unit axis description
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
      ctx.translate(padding.left - 84, padding.top + chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(unit, 0, 0);
      ctx.restore();

      // ==========================================
      // 6. CONTINUOUS MONOTONE SPLINES & RUNNERS
      // ==========================================
      const sampleDensity = 140; // Dense evaluation points for silky smoothness

      splineData.forEach(({ entity, spline }, i) => {
        const stat = currentStats[i];
        const isLeader = rankedStats[0].entity.name === entity.name;

        // Build active curve samples up to currentHeadX
        const samples: { x: number; y: number }[] = [];
        const numSamples = Math.max(Math.floor(easedProgress * sampleDensity), 2);
        for (let s = 0; s <= numSamples; s++) {
          const sampleProg = (s / numSamples) * easedProgress;
          const sx = padding.left + chartW * sampleProg;
          const sy = spline.evalY(sx);
          samples.push({ x: sx, y: sy });
        }

        if (samples.length < 2) return;

        // A) Glowing Area Fill under curve
        ctx.save();
        const areaGrad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
        areaGrad.addColorStop(0, entity.color + (isLeader ? '38' : '22'));
        areaGrad.addColorStop(1, entity.color + '00');
        ctx.fillStyle = areaGrad;

        ctx.beginPath();
        ctx.moveTo(samples[0].x, chartBottom);
        ctx.lineTo(samples[0].x, samples[0].y);
        for (let s = 1; s < samples.length; s++) {
          ctx.lineTo(samples[s].x, samples[s].y);
        }
        ctx.lineTo(stat.headX, chartBottom);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // B) Wide Outer Neon Glow Stroke
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = entity.color;
        ctx.lineWidth = isLeader ? 16 : 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = entity.color;
        ctx.shadowBlur = isLeader ? 36 : 24;
        ctx.globalAlpha = isLeader ? 0.45 : 0.3;

        ctx.moveTo(samples[0].x, samples[0].y);
        for (let s = 1; s < samples.length; s++) {
          ctx.lineTo(samples[s].x, samples[s].y);
        }
        ctx.stroke();
        ctx.restore();

        // C) Crisp Core Neon Stroke
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = entity.color;
        ctx.lineWidth = isLeader ? 6.5 : 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = entity.color;
        ctx.shadowBlur = 14;
        ctx.moveTo(samples[0].x, samples[0].y);
        for (let s = 1; s < samples.length; s++) {
          ctx.lineTo(samples[s].x, samples[s].y);
        }
        ctx.stroke();

        // White-hot core highlight
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = isLeader ? 2.5 : 1.8;
        ctx.moveTo(samples[0].x, samples[0].y);
        for (let s = 1; s < samples.length; s++) {
          ctx.lineTo(samples[s].x, samples[s].y);
        }
        ctx.stroke();
        ctx.restore();

        // D) Dynamic Runner Head (Glowing Avatar Token)
        const avatarRadius = isLeader ? 24 : 20;

        // Expanding Shockwave Pulse
        const pulse = (timeMs % 1200) / 1200;
        ctx.save();
        ctx.beginPath();
        ctx.arc(stat.headX, stat.headY, avatarRadius + pulse * 20, 0, Math.PI * 2);
        ctx.strokeStyle = entity.color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = (1 - pulse) * (isLeader ? 0.9 : 0.6);
        ctx.stroke();
        ctx.restore();

        // Draw Avatar with Brand Logo
        drawBrandAvatar(ctx, stat.headX, stat.headY, avatarRadius, entity.name, stat.shortName, entity.color, {
          isLeader,
          glow: true
        });

        // Spawn comet tail particle jet
        const slope = spline.evalSlope(stat.headX);
        const speedMagnitude = Math.hypot(1, slope);
        if (Math.random() < 0.9) {
          particles.push({
            x: stat.headX - avatarRadius * 0.8,
            y: stat.headY,
            vx: -Math.random() * 5 - 2,
            vy: -slope * 2 + (Math.random() - 0.5) * 2.5,
            life: 1,
            maxLife: 0.8 + Math.random() * 0.4,
            size: Math.random() * 4 + 2,
            color: entity.color
          });
        }
      });

      // ==========================================
      // 7. PARTICLES (COMET TAILS & SPARKS)
      // ==========================================
      particles = particles.filter(p => p.life > 0.05);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.032;
        const currentLife = Math.max(0, p.life);
        const radius = Math.max(0.5, p.size * currentLife);

        ctx.save();
        ctx.globalAlpha = currentLife;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ==========================================
      // 8. FLOATING RUNNER BADGES WITH SOFT REPULSION
      // ==========================================
      // Sort items by current Y to perform collision resolution
      const sortedByY = [...currentStats].sort((a, b) => a.headY - b.headY);
      const minGap = 56;
      let lastOccupiedY = -9999;

      sortedByY.forEach(item => {
        let desiredY = item.headY;
        if (desiredY - lastOccupiedY < minGap) {
          desiredY = lastOccupiedY + minGap;
        }
        // Clamp so it never overlaps the bottom axis labels
        if (desiredY > chartBottom - 10) {
          desiredY = chartBottom - 10;
        }
        lastOccupiedY = desiredY;

        // Smooth spring physics for badge Y
        const bState = badgeStates[item.entity.name];
        bState.targetY = desiredY;
        const diff = bState.targetY - bState.currentY;
        bState.vy = (bState.vy + diff * 0.15) * 0.72; // Damped spring
        bState.currentY += bState.vy;
      });

      // Render Floating Badges
      currentStats.forEach(item => {
        const rank = rankedStats.findIndex(r => r.entity.name === item.entity.name) + 1;
        const isLeader = rank === 1;
        const badgeY = badgeStates[item.entity.name].currentY;

        ctx.save();
        const valueStr = formatValue(item.val);
        const labelText = `${item.shortName}: ${valueStr}`;
        ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
        const textW = ctx.measureText(labelText).width;
        const bW = textW + 48;
        const bH = 48;

        // Dynamic flip: if badge would exceed right edge, flip to left of runner head
        const flipToLeft = (item.headX + 30 + bW) > (W - 24);
        let badgeX = flipToLeft ? item.headX - bW - 28 : item.headX + 28;
        badgeX = Math.max(20, Math.min(W - bW - 20, badgeX));

        // Glass Capsule Background
        ctx.fillStyle = isLeader ? 'rgba(16, 22, 44, 0.94)' : 'rgba(10, 15, 30, 0.88)';
        ctx.strokeStyle = isLeader ? '#ffd700' : item.entity.color;
        ctx.lineWidth = isLeader ? 2 : 1.5;
        ctx.shadowColor = item.entity.color;
        ctx.shadowBlur = isLeader ? 18 : 12;

        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY - bH / 2, bW, bH, 12);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Rank Tag Pill inside badge
        ctx.fillStyle = isLeader ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.4)';
        ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`#${rank}`, badgeX + 12, badgeY);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 21px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(labelText, badgeX + 38, badgeY);

        // Thin Connector Line from runner head to badge
        ctx.beginPath();
        ctx.strokeStyle = item.entity.color + '66';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        if (flipToLeft) {
          ctx.moveTo(item.headX - 22, item.headY);
          ctx.lineTo(badgeX + bW, badgeY);
        } else {
          ctx.moveTo(item.headX + 22, item.headY);
          ctx.lineTo(badgeX, badgeY);
        }
        ctx.stroke();
        ctx.restore();
      });

      // ==========================================
      // 9. CONTINUOUS SCAN LINE
      // ==========================================
      ctx.save();
      const scanGrad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
      scanGrad.addColorStop(0, 'rgba(0, 240, 255, 0.0)');
      scanGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.45)');
      scanGrad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
      ctx.strokeStyle = scanGrad;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(currentHeadX, chartTop);
      ctx.lineTo(currentHeadX, chartBottom);
      ctx.stroke();
      ctx.restore();

      // ==========================================
      // 10. DRAMA / MILESTONE NOTIFICATION BANNER
      // ==========================================
      // Look for active drama event corresponding to current year
      const activeDrama = dramaEvents.find(ev => ev.yearIndex === currentYearIdx);
      if (activeDrama && subYearProgress < 0.85) {
        ctx.save();
        const bannerW = 720;
        const bannerH = 58;
        const bannerX = W / 2 - bannerW / 2;
        const bannerY = H - 290; // Dedicated lower-third broadcast band

        // Animated entry/exit opacity
        let bannerAlpha = 1;
        if (subYearProgress < 0.2) bannerAlpha = subYearProgress / 0.2;
        else if (subYearProgress > 0.7) bannerAlpha = (0.85 - subYearProgress) / 0.15;

        ctx.globalAlpha = Math.max(0, Math.min(1, bannerAlpha));

        // Glass banner background
        ctx.fillStyle = 'rgba(8, 12, 28, 0.94)';
        ctx.strokeStyle = activeDrama.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = activeDrama.color;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 16);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Badge Tag
        ctx.fillStyle = activeDrama.color;
        ctx.font = '800 17px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeDrama.badge, bannerX + 22, bannerY + 29);

        // Headline
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(activeDrama.headline, bannerX + 200, bannerY + 29);
        ctx.restore();
      }

      // ==========================================
      // 11. SHOCKWAVES & CONFETTI CELEBRATION BLAST
      // ==========================================
      // Update and draw Shockwaves
      shockwaves.forEach(sw => {
        sw.r += (sw.maxR - sw.r) * 0.08 + 6;
        sw.alpha *= 0.94;
        if (sw.alpha > 0.02) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          ctx.strokeStyle = sw.color;
          ctx.lineWidth = Math.max(1, 8 * sw.alpha);
          ctx.globalAlpha = sw.alpha;
          ctx.shadowColor = sw.color;
          ctx.shadowBlur = 24;
          ctx.stroke();
          ctx.restore();
        }
      });
      shockwaves = shockwaves.filter(sw => sw.alpha > 0.02);

      // Update and draw 3D Confetti Ribbons
      confettiList.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vx += Math.sin(timeMs * 0.005 + p.flutter) * 0.5; // Wind drift
        p.rotation += p.vRot;
        p.flutter += p.vFlutter;
        p.life -= p.decay;

        if (p.life > 0.02 && p.y < H + 50) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          // Realistic 3D ribbon flip
          const flipScale = Math.cos(p.flutter);
          ctx.scale(1, flipScale);
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
          ctx.fillStyle = p.color;

          if (p.isMetallic) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
          }

          if (p.shape === 'strip') {
            ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
          } else if (p.shape === 'sparkle') {
            ctx.beginPath();
            ctx.moveTo(0, -p.height / 2);
            ctx.lineTo(p.width / 3, 0);
            ctx.lineTo(0, p.height / 2);
            ctx.lineTo(-p.width / 3, 0);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 3);
            ctx.fill();
          }
          ctx.restore();
        }
      });
      confettiList = confettiList.filter(p => p.life > 0.02 && p.y < H + 60);

      // ==========================================
      // 12. FOOTER & BRANDING WATERMARK
      // ==========================================
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      ctx.font = '800 32px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 240, 255, 0.2)';
      ctx.shadowBlur = 10;
      ctx.fillText(BRAND_NAME, W / 2, H - 200);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText("Automated Data Intelligence • High-Precision Timeline Battle", W / 2, H - 165);
      ctx.restore();
    };

    // Deterministic frame rendering hook for Puppeteer export
    (window as any).seekToProgress = (progress: number) => {
      const clamped = Math.max(0, Math.min(1, progress));
      const eased = clamped < 0.5
        ? 2 * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
      renderScene(eased, clamped, clamped * duration);
    };

    // Live animation loop
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);

      // Smooth cubic easing
      const easedProgress = rawProgress < 0.5
        ? 2 * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

      renderScene(easedProgress, rawProgress, elapsed);

      if (rawProgress < 1 && isStarted) {
        animationFrame = requestAnimationFrame(animate);
      } else if (rawProgress >= 1) {
        if (!hasExploded) {
          hasExploded = true;
          // Calculate winner position
          const curHeadX = padding.left + chartW;
          const sorted = [...splineData].sort((a, b) => {
            const valA = a.entity.values[a.entity.values.length - 1];
            const valB = b.entity.values[b.entity.values.length - 1];
            return valB - valA;
          });
          const winner = sorted[0];
          const winnerY = winner.spline.evalY(curHeadX);
          triggerConfettiBlast(curHeadX, winnerY, winner.entity.color);
        }
        animationFrame = requestAnimationFrame(animate);
        if (!completionTimerStarted) {
          completionTimerStarted = true;
          setTimeout(() => {
            (window as any).isSortingCompleted = true;
          }, 3200);
        }
      }
    };

    (window as any).startSorting = () => {
      console.log("Starting StatRevolt animation...");
      setIsStarted(true);
      audioService.resume();
    };

    if (isStarted) {
      animationFrame = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [isStarted, duration]);

  return (
    <div style={{ background: '#010205', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
};

export default App;
