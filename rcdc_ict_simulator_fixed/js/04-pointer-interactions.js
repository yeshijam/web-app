/***************************************************************************
     * 4. POINTER & DRAG-AND-DROP GAME INTERACTION (3D Raycast + Tray Dragging)
     ***************************************************************************/
    function updateNormalizedMouse(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    function onCanvasPointerDown(event) {
      updateNormalizedMouse(event.clientX, event.clientY);
      raycaster.setFromCamera(mouse, camera);

      // CASE A: Explorer Mode — Click any 3D layer to inspect
      if (STATE.activePage === 'explorer') {
        const pickables = [];
        Object.values(assembledMeshes).forEach(grp => {
          if (grp.visible) grp.traverse(ch => { if (ch.isMesh) pickables.push(ch); });
        });
        const hits = raycaster.intersectObjects(pickables, false);
        if (hits.length > 0 && hits[0].object.userData.componentId) {
          selectComponent(hits[0].object.userData.componentId);
          toggleInspectorCard(true);
        }
        return;
      }

      // CASE B: Guided Assembly Game Mode — Dragging Staged 3D Parts or Peeling Release Liners
      if (STATE.activePage === 'game') {
        if (STATE.stepTransitionLock || STATE.peelAnimProgress >= 0) return;

        const stepObj = RCDC_CONFIG.assemblySteps[STATE.currentGameStep - 1];

        // Check if clicking an active Peelable Release Liner (Steps 2, 4, 6)
        const visibleSeals = Object.values(sealMeshes).filter(s => s.visible);
        const sealHits = raycaster.intersectObjects(visibleSeals, false);
        if (sealHits.length > 0) {
          const hitSeal = sealHits[0].object;
          const expectedSealKey = STATE.currentGameStep === 2 ? 'seal1' : STATE.currentGameStep === 4 ? 'seal2' : STATE.currentGameStep === 6 ? 'seal3' : null;
          if (stepObj.requiredItem === 'tool_peel' && hitSeal.userData.sealKey === expectedSealKey) {
            event.stopImmediatePropagation();
            event.preventDefault();
            SFX.pickup();
            controls.enabled = false;
            STATE.isPeelingLiner = true;
            STATE.currentPeelDragProgress = 0.08;
            STATE.dragging3DMesh = hitSeal;
            const intersectPt = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(STATE.dragPlane, intersectPt)) {
              STATE.peelDragStartZ = intersectPt.z;
            } else {
              STATE.peelDragStartZ = -30;
            }
            // Immediately show the white adhesive layer underneath as peeling begins
            const whiteZone = exposedWhiteZones[hitSeal.userData.sealKey];
            if (whiteZone) whiteZone.visible = true;
            return;
          } else if (stepObj.requiredItem === 'tool_peel' && hitSeal.userData.sealKey !== expectedSealKey) {
            event.stopImmediatePropagation();
            showGameFeedback(false, `Please peel Seal #${expectedSealKey.replace('seal', '')} for Step ${STATE.currentGameStep}!`);
            return;
          }
        }

        // Check if clicking a Staged 3D Component [1]–[5] lying on the right side of the bench
        const stagedPickables = [];
        Object.values(stagedGameMeshes).forEach(grp => {
          if (grp.visible) grp.traverse(ch => { if (ch.isMesh) stagedPickables.push(ch); });
        });
        const stagedHits = raycaster.intersectObjects(stagedPickables, false);
        if (stagedHits.length > 0) {
          const hitGroup = stagedHits[0].object.userData.parentGroup;
          if (hitGroup) {
            event.stopImmediatePropagation();
            event.preventDefault();
            SFX.pickup();
            controls.enabled = false; // Lock OrbitControls while dragging 3D component
            STATE.dragging3DMesh = hitGroup;
            STATE.draggingItemId = hitGroup.userData.componentId;
            hitGroup.position.y = 3.2; // Lift up slightly while dragging
            return;
          }
        }

        // Check if all 8 steps are complete and operator clicks the Assembled 30cm Master Card to drag it into the Strip Cutter Machine
        if (Boolean(STATE.completedSteps[8]) && STATE.cutterProgress < 0 && assembledMasterCardGroup && assembledMasterCardGroup.visible) {
          const assembledPickables = [];
          Object.values(gameAssembledMeshes).forEach(grp => {
            if (grp.visible) grp.traverse(ch => { if (ch.isMesh) assembledPickables.push(ch); });
          });
          const asmHits = raycaster.intersectObjects(assembledPickables, false);
          if (asmHits.length > 0) {
            event.stopImmediatePropagation();
            event.preventDefault();
            SFX.pickup();
            controls.enabled = false;
            STATE.isDraggingAssembledCard = true;
            assembledMasterCardGroup.position.y = 2.6;
            showGameFeedback(true, "👉 Drag the assembled 30 cm master card right into the glowing Strip Cutter Machine!");
            return;
          }
        }
      }
    }

    function onWindowPointerMove(event) {
      const tooltipEl = document.getElementById('hoverTooltip3D');
      const tooltipText = document.getElementById('hoverTooltipText');
      const tooltipDot = document.getElementById('hoverTooltipDot');

      // Update Floating UI Ghost + Live Millimeter Readout if dragging from Right-Side Dock
      if (STATE.draggingItemId && !STATE.dragging3DMesh) {
        const ghost = document.getElementById('dragGhost');
        ghost.style.display = 'flex';
        ghost.style.left = `${event.clientX}px`;
        ghost.style.top = `${event.clientY}px`;

        // Improvement #1: Live millimeter alignment readout while dragging from Right Dock over 3D mat
        updateNormalizedMouse(event.clientX, event.clientY);
        raycaster.setFromCamera(mouse, camera);
        const intersectPt = new THREE.Vector3();
        if (STATE.activePage === 'game' && raycaster.ray.intersectPlane(STATE.dragPlane, intersectPt) && intersectPt.x < 4) {
          const gCoords = computeGameBenchCoordinates();
          const targetSpec = gCoords.assembled[STATE.draggingItemId];
          if (targetSpec && tooltipEl) {
            const errMm = Math.abs(intersectPt.x - targetSpec.x) / gCoords.scaleW;
            const pass = errMm <= 2.2;
            tooltipEl.style.display = 'flex';
            tooltipEl.style.left = `${event.clientX}px`;
            tooltipEl.style.top = `${event.clientY - 26}px`;
            tooltipDot.className = `w-2 h-2 rounded-full ${pass ? 'bg-emerald-400' : 'bg-amber-400'}`;
            tooltipText.textContent = `Offset: ±${errMm.toFixed(1)} mm (${pass ? 'OPTIMAL OVERLAP' : 'ADJUST ALIGNMENT'})`;
          }
        } else if (tooltipEl) {
          tooltipEl.style.display = 'none';
        }
        return;
      }

      // Improvement #4: Hover Highlighting & Cursor Feedback in the 3D Workbench when not dragging
      if (!STATE.isPeelingLiner && !STATE.dragging3DMesh && !STATE.isDraggingAssembledCard) {
        updateHoverHighlight3D(event);
        return;
      }

      updateNormalizedMouse(event.clientX, event.clientY);
      raycaster.setFromCamera(mouse, camera);

      // Dragging the Completed 30cm Master Card into the Programmable Strip Cutter Machine
      if (STATE.isDraggingAssembledCard && assembledMasterCardGroup) {
        const intersectPt = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(STATE.dragPlane, intersectPt)) {
          const gCoords = computeGameBenchCoordinates();
          assembledMasterCardGroup.position.x = intersectPt.x - gCoords.asmCenterX;
          assembledMasterCardGroup.position.z = intersectPt.z - gCoords.asmCenterZ;
          if (tooltipEl) {
            tooltipEl.style.display = 'flex';
            tooltipEl.style.left = `${event.clientX}px`;
            tooltipEl.style.top = `${event.clientY}px`;
            tooltipDot.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-ping';
            tooltipText.textContent = `Feed Master Card into Cutter Slot → (${STATE.cutterPitchMm} mm Pitch)`;
          }
        }
        return;
      }

      // Direct 3D Liner Peel Gesture (Vertical 30cm Strip — Smooth Curling Peel Revealing White Adhesive)
      if (STATE.isPeelingLiner && STATE.dragging3DMesh) {
        const intersectPt = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(STATE.dragPlane, intersectPt)) {
          const dragDist = Math.hypot(
            intersectPt.z - STATE.peelDragStartZ,
            intersectPt.x - STATE.dragging3DMesh.position.x
          );
          const progress = Math.min(1, Math.max(0.08, dragDist / 48));
          STATE.currentPeelDragProgress = progress;
          deformSealMeshForPeel(STATE.dragging3DMesh, progress);

          if (tooltipEl) {
            tooltipEl.style.display = 'flex';
            tooltipEl.style.left = `${event.clientX}px`;
            tooltipEl.style.top = `${event.clientY}px`;
            tooltipDot.className = 'w-2 h-2 rounded-full bg-sky-400';
            tooltipText.textContent = `Peeling Release Seal: ${Math.round(progress * 100)}%`;
          }

          if (progress >= 0.68) {
            const sealKey = STATE.dragging3DMesh.userData.sealKey;
            STATE.isPeelingLiner = false;
            STATE.dragging3DMesh = null;
            controls.enabled = true;
            if (tooltipEl) tooltipEl.style.display = 'none';
            startSmoothSealPeelAnimation(sealKey, progress, "Release liner peeled! White adhesive surface exposed on backing sheet.");
          }
        }
        return;
      }

      // Direct 3D Staged Component Dragging from Right Side of Benchtop to Left Assembly Mat + Live Millimeter Overlap Readout
      if (STATE.dragging3DMesh && !STATE.isPeelingLiner) {
        const intersectPt = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(STATE.dragPlane, intersectPt)) {
          STATE.dragging3DMesh.position.x = intersectPt.x;
          STATE.dragging3DMesh.position.z = intersectPt.z;

          const gCoords = computeGameBenchCoordinates();
          const compId = STATE.dragging3DMesh.userData.componentId;
          const targetSpec = gCoords.assembled[compId];
          if (targetSpec && tooltipEl) {
            const errMm = Math.abs(intersectPt.x - targetSpec.x) / gCoords.scaleW;
            const pass = errMm <= 2.2;
            tooltipEl.style.display = 'flex';
            tooltipEl.style.left = `${event.clientX}px`;
            tooltipEl.style.top = `${event.clientY}px`;
            tooltipDot.className = `w-2 h-2 rounded-full ${pass ? 'bg-emerald-400' : 'bg-amber-400'}`;
            tooltipText.textContent = intersectPt.x < 4
              ? `Alignment Offset: ±${errMm.toFixed(1)} mm • ${pass ? 'PASS (Overlap OK)' : 'Adjust Position'}`
              : `Drag Left onto Glowing Work Mat Target`;
          }
        }
      }
    }

    // Improvement #4: Real-time 3D Hover Detection, Edge Highlighting & Cursor Tooltip
    function updateHoverHighlight3D(event) {
      const tooltipEl = document.getElementById('hoverTooltip3D');
      const tooltipText = document.getElementById('hoverTooltipText');
      const tooltipDot = document.getElementById('hoverTooltipDot');
      const canvas = renderer ? renderer.domElement : null;
      if (!canvas || STATE.activePage !== 'game') {
        if (tooltipEl) tooltipEl.style.display = 'none';
        return;
      }

      const rect = canvas.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        if (tooltipEl) tooltipEl.style.display = 'none';
        return;
      }

      updateNormalizedMouse(event.clientX, event.clientY);
      raycaster.setFromCamera(mouse, camera);

      // Reset previous hover highlight
      Object.values(stagedGameMeshes).forEach(grp => {
        const line = grp.children.find(ch => ch.isLineSegments);
        if (line && line.material) {
          line.material.color.setHex(0x38bdf8);
          line.material.opacity = 0.55;
        }
      });

      const stepObj = RCDC_CONFIG.assemblySteps[STATE.currentGameStep - 1];

      // 1. Check hover over Peelable Seals
      const visibleSeals = Object.values(sealMeshes).filter(s => s.visible);
      const sealHits = raycaster.intersectObjects(visibleSeals, false);
      if (sealHits.length > 0) {
        const hitSeal = sealHits[0].object;
        canvas.style.cursor = 'pointer';
        if (tooltipEl) {
          tooltipEl.style.display = 'flex';
          tooltipEl.style.left = `${event.clientX}px`;
          tooltipEl.style.top = `${event.clientY}px`;
          const isExpected = stepObj && stepObj.requiredItem === 'tool_peel' &&
            ((STATE.currentGameStep === 2 && hitSeal.userData.sealKey === 'seal1') ||
             (STATE.currentGameStep === 4 && hitSeal.userData.sealKey === 'seal2') ||
             (STATE.currentGameStep === 6 && hitSeal.userData.sealKey === 'seal3'));
          tooltipDot.className = `w-2 h-2 rounded-full ${isExpected ? 'bg-teal-400 animate-ping' : 'bg-slate-400'}`;
          tooltipText.textContent = `Click & Drag to Peel Release Liner (Seal #${hitSeal.userData.sealIndex})`;
        }
        return;
      }

      // 2. Check hover over Staged 3D Strips [1]–[5] on the Right Benchtop
      const stagedPickables = [];
      Object.values(stagedGameMeshes).forEach(grp => {
        if (grp.visible) grp.traverse(ch => { if (ch.isMesh) stagedPickables.push(ch); });
      });
      const stagedHits = raycaster.intersectObjects(stagedPickables, false);
      if (stagedHits.length > 0) {
        const hitGrp = stagedHits[0].object.userData.parentGroup;
        if (hitGrp) {
          const line = hitGrp.children.find(ch => ch.isLineSegments);
          if (line && line.material) {
            line.material.color.setHex(0x2dd4bf);
            line.material.opacity = 1.0;
          }
          const comp = RCDC_CONFIG.components.find(c => c.id === hitGrp.userData.componentId);
          canvas.style.cursor = 'grab';
          if (tooltipEl && comp) {
            tooltipEl.style.display = 'flex';
            tooltipEl.style.left = `${event.clientX}px`;
            tooltipEl.style.top = `${event.clientY}px`;
            const isTarget = stepObj && stepObj.requiredItem === comp.id;
            tooltipDot.className = `w-2 h-2 rounded-full ${isTarget ? 'bg-teal-400 animate-ping' : 'bg-sky-400'}`;
            tooltipText.textContent = `Click & Drag [${comp.number}] ${comp.name} (${comp.drawingSpec})`;
          }
          return;
        }
      }

      // 3. Check hover over Completed Master Card after Step 8
      if (Boolean(STATE.completedSteps[8]) && STATE.cutterProgress < 0 && assembledMasterCardGroup && assembledMasterCardGroup.visible) {
        const asmPickables = [];
        Object.values(gameAssembledMeshes).forEach(grp => {
          if (grp.visible) grp.traverse(ch => { if (ch.isMesh) asmPickables.push(ch); });
        });
        const asmHits = raycaster.intersectObjects(asmPickables, false);
        if (asmHits.length > 0) {
          canvas.style.cursor = 'grab';
          if (tooltipEl) {
            tooltipEl.style.display = 'flex';
            tooltipEl.style.left = `${event.clientX}px`;
            tooltipEl.style.top = `${event.clientY}px`;
            tooltipDot.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-ping';
            tooltipText.textContent = 'Click & Drag Assembled 30 cm Master Card into Strip Cutter Machine →';
          }
          return;
        }
      }

      canvas.style.cursor = 'grab';
      if (tooltipEl) tooltipEl.style.display = 'none';
    }

    function onWindowPointerUp(event) {
      const ghost = document.getElementById('dragGhost');
      ghost.style.display = 'none';
      const tooltipEl = document.getElementById('hoverTooltip3D');
      if (tooltipEl) tooltipEl.style.display = 'none';

      // Handle dropping the Assembled 30cm Master Card into the Strip Cutter Machine
      if (STATE.isDraggingAssembledCard) {
        STATE.isDraggingAssembledCard = false;
        if (controls) controls.enabled = true;
        const gCoords = computeGameBenchCoordinates();
        const cardWorldX = gCoords.asmCenterX + (assembledMasterCardGroup ? assembledMasterCardGroup.position.x : 0);
        const cardWorldZ = gCoords.asmCenterZ + (assembledMasterCardGroup ? assembledMasterCardGroup.position.z : 0);
        const distToCutter = Math.hypot(cardWorldX - gCoords.cutterMachineX, cardWorldZ - gCoords.cutterMachineZ);

        if (distToCutter < 36 || cardWorldX > 2) {
          startStripCuttingMachineSimulation();
        } else {
          if (assembledMasterCardGroup) assembledMasterCardGroup.position.set(0, 0, 0);
          showGameFeedback(false, "Drag the assembled master card further RIGHT into the glowing Strip Cutter Machine!");
        }
        return;
      }

      if (STATE.isPeelingLiner) {
        const activeSeal = STATE.dragging3DMesh;
        const sealKey = activeSeal ? activeSeal.userData.sealKey : null;
        const startProg = Math.max(0.12, STATE.currentPeelDragProgress || 0.12);
        STATE.isPeelingLiner = false;
        STATE.dragging3DMesh = null;
        STATE.currentPeelDragProgress = 0;
        if (controls) controls.enabled = true;
        if (sealKey && STATE.peelAnimProgress < 0 && !STATE.stepTransitionLock) {
          startSmoothSealPeelAnimation(sealKey, startProg, "Release liner seal peeled off! White adhesive surface exposed.");
        }
        return;
      }

      // Handle Drop from either 3D Right-Side Benchtop Strip OR Right-Side UI Dock Card
      if (STATE.draggingItemId) {
        const droppedId = STATE.draggingItemId;
        const draggedMesh = STATE.dragging3DMesh;
        STATE.draggingItemId = null;
        STATE.dragging3DMesh = null;
        if (controls) controls.enabled = true;

        if (STATE.activePage === 'game') {
          evaluateGameDrop(droppedId, event.clientX, event.clientY, draggedMesh);
        }
      }
    }

    // Evaluates whether the user dragged the right component/tool onto the left acrylic assembly zone
    function evaluateGameDrop(droppedItemId, clientX, clientY, dragged3DMesh) {
      if (STATE.stepTransitionLock || STATE.peelAnimProgress >= 0) {
        if (dragged3DMesh) resetStagedMeshPosition(dragged3DMesh);
        return;
      }

      // Allow pre-work 70% Alcohol + Gauze wipe at any time
      if (droppedItemId === 'tool_alcohol') {
        triggerBenchAlcoholWipe();
        return;
      }

      const stepObj = RCDC_CONFIG.assemblySteps[STATE.currentGameStep - 1];
      const rect = renderer.domElement.getBoundingClientRect();
      const insideCanvas = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

      if (!insideCanvas) {
        if (dragged3DMesh) resetStagedMeshPosition(dragged3DMesh);
        return;
      }

      // Project cursor onto benchtop plane to verify the operator dropped onto the left acrylic work mat
      updateNormalizedMouse(clientX, clientY);
      raycaster.setFromCamera(mouse, camera);
      const dropWorldPt = new THREE.Vector3();
      const hitPlane = raycaster.ray.intersectPlane(STATE.dragPlane, dropWorldPt);

      const dropX = dragged3DMesh ? dragged3DMesh.position.x : (hitPlane ? dropWorldPt.x : -28);
      if (dropX > 4) {
        if (dragged3DMesh) resetStagedMeshPosition(dragged3DMesh);
        showGameFeedback(false, "Drag the item further LEFT onto the glowing target zone on the clear work mat!");
        return;
      }

      // Check if dropped item matches the documented step requirement
      if (droppedItemId === stepObj.requiredItem) {
        // Improvement #1: Compute Precision Alignment Accuracy (in mm) before snapping
        const gCoords = computeGameBenchCoordinates();
        const targetSpec = gCoords.assembled[droppedItemId];
        let precisionMsg = `Step ${stepObj.step} Complete: ${stepObj.instruction}`;
        if (targetSpec) {
          const rawErrMm = Math.abs(dropX - targetSpec.x) / gCoords.scaleW;
          const clampedErrMm = Math.min(4.5, rawErrMm);
          const stepAccuracy = Math.max(78, Math.round(100 - clampedErrMm * 4.8));
          STATE.precisionScores[stepObj.step] = stepAccuracy;
          updatePrecisionBadge();
          const overlapLabel = clampedErrMm <= 1.5 ? 'Optimal ~2.0 mm Overlap' : 'Aligned to Spec';
          precisionMsg = `✓ Step ${stepObj.step} Aligned (±${clampedErrMm.toFixed(1)} mm • ${stepAccuracy}% Precision • ${overlapLabel})`;
        }

        if (dragged3DMesh) {
          dragged3DMesh.visible = false;
          resetStagedMeshPosition(dragged3DMesh);
        }
        completeCurrentGameStepWithFeedback(precisionMsg);
      } else {
        if (dragged3DMesh) resetStagedMeshPosition(dragged3DMesh);
        const expectedTrayItem = RCDC_CONFIG.gameTrayItems.find(i => i.id === stepObj.requiredItem);
        const expectedName = expectedTrayItem ? `[${expectedTrayItem.badge}] ${expectedTrayItem.label}` : stepObj.requiredItem;
        showGameFeedback(false, `Sequence check: Step ${stepObj.step} requires ${expectedName}`);
        const card = document.getElementById('gameStepCard');
        card.classList.remove('shake-error');
        void card.offsetWidth;
        card.classList.add('shake-error');
      }
    }

    function updatePrecisionBadge() {
      const badge = document.getElementById('precisionScoreBadge');
      if (!badge) return;
      const vals = Object.values(STATE.precisionScores);
      const avg = vals.length > 0
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : 100;
      badge.textContent = `🎯 Precision: ${avg}%`;
    }

    function setCutterPitch(pitchMm) {
      STATE.cutterPitchMm = pitchMm;
      const totalYield = Math.round(300 / pitchMm);

      [
        { id: 'btnPitch40', p: 4.0 },
        { id: 'btnPitch50', p: 5.0 },
        { id: 'btnPitch75', p: 7.5 }
      ].forEach(btnInfo => {
        const el = document.getElementById(btnInfo.id);
        if (!el) return;
        const active = Math.abs(btnInfo.p - pitchMm) < 0.05;
        el.className = active
          ? 'flex-1 py-0.5 rounded bg-indigo-600 text-white font-mono-tech font-bold border border-indigo-400 transition'
          : 'flex-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono-tech border border-slate-700 transition';
      });

      const yieldEl = document.getElementById('cutterPitchYieldText');
      if (yieldEl) {
        yieldEl.textContent = `${pitchMm.toFixed(1)} mm = ${totalYield} strips/card`;
      }
      SFX.pickup();
    }

    function setCutterSpeed(speedMult) {
      STATE.cutterSpeedMult = speedMult;
      [
        { id: 'btnSpeedSlow', s: 0.65 },
        { id: 'btnSpeedStd', s: 1.0 },
        { id: 'btnSpeedFast', s: 1.75 }
      ].forEach(btnInfo => {
        const el = document.getElementById(btnInfo.id);
        if (!el) return;
        const active = Math.abs(btnInfo.s - speedMult) < 0.05;
        el.className = active
          ? 'flex-1 py-0.5 rounded bg-teal-600 text-white font-mono-tech font-bold border border-teal-400 transition'
          : 'flex-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono-tech border border-slate-700 transition';
      });
      SFX.pickup();
    }

    function renderBenchWipeStatus() {
      const btn = document.getElementById('btnAlcoholWipeStatus');
      if (!btn) return;

      const isWiped = STATE.checkedEnv.env_alc === true;
      btn.textContent = isWiped ? '✓ 70% Alcohol Wiped' : '🧴 Wipe w/ 70% Alcohol';
      btn.className = isWiped
        ? 'px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 font-mono-tech text-[10px]'
        : 'px-2 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-400/40 font-mono-tech text-[10px] transition';
    }

    function triggerBenchAlcoholWipe() {
      SFX.wipe();
      STATE.checkedEnv.env_alc = true;
      saveProgressToStorage();
      renderBenchWipeStatus();
      STATE.alcoholWipeProgress = 0;
      showGameFeedback(true, "Benchtop decontaminated with 70% alcohol & gauze piece!");
    }

    function resetStagedMeshPosition(grp) {
      if (!grp || !grp.userData) return;
      grp.position.set(grp.userData.baseX, grp.userData.baseY, grp.userData.baseZ);
    }

    // Start dragging a card from the Right-Side Dock
    function startTrayCardDrag(event, itemId) {
      if (STATE.stepTransitionLock || STATE.peelAnimProgress >= 0) return;
      event.preventDefault();
      const item = RCDC_CONFIG.gameTrayItems.find(i => i.id === itemId);
      if (!item) return;

      SFX.pickup();
      STATE.draggingItemId = itemId;
      STATE.dragging3DMesh = null;

      const ghost = document.getElementById('dragGhost');
      document.getElementById('dragGhostSwatch').style.backgroundColor = item.color;
      document.getElementById('dragGhostText').textContent = `Drop ${item.label} onto Left Work Mat`;
      ghost.style.display = 'flex';
      ghost.style.left = `${event.clientX}px`;
      ghost.style.top = `${event.clientY}px`;
    }

    