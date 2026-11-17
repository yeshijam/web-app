/***************************************************************************
     * 5. GUIDED ASSEMBLY GAME PROGRESSION & 3D WORKBENCH STATE
     ***************************************************************************/
    function sync3DSceneForGameStep() {
      const s = STATE.currentGameStep;
      const isStepComplete = step => STATE.completedSteps[step] === true;
      const totalSteps = RCDC_CONFIG.assemblySteps.length;
      const allStepsDone = isStepComplete(totalSteps) && s === totalSteps;
      const gCoords = computeGameBenchCoordinates();

      // Keep the model tied to completed work, even when the user browses other steps.
      const placedParts = {
        backing_sheet: isStepComplete(1),
        reaction_film: isStepComplete(3),
        conjugate_pad: isStepComplete(5),
        sample_pad: isStepComplete(7),
        absorbent_pad: isStepComplete(8)
      };
      Object.entries(placedParts).forEach(([id, isPlaced]) => {
        if (gameAssembledMeshes[id]) gameAssembledMeshes[id].visible = isPlaced;
        if (stagedGameMeshes[id]) {
          stagedGameMeshes[id].visible = !isPlaced;
          resetStagedMeshPosition(stagedGameMeshes[id]);
        }
      });

      // Peeled adhesive zones remain visible; unpeeled liners stay on the backing.
      const sealStates = [
        { key: 'seal1', backingStep: 1, peelStep: 2 },
        { key: 'seal2', backingStep: 3, peelStep: 4 },
        { key: 'seal3', backingStep: 5, peelStep: 6 }
      ];
      sealStates.forEach(({ key, backingStep, peelStep }) => {
        const isPeeled = isStepComplete(peelStep);
        if (exposedWhiteZones[key]) exposedWhiteZones[key].visible = isPeeled;
        if (sealMeshes[key]) {
          sealMeshes[key].visible = isStepComplete(backingStep) && !isPeeled;
          deformSealMeshForPeel(sealMeshes[key], 0);
        }
      });

      // Size and place the glowing drop target for the current action.
      if (targetDropZoneMesh) {
        targetDropZoneMesh.visible = !allStepsDone;
        let targetSpec = { w: gCoords.assembled.backing_sheet.w, x: gCoords.assembled.backing_sheet.x, y: gCoords.assembled.backing_sheet.y };
        if (s === 2) targetSpec = { w: gCoords.seals.seal1.w, x: gCoords.seals.seal1.x, y: 0.95 };
        else if (s === 3) targetSpec = gCoords.assembled.reaction_film;
        else if (s === 4) targetSpec = { w: gCoords.seals.seal2.w, x: gCoords.seals.seal2.x, y: 0.95 };
        else if (s === 5) targetSpec = gCoords.assembled.conjugate_pad;
        else if (s === 6) targetSpec = { w: gCoords.seals.seal3.w, x: gCoords.seals.seal3.x, y: 0.95 };
        else if (s === 7) targetSpec = gCoords.assembled.sample_pad;
        else if (s === 8) targetSpec = gCoords.assembled.absorbent_pad;

        targetDropZoneMesh.geometry.dispose();
        targetDropZoneMesh.geometry = new THREE.BoxGeometry(targetSpec.w + 0.8, 1.5, gCoords.stripLengthZ + 1.0);
        targetDropZoneMesh.position.set(targetSpec.x, targetSpec.y + 0.35, gCoords.asmCenterZ);
      }

      // Show the Programmable Strip Cutter Machine on the right side of the benchtop once all 8 steps are complete
      if (stripCutterMachineGroup) {
        stripCutterMachineGroup.visible = Boolean(STATE.completedSteps[8]);
      }
      if (cutterFeedDropZoneMesh) {
        cutterFeedDropZoneMesh.visible = Boolean(STATE.completedSteps[8]) && STATE.cutterProgress < 0;
      }
      if (assembledMasterCardGroup && STATE.cutterProgress < 0 && !STATE.isDraggingAssembledCard) {
        assembledMasterCardGroup.visible = true;
        assembledMasterCardGroup.position.set(0, 0, 0);
        assembledMasterCardGroup.scale.set(1, 1, 1);
      }
    }

    function renderGameStepUI() {
      const totalSteps = RCDC_CONFIG.assemblySteps.length;
      const stepObj = RCDC_CONFIG.assemblySteps[STATE.currentGameStep - 1];
      const isStep8Done = (STATE.currentGameStep === totalSteps && Boolean(STATE.completedSteps[totalSteps]));

      document.getElementById('gameStepBadge').textContent = isStep8Done
        ? `ALL 8 STEPS COMPLETE ✓`
        : `STEP ${stepObj.step} OF ${totalSteps}`;
      document.getElementById('gameStepActionType').textContent = isStep8Done ? 'DRAG TO CUTTER MACHINE' : stepObj.actionType;
      document.getElementById('gameStepInstruction').textContent = `${stepObj.step}. ${stepObj.instruction}`;
      document.getElementById('gameStepHint').textContent = isStep8Done
        ? `🎉 Assembly complete! Now grab the assembled 30 cm master card on the left work mat and drag it into the glowing Strip Cutter Machine on the benchtop!`
        : `👉 ${stepObj.hint}`;
      document.getElementById('btnGamePrev').disabled = (STATE.currentGameStep === 1);

      const d = RCDC_CONFIG.activeDimensions;
      const dockNote = document.getElementById('gameDockPresetNote');
      if (dockNote) {
        dockNote.textContent = `Samp:${d.samplePadWidthMm}mm / Abs:${d.absorbentPadWidthMm}mm*`;
      }

      // Show the Post-Assembly Programmable Strip Cutter Machine Panel once Step 8 is completed
      const cutterPanel = document.getElementById('gameCutterPanel');
      if (cutterPanel) {
        cutterPanel.classList.toggle('hidden', !Boolean(STATE.completedSteps[8]));
      }

      // Update Reference Photo inside Top-Left Mission Card
      renderReferenceGraphicInto(stepObj.refPhoto, 'gameRefViewport', 'gameRefTitle', 'gameRefCaption');

      // Render 10-Step Progress Dots
      const dotsEl = document.getElementById('gameStepDots');
      dotsEl.innerHTML = '';
      for (let i = 1; i <= totalSteps; i++) {
        const dot = document.createElement('button');
        const isCurr = (i === STATE.currentGameStep);
        const isDone = Boolean(STATE.completedSteps[i]);
        dot.className = `h-2 flex-1 rounded-full transition ${
          isCurr ? 'bg-sky-400 ring-2 ring-sky-300/50' : isDone ? 'bg-teal-500' : 'bg-slate-700 hover:bg-slate-600'
        }`;
        dot.title = `Go to Step ${i}`;
        dot.onclick = () => {
          if (STATE.stepTransitionLock || STATE.peelAnimProgress >= 0) return;
          clearTimeout(stepAdvanceTimer);
          STATE.currentGameStep = i;
          renderGameStepUI();
          sync3DSceneForGameStep();
        };
        dotsEl.appendChild(dot);
      }

      // Render Right-Side Vertical Stack of Draggable Components [1]–[5] & Bench Tools
      const trayEl = document.getElementById('gameDragTray');
      trayEl.innerHTML = '';
      RCDC_CONFIG.gameTrayItems.forEach(item => {
        const isTarget = (item.id === stepObj.requiredItem);

        // Check if this strip has already been placed on the mat
        const alreadyPlaced =
          (item.id === 'backing_sheet' && STATE.currentGameStep > 1) ||
          (item.id === 'reaction_film' && STATE.currentGameStep > 3) ||
          (item.id === 'conjugate_pad' && STATE.currentGameStep > 5) ||
          (item.id === 'sample_pad' && STATE.currentGameStep > 7) ||
          (item.id === 'absorbent_pad' && Boolean(STATE.completedSteps[8]));

        const card = document.createElement('div');
        card.onpointerdown = (e) => startTrayCardDrag(e, item.id);
        card.className = `cursor-grab active:cursor-grabbing p-2.5 rounded-xl border transition flex items-center justify-between gap-2 select-none ${
          isTarget
            ? 'bg-slate-800/95 border-teal-400 ring-2 ring-teal-400/30 text-white shadow-lg'
            : alreadyPlaced
            ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-65'
            : 'bg-slate-800/75 hover:bg-slate-800 border-slate-700 text-slate-200'
        }`;

        card.innerHTML = `
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-7 h-7 rounded-lg flex items-center justify-center font-mono-tech font-bold text-xs shrink-0 border border-white/40 text-slate-950 shadow-sm" style="background:${item.color}">
              ${item.badge}
            </span>
            <div class="min-w-0 leading-tight">
              <div class="font-bold text-xs truncate flex items-center gap-1.5">
                <span>${item.label}</span>
                ${alreadyPlaced ? '<span class="text-[10px] text-teal-400 font-mono-tech">✓ Placed</span>' : ''}
              </div>
              <div class="text-[10px] text-slate-400 truncate">${item.sub}</div>
            </div>
          </div>
          <span class="text-xs font-mono-tech ${isTarget ? 'text-teal-300 font-bold' : 'text-slate-500'} shrink-0">← Drag</span>
        `;
        trayEl.appendChild(card);
      });

      updateProgressBadges();
    }

    /**
     * Deforms a segmented release-liner mesh (`seal1`, `seal2`, `seal3`) to create a realistic
     * curling peel animation from the top edge (-L/2) toward the bottom edge (+L/2),
     * progressively exposing the glossy white adhesive backing sheet underneath.
     */
    function deformSealMeshForPeel(sealMesh, progress) {
      if (!sealMesh || !sealMesh.geometry) return;
      const geom = sealMesh.geometry;
      const pos = geom.attributes.position;
      const base = geom.userData.basePositions;
      if (!base) return;

      const totalL = sealMesh.userData.stripLengthZ || 74;
      const halfL = totalL / 2;
      // Peel boundary moves from top (-halfL) down past bottom (+halfL)
      const peelLineZ = -halfL + progress * (totalL * 1.18);
      const curlRadius = 5.2;

      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];

        if (bz >= peelLineZ) {
          // Still adhered flat on the backing sheet
          pos.setXYZ(i, bx, by, bz);
        } else {
          // Peeled section: curls upward along a 155-degree arc and lifts away
          const distPeeled = peelLineZ - bz;
          const maxArcAngle = Math.PI * 0.86;
          const angle = Math.min(maxArcAngle, distPeeled / curlRadius);
          const arcLen = angle * curlRadius;
          const rem = Math.max(0, distPeeled - arcLen);

          const newY = by + curlRadius * (1 - Math.cos(angle)) + rem * Math.sin(maxArcAngle) + progress * 3.5;
          const newZ = peelLineZ - curlRadius * Math.sin(angle) - rem * Math.cos(maxArcAngle);
          pos.setXYZ(i, bx, newY, newZ);
        }
      }
      pos.needsUpdate = true;
      geom.computeVertexNormals();
    }

    function startSmoothSealPeelAnimation(sealKey, startProgress, completionMsg) {
      if (STATE.peelAnimProgress >= 0 || STATE.stepTransitionLock) return;
      SFX.peel();
      STATE.stepTransitionLock = true;
      const targetKey = sealKey || (STATE.currentGameStep === 2 ? 'seal1' : STATE.currentGameStep === 4 ? 'seal2' : 'seal3');
      if (exposedWhiteZones[targetKey]) {
        exposedWhiteZones[targetKey].visible = true;
      }
      STATE.peelingSealKey = targetKey;
      STATE.peelAnimProgress = Math.max(0.05, startProgress || 0.05);
      STATE.peelPendingMsg = completionMsg || "Release liner removed! White adhesive surface exposed.";
    }

    function completeCurrentGameStepWithFeedback(msg) {
      if (STATE.stepTransitionLock || STATE.peelAnimProgress >= 0) return;

      const totalSteps = RCDC_CONFIG.assemblySteps.length;
      const s = STATE.currentGameStep;

      // If this is a Peel step (Steps 2, 4, 6) and the smooth curl animation hasn't run yet, play it first!
      if ((s === 2 || s === 4 || s === 6) && STATE.peelAnimProgress < 0) {
        const key = s === 2 ? 'seal1' : s === 4 ? 'seal2' : 'seal3';
        startSmoothSealPeelAnimation(key, 0.06, msg);
        return;
      }

      SFX.snap();
      STATE.stepTransitionLock = true;
      STATE.completedSteps[s] = true;
      saveProgressToStorage();

      // Immediately reveal the newly placed strip on the left acrylic mat so the operator sees it snap into place!
      if (s === 1 && gameAssembledMeshes['backing_sheet']) {
        gameAssembledMeshes['backing_sheet'].visible = true;
        if (sealMeshes.seal1) sealMeshes.seal1.visible = true;
        if (sealMeshes.seal2) sealMeshes.seal2.visible = true;
        if (sealMeshes.seal3) sealMeshes.seal3.visible = true;
      } else if (s === 3 && gameAssembledMeshes['reaction_film']) {
        gameAssembledMeshes['reaction_film'].visible = true;
      } else if (s === 5 && gameAssembledMeshes['conjugate_pad']) {
        gameAssembledMeshes['conjugate_pad'].visible = true;
      } else if (s === 7 && gameAssembledMeshes['sample_pad']) {
        gameAssembledMeshes['sample_pad'].visible = true;
      } else if (s === 8 && gameAssembledMeshes['absorbent_pad']) {
        gameAssembledMeshes['absorbent_pad'].visible = true;
      }

      // Trigger special tool animations on steps 8, 9, 10
      if (s === 8 || s === 9) {
        STATE.pressAnimProgress = 0;
      } else if (s === 10) {
        STATE.qcScanProgress = 0;
      }

      showGameFeedback(true, msg);

      // Advance to next step automatically after brief visual confirmation
      clearTimeout(stepAdvanceTimer);
      stepAdvanceTimer = setTimeout(() => {
        STATE.stepTransitionLock = false;
        if (STATE.currentGameStep < totalSteps) {
          STATE.currentGameStep++;
          renderGameStepUI();
          sync3DSceneForGameStep();
        } else {
          renderGameStepUI();
          sync3DSceneForGameStep();
          if (targetDropZoneMesh) targetDropZoneMesh.visible = false;
          SFX.fanfare();
          showGameFeedback(true, "🎉 All 8 Steps Complete! Drag the assembled 30 cm card into the Strip Cutter Machine on the right!");
        }
      }, 900);
    }

    function startStripCuttingMachineSimulation() {
      if (STATE.cutterProgress >= 0) return;
      SFX.pickup();

      const gCoords = computeGameBenchCoordinates();

      // Ensure all 5 assembled layers are visible and snap the master card into the machine's infeed slot
      ['backing_sheet', 'reaction_film', 'conjugate_pad', 'sample_pad', 'absorbent_pad'].forEach(id => {
        if (gameAssembledMeshes[id]) gameAssembledMeshes[id].visible = true;
      });
      if (targetDropZoneMesh) targetDropZoneMesh.visible = false;
      if (stripCutterMachineGroup) stripCutterMachineGroup.visible = true;
      if (cutterFeedDropZoneMesh) cutterFeedDropZoneMesh.visible = false;

      if (assembledMasterCardGroup) {
        assembledMasterCardGroup.visible = true;
        assembledMasterCardGroup.position.set(
          gCoords.cutterMachineX - gCoords.asmCenterX,
          0.35,
          -34
        );
        assembledMasterCardGroup.scale.set(1, 1, 1);
      }

      // Reset individual sliced output strips so they emerge fresh from the blade outfeed
      if (cutStripsOutputGroup) {
        cutStripsOutputGroup.children.forEach(ch => {
          ch.visible = false;
          if (ch.userData) {
            ch.position.set(ch.userData.targetX, ch.userData.targetY, ch.userData.bladeZ);
          }
        });
      }

      // Focus camera on the Programmable Strip Cutter Machine and its outfeed collection tray
      if (camera && controls) {
        camera.position.set(28, 62, 76);
        controls.target.set(28, 3, 12);
        controls.update();
      }

      STATE.lastCutSliceIndex = -1;
      STATE.cutterProgress = 0;

      const btn = document.getElementById('btnRunStripCutter');
      if (btn) {
        btn.innerHTML = '<span>⚙ Feeding Card &amp; Cutting Strips...</span>';
      }
      showGameFeedback(true, "✂ Master card fed into machine! Guillotine blade slicing & ejecting ICT test strips...");
    }

    function autoCompleteCurrentGameStep() {
      if (STATE.stepTransitionLock || STATE.peelAnimProgress >= 0) return;
      const stepObj = RCDC_CONFIG.assemblySteps[STATE.currentGameStep - 1];
      completeCurrentGameStepWithFeedback(`Auto-Demonstrated Step ${stepObj.step}: ${stepObj.instruction}`);
    }

    function prevGameStep() {
      if (STATE.stepTransitionLock || STATE.peelAnimProgress >= 0) return;
      if (STATE.currentGameStep > 1) {
        clearTimeout(stepAdvanceTimer);
        STATE.currentGameStep--;
        renderGameStepUI();
        sync3DSceneForGameStep();
      }
    }

    function nextGameStep() {
      if (STATE.stepTransitionLock || STATE.peelAnimProgress >= 0) return;
      if (STATE.currentGameStep < RCDC_CONFIG.assemblySteps.length) {
        clearTimeout(stepAdvanceTimer);
        STATE.currentGameStep++;
        renderGameStepUI();
        sync3DSceneForGameStep();
      }
    }

    function clearAssemblyTransientState() {
      clearTimeout(stepAdvanceTimer);
      clearTimeout(feedbackTimer);
      stepAdvanceTimer = null;
      feedbackTimer = null;

      if (STATE.dragging3DMesh && STATE.dragging3DMesh.userData.isStagedPart) {
        resetStagedMeshPosition(STATE.dragging3DMesh);
      }
      STATE.stepTransitionLock = false;
      STATE.draggingItemId = null;
      STATE.dragging3DMesh = null;
      STATE.isDraggingAssembledCard = false;
      STATE.isPeelingLiner = false;
      STATE.currentPeelDragProgress = 0;
      STATE.peelDragStartZ = 0;
      STATE.peelingSealKey = null;
      STATE.peelAnimProgress = -1;
      STATE.peelPendingMsg = null;
      STATE.flowParticleProgress = -1;
      STATE.cutterProgress = -1;
      STATE.lastCutSliceIndex = -1;
      STATE.pressAnimProgress = -1;
      STATE.alcoholWipeProgress = -1;
      STATE.qcScanProgress = -1;

      if (controls) controls.enabled = true;
      const ghost = document.getElementById('dragGhost');
      if (ghost) ghost.style.display = 'none';
      const tooltipEl = document.getElementById('hoverTooltip3D');
      if (tooltipEl) tooltipEl.style.display = 'none';
      if (assembledMasterCardGroup) {
        assembledMasterCardGroup.visible = true;
        assembledMasterCardGroup.position.set(0, 0, 0);
        assembledMasterCardGroup.scale.set(1, 1, 1);
      }
      [pressRollerMesh, stripCutterMachineGroup, alcoholGauzeMesh, qcScannerMesh, flowParticlesGroup, explorerFluidWaveMesh].forEach(mesh => {
        if (mesh) mesh.visible = false;
      });
      if (cutStripsOutputGroup) {
        cutStripsOutputGroup.children.forEach(ch => { ch.visible = false; });
      }
      const toast = document.getElementById('gameFeedbackToast');
      if (toast) toast.classList.add('hidden');
    }

    function resetAssemblyGame() {
      clearAssemblyTransientState();
      STATE.currentGameStep = 1;
      STATE.completedSteps = {};
      STATE.precisionScores = {};
      updatePrecisionBadge();
      saveProgressToStorage();
      renderGameStepUI();
      sync3DSceneForGameStep();
      showGameFeedback(true, "Workbench reset to Step 1.");
    }

    function showGameFeedback(isSuccess, text) {
      if (!isSuccess && STATE.activePage === 'game') {
        SFX.error();
      }
      const toast = document.getElementById('gameFeedbackToast');
      const icon = document.getElementById('gameFeedbackIcon');
      const label = document.getElementById('gameFeedbackText');

      toast.classList.remove('hidden');
      toast.className = `absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all ${
        isSuccess
          ? 'bg-slate-900/95 text-teal-300 border-teal-400/70'
          : 'bg-rose-950/95 text-rose-200 border-rose-400/70'
      }`;
      icon.textContent = isSuccess ? '✓' : '⚠';
      label.textContent = text;

      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(() => {
        toast.classList.add('hidden');
      }, 2800);
    }

    function toggleGameRefModal(forceState) {
      const popup = document.getElementById('gameRefPopup');
      const show = forceState !== undefined ? forceState : popup.classList.contains('hidden');
      popup.classList.toggle('hidden', !show);
    }

    