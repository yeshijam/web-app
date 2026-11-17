/***************************************************************************
     * 7. PAGE SWITCHER & CLEAN 3D EXPLORER HUD CONTROLLERS
     ***************************************************************************/
    function switchPage(pageName) {
      STATE.activePage = pageName;

      // Update Header Navigation Buttons
      document.querySelectorAll('.nav-page-btn').forEach(btn => {
        const isCurrent = btn.getAttribute('data-page') === pageName;
        btn.className = isCurrent
          ? 'nav-page-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 bg-sky-600 text-white shadow'
          : 'nav-page-btn px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 text-slate-300 hover:text-white';
      });

      // Show/Hide Dedicated Pages
      document.getElementById('pageOverview').classList.toggle('hidden', pageName !== 'overview');
      document.getElementById('page3DWorkspace').classList.toggle('hidden', pageName !== 'explorer' && pageName !== 'game');

      // Toggle Explorer HUD vs Game HUD inside 3D Workspace
      document.getElementById('explorerHud').classList.toggle('hidden', pageName !== 'explorer');
      document.getElementById('gameHud').classList.toggle('hidden', pageName !== 'game');

      const ws = document.getElementById('page3DWorkspace');

      if (pageName === 'explorer') {
        if (ws) {
          ws.classList.toggle('lab-viewport-light', !STATE.darkViewport);
          ws.classList.toggle('lab-viewport-dark', STATE.darkViewport);
        }
        onWindowResize();
        if (explorerGroup) explorerGroup.visible = true;
        if (gameBenchEnvironment) gameBenchEnvironment.visible = false;
        Object.values(assembledMeshes).forEach(m => m.visible = true);
        Object.values(gameAssembledMeshes).forEach(m => m.visible = false);
        Object.values(stagedGameMeshes).forEach(m => m.visible = false);
        Object.values(sealMeshes).forEach(s => s.visible = false);
        Object.values(exposedWhiteZones).forEach(w => w.visible = false);
        if (stripCutterMachineGroup) stripCutterMachineGroup.visible = false;
        if (cutStripsOutputGroup) cutStripsOutputGroup.children.forEach(ch => { ch.visible = false; });
        if (targetDropZoneMesh) targetDropZoneMesh.visible = false;
        setExplodeFactor(60);
        document.getElementById('explodeSlider').value = 60;
        setCameraPreset('isometric');
        selectComponent(STATE.selectedComponentId);
        renderExplorerBottomDock();
      } else if (pageName === 'game') {
        if (ws) {
          ws.classList.remove('lab-viewport-light');
          ws.classList.add('lab-viewport-dark');
        }
        onWindowResize();
        if (explorerGroup) explorerGroup.visible = false;
        if (gameBenchEnvironment) gameBenchEnvironment.visible = true;
        setGameCameraView('operator');
        renderGameStepUI();
        sync3DSceneForGameStep();
      } else if (pageName === 'overview') {
        renderOverviewPage();
      }
    }

    function setGameCameraView(viewMode) {
      if (!camera || !controls) return;
      if (viewMode === 'operator') {
        // Matches the operator viewpoint looking down at the black granite benchtop & right-side materials
        camera.position.set(6, 98, 74);
        controls.target.set(6, 0, 4);
      } else {
        camera.position.set(-15, 75, 65);
        controls.target.set(-15, 0, 4);
      }
      controls.update();
    }

    // 3D Explorer Helper Functions (Selection, Camera Presets, Explode Slider, Layer Visibility)
    function selectComponent(compId) {
      STATE.selectedComponentId = compId;
      const comp = RCDC_CONFIG.components.find(c => c.id === compId) || RCDC_CONFIG.components[0];

      const swatch = document.getElementById('expColorSwatch');
      if (swatch) swatch.style.backgroundColor = comp.colorHex;

      const title = document.getElementById('expTitle');
      if (title) title.textContent = `${comp.number}. ${comp.name}`;

      const badge = document.getElementById('expStatusBadge');
      if (badge) {
        if (comp.conflictNote) {
          badge.textContent = 'Dimension Conflict*';
          badge.className = 'text-[10px] font-mono-tech uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30';
        } else if (comp.provisionalNote) {
          badge.textContent = 'Provisional Label';
          badge.className = 'text-[10px] font-mono-tech uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30';
        } else {
          badge.textContent = 'Confirmed Source';
          badge.className = 'text-[10px] font-mono-tech uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        }
      }

      const warnBox = document.getElementById('expWarningBox');
      if (warnBox) {
        const noteText = comp.conflictNote || comp.provisionalNote;
        if (noteText) {
          warnBox.classList.remove('hidden');
          warnBox.textContent = noteText;
        } else {
          warnBox.classList.add('hidden');
        }
      }

      const dimProc = document.getElementById('expDimProc');
      if (dimProc) dimProc.textContent = comp.procedureSpec;

      const dimDraw = document.getElementById('expDimDraw');
      if (dimDraw) dimDraw.textContent = comp.drawingSpec;

      const desc = document.getElementById('expDescription');
      if (desc) desc.textContent = comp.functionDesc;

      renderReferenceGraphicInto(comp.refPhoto, 'expRefThumb', null, null);
      highlightSelectedMesh();
      renderExplorerBottomDock();
    }

    function highlightSelectedMesh() {
      Object.entries(assembledMeshes).forEach(([id, grp]) => {
        const wire = grp.getObjectByName('selectionWire');
        if (wire && wire.material) {
          if (id === STATE.selectedComponentId) {
            wire.material.color.setHex(0x38bdf8);
            wire.material.opacity = 0.95;
          } else {
            wire.material.color.setHex(0x475569);
            wire.material.opacity = 0.35;
          }
        }
      });
    }

    function toggleInspectorCard(show) {
      STATE.inspectorVisible = show;
      const card = document.getElementById('explorerFloatingInspector');
      const reopenBtn = document.getElementById('btnReopenInspector');
      if (card) card.classList.toggle('hidden', !show);
      if (reopenBtn) reopenBtn.classList.toggle('hidden', show);
    }

    function renderExplorerBottomDock() {
      const dock = document.getElementById('explorerBottomDock');
      if (!dock) return;
      dock.innerHTML = '';

      RCDC_CONFIG.components.forEach(comp => {
        const grp = assembledMeshes[comp.id];
        const isVis = grp ? grp.visible : true;
        const isSel = STATE.selectedComponentId === comp.id;

        const wrap = document.createElement('div');
        wrap.className = `flex items-center rounded-xl border text-xs transition overflow-hidden ${
          isSel
            ? 'bg-sky-600/90 border-sky-300 text-white shadow-md'
            : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
        }`;

        const selBtn = document.createElement('button');
        selBtn.className = 'px-2.5 py-1.5 flex items-center gap-1.5 font-medium';
        selBtn.onclick = () => {
          selectComponent(comp.id);
          toggleInspectorCard(true);
        };
        selBtn.innerHTML = `
          <span class="w-2.5 h-2.5 rounded-sm border border-white/50 shrink-0" style="background:${comp.colorHex}"></span>
          <span>${comp.number}. ${comp.shortLabel}</span>
        `;

        const visBtn = document.createElement('button');
        visBtn.className = `px-2 py-1.5 border-l border-slate-700/80 text-[11px] font-mono-tech ${
          isVis ? 'text-teal-300 hover:bg-slate-900/40' : 'text-rose-400 bg-slate-950/60'
        }`;
        visBtn.title = 'Toggle Layer Visibility';
        visBtn.textContent = isVis ? '👁' : '✕';
        visBtn.onclick = (e) => {
          e.stopPropagation();
          if (grp) {
            grp.visible = !grp.visible;
            renderExplorerBottomDock();
          }
        };

        wrap.appendChild(selBtn);
        wrap.appendChild(visBtn);
        dock.appendChild(wrap);
      });
    }

    function setCameraPreset(preset) {
      if (!camera || !controls) return;
      if (preset === 'isometric') {
        camera.position.set(26, 36, 78);
        controls.target.set(0, 1, 0);
      } else if (preset === 'side') {
        camera.position.set(0, 3, 92);
        controls.target.set(0, 1, 0);
      } else if (preset === 'top') {
        camera.position.set(0, 95, 0.1);
        controls.target.set(0, 0, 0);
      } else {
        camera.position.set(0, 44, 92);
        controls.target.set(0, 1, 0);
      }
      controls.update();
    }

    function setExplodeFactor(val) {
      const num = parseFloat(val) || 0;
      STATE.targetExplodeFactor = num / 100;
      const lbl = document.getElementById('explodeValLabel');
      if (lbl) lbl.textContent = `${Math.round(num)}%`;
    }

    function toggleMasterSheetMode() {
      STATE.isMasterSheetMode = !STATE.isMasterSheetMode;
      const btn = document.getElementById('btnToggleMaster');
      if (btn) {
        btn.textContent = STATE.isMasterSheetMode ? '30cm Master Card' : 'Cut Strip (69mm)';
      }
      rebuildStripGeometry();
    }

    function toggleLabels() {
      STATE.showLabels = !STATE.showLabels;
      const btn = document.getElementById('btnToggleLabels');
      if (btn) {
        btn.textContent = `3D Labels: ${STATE.showLabels ? 'ON' : 'OFF'}`;
        btn.className = STATE.showLabels
          ? 'px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 font-medium transition'
          : 'px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-medium transition';
      }
    }

    function toggleViewportTheme() {
      STATE.darkViewport = !STATE.darkViewport;
      const ws = document.getElementById('page3DWorkspace');
      if (ws) {
        ws.classList.toggle('lab-viewport-light', !STATE.darkViewport);
        ws.classList.toggle('lab-viewport-dark', STATE.darkViewport);
      }
    }

    function triggerConceptualFlowDemo() {
      SFX.pickup();
      // Dim TL & CTL lines at start of 2-stage flow demo so user watches them turn bright red as antigen-antibody complex binds
      if (explorerTlLineMesh) {
        explorerTlLineMesh.material.color.setHex(0xfca5a5);
        explorerTlLineMesh.scale.y = 0.6;
      }
      if (explorerCtlLineMesh) {
        explorerCtlLineMesh.material.color.setHex(0xfca5a5);
        explorerCtlLineMesh.scale.y = 0.6;
      }
      STATE.flowParticleProgress = 0;
    }

    