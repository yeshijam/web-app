/***************************************************************************
     * 8. OVERVIEW PAGE, PRESET SWITCHER, REFERENCE GRAPHICS & QUIZ MODAL
     ***************************************************************************/
    function applyDimensionPreset(presetKey) {
      const d = RCDC_CONFIG.activeDimensions;
      d.presetKey = presetKey;
      if (presetKey === 'drawing') {
        d.samplePadWidthMm = 20;
        d.absorbentPadWidthMm = 25;
      } else if (presetKey === 'procedure') {
        d.samplePadWidthMm = 25;
        d.absorbentPadWidthMm = 20;
      }

      const sampleSlider = document.getElementById('configSampleSlider');
      if (sampleSlider) sampleSlider.value = d.samplePadWidthMm;
      const sampleLabel = document.getElementById('configSampleLabel');
      if (sampleLabel) sampleLabel.textContent = `${d.samplePadWidthMm} mm`;
      const absorbSlider = document.getElementById('configAbsorbSlider');
      if (absorbSlider) absorbSlider.value = d.absorbentPadWidthMm;
      const absorbLabel = document.getElementById('configAbsorbLabel');
      if (absorbLabel) absorbLabel.textContent = `${d.absorbentPadWidthMm} mm`;

      const headerPresetText = document.getElementById('headerPresetText');
      if (headerPresetText) {
        headerPresetText.textContent = presetKey === 'drawing'
          ? 'Preset: Drawing (20/25mm*)'
          : presetKey === 'procedure'
          ? 'Preset: Procedure (25/20mm*)'
          : `Custom (${d.samplePadWidthMm}/${d.absorbentPadWidthMm}mm*)`;
      }

      // Highlight active button on Overview Page
      const btnDraw = document.getElementById('btnPresetDrawing');
      const btnProc = document.getElementById('btnPresetProcedure');
      if (btnDraw && btnProc) {
        btnDraw.className = presetKey === 'drawing'
          ? 'p-3 rounded-xl border-2 border-sky-600 bg-sky-50/70 text-left transition'
          : 'p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-left transition';
        btnProc.className = presetKey === 'procedure'
          ? 'p-3 rounded-xl border-2 border-sky-600 bg-sky-50/70 text-left transition'
          : 'p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-left transition';
      }

      rebuildStripGeometry();
      renderOverviewRefASvg();
      if (STATE.activePage === 'game') renderGameStepUI();
    }

    function toggleQuickPreset() {
      const next = RCDC_CONFIG.activeDimensions.presetKey === 'drawing' ? 'procedure' : 'drawing';
      applyDimensionPreset(next);
    }

    function updateLiveDimension(compId, val) {
      const num = parseFloat(val);
      const d = RCDC_CONFIG.activeDimensions;
      d.presetKey = 'custom';
      if (compId === 'sample_pad') {
        d.samplePadWidthMm = num;
        const sampleLabel = document.getElementById('configSampleLabel');
        if (sampleLabel) sampleLabel.textContent = `${num} mm`;
      } else if (compId === 'absorbent_pad') {
        d.absorbentPadWidthMm = num;
        const absorbLabel = document.getElementById('configAbsorbLabel');
        if (absorbLabel) absorbLabel.textContent = `${num} mm`;
      }
      const headerPresetText = document.getElementById('headerPresetText');
      if (headerPresetText) {
        headerPresetText.textContent = `Custom (${d.samplePadWidthMm}/${d.absorbentPadWidthMm}mm*)`;
      }
      rebuildStripGeometry();
      renderOverviewRefASvg();
      if (STATE.activePage === 'game') renderGameStepUI();
    }

    function renderOverviewPage() {
      // 1. Environmental Checklist
      const envContainer = document.getElementById('overviewEnvChecklist');
      if (envContainer) {
        envContainer.innerHTML = '';
        RCDC_CONFIG.environmentalConditions.forEach(item => {
          const checked = Boolean(STATE.checkedEnv[item.id]);
          const lbl = document.createElement('label');
          lbl.className = `flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
            checked ? 'bg-teal-50/70 border-teal-300 text-slate-900' : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
          }`;
          lbl.innerHTML = `
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleEnvCondition('${item.id}', this.checked)" class="mt-0.5 accent-teal-600 cursor-pointer"/>
            <div>
              <span class="font-semibold block">${item.label}</span>
              <span class="text-[11px] text-slate-500">${item.detail}</span>
            </div>
          `;
          envContainer.appendChild(lbl);
        });
      }

      // 2. Populate Component Functionality & Specifications Breakdown Cards
      const compListEl = document.getElementById('overviewComponentsList');
      if (compListEl) {
        compListEl.innerHTML = '';
        RCDC_CONFIG.components.forEach(comp => {
          const item = document.createElement('div');
          item.onclick = () => {
            selectComponent(comp.id);
            switchPage('explorer');
          };
          item.className = 'group cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-sky-400 bg-slate-50/70 hover:bg-sky-50/40 transition flex flex-col justify-between';
          item.innerHTML = `
            <div>
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-md font-mono-tech text-[11px] font-bold flex items-center justify-center bg-sky-800 text-white shrink-0">
                    ${comp.number}
                  </span>
                  <span class="w-3.5 h-3.5 rounded-sm border border-slate-400 shrink-0" style="background:${comp.colorHex}"></span>
                  <h4 class="font-bold text-xs text-slate-900 group-hover:text-sky-700">${comp.name}</h4>
                </div>
                <span class="font-mono-tech text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold shrink-0">
                  ${comp.drawingSpec}
                </span>
              </div>
              <p class="text-[11px] text-slate-600 leading-relaxed">${comp.functionDesc}</p>
            </div>
            <div class="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-mono-tech text-slate-500">
              <span>Proc: ${comp.procedureSpec}</span>
              <span class="text-sky-600 font-sans font-semibold group-hover:translate-x-0.5 transition-transform">3D View →</span>
            </div>
          `;
          compListEl.appendChild(item);
        });
      }

      // 3. Reference A Cross-Section SVG
      renderOverviewRefASvg();

      // 4. Reference Gallery (only if present)
      const gal = document.getElementById('overviewRefGallery');
      if (gal) {
        gal.innerHTML = '';
        ['RefA', 'RefB', 'RefC', 'RefD', 'RefE', 'RefF'].forEach(refKey => {
          const card = document.createElement('div');
          card.className = 'bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between';
          const thumbId = `galThumb_${refKey}`;
          const titleId = `galTitle_${refKey}`;
          const capId = `galCap_${refKey}`;
          card.innerHTML = `
            <div id="${thumbId}" class="w-full bg-slate-900 border-b border-slate-200"></div>
            <div class="p-3">
              <h4 id="${titleId}" class="font-bold text-xs text-slate-900"></h4>
              <p id="${capId}" class="text-[11px] text-slate-500 mt-1 leading-snug"></p>
            </div>
          `;
          gal.appendChild(card);
          renderReferenceGraphicInto(refKey, thumbId, titleId, capId);
        });
      }

      updateProgressBadges();
    }

    function toggleEnvCondition(id, checked) {
      STATE.checkedEnv[id] = checked;
      saveProgressToStorage();
      renderBenchWipeStatus();
      renderOverviewPage();
    }

    function checkAllEnvConditions() {
      RCDC_CONFIG.environmentalConditions.forEach(c => STATE.checkedEnv[c.id] = true);
      saveProgressToStorage();
      renderBenchWipeStatus();
      renderOverviewPage();
    }

    function renderOverviewRefASvg() {
      const container = document.getElementById('overviewRefASvgContainer');
      if (!container) return;
      const d = RCDC_CONFIG.activeDimensions;
      const scale = 7.6;
      const startX = 45;
      const totalW = d.backingLengthMm * scale;
      const absorbW = d.absorbentPadWidthMm * scale;
      const reactW = d.reactionFilmWidthMm * scale;
      const conjW = d.conjugatePadWidthMm * scale;
      const sampleW = d.samplePadWidthMm * scale;

      const rightEdgeX = startX + totalW;
      const conjLeftX = rightEdgeX - (18 * scale);
      const reactRightX = conjLeftX + (2 * scale);
      const reactLeftX = reactRightX - reactW;
      const sampleLeftX = rightEdgeX - sampleW;
      const ctlX = conjLeftX - (17 * scale) + 10;
      const tlX = conjLeftX - (13 * scale) + 10;

      container.innerHTML = `
        <svg viewBox="0 0 620 118" class="w-full h-24 select-none">
          <text x="${(ctlX + conjLeftX) / 2}" y="12" fill="#dc2626" font-size="9" font-weight="bold" text-anchor="middle">CTL: 17mm | TL: 13mm</text>
          <rect x="${startX}" y="52" width="${totalW}" height="9" fill="#7ab87a" stroke="#1e293b" stroke-width="1"/>
          <rect x="${reactLeftX}" y="44" width="${reactW}" height="8" fill="#f8fafc" stroke="#475569" stroke-width="1"/>
          <rect x="${ctlX - 2}" y="43" width="4" height="9" fill="#dc2626"/>
          <rect x="${tlX - 2}" y="43" width="4" height="9" fill="#dc2626"/>
          <rect x="${conjLeftX}" y="44" width="${conjW}" height="8" fill="#b84d9e"/>
          <rect x="${startX}" y="35" width="${absorbW}" height="10" fill="#dfd3c3" stroke="#78716c" stroke-width="1"/>
          <text x="${startX + absorbW / 2}" y="29" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">Absorbent (${d.absorbentPadWidthMm}mm*)</text>
          <rect x="${sampleLeftX}" y="35" width="${sampleW}" height="10" fill="#ffffff" stroke="#475569" stroke-width="1"/>
          <text x="${sampleLeftX + sampleW / 2}" y="29" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">Sample (${d.samplePadWidthMm}mm*)</text>
          <text x="${startX + totalW / 2}" y="78" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle">Backing Sheet (69 mm) • Positional Callouts: 44 mm | 18 mm | 10 mm</text>
        </svg>
      `;
    }

    function renderReferenceGraphicInto(refKey, viewportId, titleId, captionId) {
      const viewport = document.getElementById(viewportId);
      if (!viewport) return;

      const meta = {
        RefA: { title: "Reference A — Final Cut Strip Annotated Drawing", caption: "Post-cut arrangement showing Absorbent (25mm), Reaction film (30mm), CTL (17mm), TL (13mm), Conjugate (10mm), Sample (20mm), Backing (69mm)." },
        RefB: { title: "Reference B — 5 Materials Laid Out Before Assembly", caption: "[1] Green Backing Sheet, [2] White Membrane, [3] Purple/Pink Conjugate Pad, [4] Sample Pad, [5] Absorbent Pad." },
        RefC: { title: "Reference C — Backing Sheet & Membrane Placement", caption: "Steps 1–4: Pasting the 30 mm white membrane onto the green backing sheet." },
        RefD: { title: "Reference D — Conjugate Pad Placement", caption: "Steps 5–6: Aligning and sticking the 10 mm purple/pink conjugate pad." },
        RefE: { title: "Reference E — Sample Pad Placement", caption: "Steps 7–8: Aligning the white fibrous sample pad after removing the last seal." },
        RefF: { title: "Reference F — Absorbent Pad & Assembled Card", caption: "Steps 9–11: Pressing down the absorbent pad along the opposite edge." }
      }[refKey] || { title: refKey, caption: "" };

      if (titleId && document.getElementById(titleId)) document.getElementById(titleId).textContent = meta.title;
      if (captionId && document.getElementById(captionId)) document.getElementById(captionId).textContent = meta.caption;

      if (STATE.customRefImages[refKey]) {
        viewport.innerHTML = `<img src="${STATE.customRefImages[refKey]}" alt="${meta.title}" class="w-full h-36 object-contain bg-slate-950"/>`;
        return;
      }

      if (refKey === 'RefB') {
        viewport.innerHTML = `
          <svg viewBox="0 0 360 160" class="w-full h-36 bg-[#23272d]">
            <rect x="14" y="14" width="22" height="14" fill="#075985"/><text x="25" y="24" fill="#fff" font-size="9" text-anchor="middle">1</text>
            <rect x="44" y="10" width="295" height="22" fill="#b5e098"/>
            <rect x="14" y="44" width="22" height="14" fill="#075985"/><text x="25" y="54" fill="#fff" font-size="9" text-anchor="middle">2</text>
            <rect x="44" y="42" width="295" height="16" fill="#f8fafc"/>
            <rect x="14" y="72" width="22" height="14" fill="#075985"/><text x="25" y="82" fill="#fff" font-size="9" text-anchor="middle">3</text>
            <rect x="44" y="75" width="295" height="8" fill="#c066ad"/>
            <rect x="14" y="98" width="22" height="14" fill="#075985"/><text x="25" y="108" fill="#fff" font-size="9" text-anchor="middle">4</text>
            <rect x="44" y="96" width="295" height="16" fill="#cbd5e1"/>
            <rect x="14" y="126" width="22" height="14" fill="#075985"/><text x="25" y="136" fill="#fff" font-size="9" text-anchor="middle">5</text>
            <rect x="44" y="124" width="295" height="18" fill="#f1efe9"/>
          </svg>
        `;
      } else if (refKey === 'RefA') {
        viewport.innerHTML = `
          <svg viewBox="0 0 360 160" class="w-full h-36 bg-white">
            <text x="180" y="18" fill="#0f172a" font-size="9.5" font-weight="bold" text-anchor="middle">Ref A — Exploded &amp; Cross-Section Profile</text>
            <polygon points="25,52 325,62 332,56 32,46" fill="#7ab87a" stroke="#3f6212" stroke-width="0.7"/>
            <polygon points="30,36 125,40 130,35 35,31" fill="#dfd3c3" stroke="#78716c" stroke-width="0.7"/>
            <polygon points="118,44 242,48 247,44 123,40" fill="#f8fafc" stroke="#64748b" stroke-width="0.7"/>
            <polygon points="238,47 282,49 286,45 242,43" fill="#b84d9e"/>
            <polygon points="240,37 330,41 335,36 245,32" fill="#ffffff" stroke="#64748b" stroke-width="0.7"/>
            <rect x="25" y="114" width="305" height="7" fill="#7ab87a"/>
            <rect x="125" y="108" width="132" height="6" fill="#f8fafc" stroke="#64748b" stroke-width="0.7"/>
            <rect x="172" y="107" width="3.5" height="7" fill="#dc2626"/>
            <rect x="188" y="107" width="3.5" height="7" fill="#dc2626"/>
            <rect x="250" y="108" width="44" height="6" fill="#b84d9e"/>
            <rect x="25" y="101" width="110" height="7" fill="#dfd3c3" stroke="#78716c" stroke-width="0.7"/>
            <rect x="242" y="100" width="88" height="8" fill="#ffffff" stroke="#64748b" stroke-width="0.7"/>
            <text x="180" y="92" fill="#dc2626" font-size="8.5" font-weight="bold" text-anchor="middle">CTL: 17mm | TL: 13mm</text>
            <text x="180" y="142" fill="#0f172a" font-size="8.5" text-anchor="middle">69 mm Total • 44 mm • 18 mm • 10 mm</text>
          </svg>
        `;
      } else {
        const hasConj = refKey === 'RefD' || refKey === 'RefE' || refKey === 'RefF';
        const hasSamp = refKey === 'RefE' || refKey === 'RefF';
        const hasAbs = refKey === 'RefF';
        viewport.innerHTML = `
          <svg viewBox="0 0 360 160" class="w-full h-36 bg-[#22262b]">
            <rect x="65" y="10" width="260" height="140" fill="#333942" stroke="#64748b" stroke-width="1"/>
            <polygon points="150,22 195,20 225,135 172,138" fill="#a3d977"/>
            <polygon points="162,20 198,18 226,132 184,134" fill="#f8fafc"/>
            ${hasConj ? `<polygon points="155,22 164,21 188,134 178,135" fill="#d977be"/>` : ''}
            ${hasSamp ? `<polygon points="145,21 161,20 183,135 166,136" fill="#f1f5f9"/>` : ''}
            ${hasAbs ? `<polygon points="186,16 212,14 242,128 214,131" fill="#f5f3ef"/>` : ''}
            <ellipse cx="125" cy="30" rx="32" ry="13" fill="#38bdf8" opacity="0.9"/>
            <ellipse cx="145" cy="118" rx="44" ry="20" fill="#38bdf8" opacity="0.92"/>
            <text x="345" y="152" fill="#cbd5e1" font-size="8.5" font-family="monospace" text-anchor="end">${refKey}</text>
          </svg>
        `;
      }
    }

    function handleLocalRefImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      const refKey = document.getElementById('refOverrideSelect').value;
      const reader = new FileReader();
      reader.onload = (e) => {
        STATE.customRefImages[refKey] = e.target.result;
        renderOverviewPage();
      };
      reader.readAsDataURL(file);
    }

    // Knowledge Check Quiz Modal Handlers
    function openQuizModal() {
      renderQuizQuestions();
      document.getElementById('quizModal').classList.remove('hidden');
    }

    function closeQuizModal() {
      document.getElementById('quizModal').classList.add('hidden');
    }

    function renderQuizQuestions() {
      const container = document.getElementById('quizQuestionsContainer');
      container.innerHTML = '';
      let score = 0;

      RCDC_CONFIG.quizBank.forEach(q => {
        const ans = STATE.quizAnswers[q.id];
        const answered = ans !== undefined;
        if (answered && ans === q.correctIndex) score++;

        const card = document.createElement('div');
        card.className = 'bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between';

        let opts = '';
        q.options.forEach((optText, idx) => {
          let cls = 'bg-white hover:bg-sky-50 border-slate-300 text-slate-700';
          if (answered) {
            if (idx === q.correctIndex) cls = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold';
            else if (idx === ans) cls = 'bg-rose-50 border-rose-400 text-rose-900';
          }
          opts += `<button onclick="answerQuiz('${q.id}', ${idx})" class="w-full text-left p-2.5 rounded-xl border text-xs transition ${cls}">${optText}</button>`;
        });

        card.innerHTML = `
          <div>
            <h4 class="font-bold text-xs md:text-sm text-slate-900 mb-3">${q.question}</h4>
            <div class="space-y-2">${opts}</div>
          </div>
          ${answered ? `<div class="mt-3 p-2.5 rounded-xl text-xs ${ans === q.correctIndex ? 'bg-emerald-100/80 text-emerald-950' : 'bg-amber-100/80 text-amber-950'}"><strong>${ans === q.correctIndex ? '✓ Correct:' : 'ℹ Explanation:'}</strong> ${q.explanation}</div>` : ''}
        `;
        container.appendChild(card);
      });

      document.getElementById('quizScoreBadge').textContent = `Score: ${score} / ${RCDC_CONFIG.quizBank.length}`;
    }

    function answerQuiz(qId, idx) {
      STATE.quizAnswers[qId] = idx;
      saveProgressToStorage();
      renderQuizQuestions();
    }

    function resetQuiz() {
      STATE.quizAnswers = {};
      saveProgressToStorage();
      renderQuizQuestions();
    }

    