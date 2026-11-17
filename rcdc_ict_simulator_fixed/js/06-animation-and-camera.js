/***************************************************************************
     * 6. MAIN ANIMATION LOOP & CAMERA / EXPLORER CONTROLS
     ***************************************************************************/
    function animate() {
      requestAnimationFrame(animate);

      STATE.explodeFactor += (STATE.targetExplodeFactor - STATE.explodeFactor) * 0.12;

      // Update Assembled Layer Y-positions smoothly
      Object.values(assembledMeshes).forEach(grp => {
        const u = grp.userData;
        if (u) {
          const targetY = u.baseY + STATE.explodeFactor * u.explodeMultiplier;
          grp.position.y += (targetY - grp.position.y) * 0.15;
        }
      });

      // Pulse Target Drop Zone in Game Mode
      if (targetDropZoneMesh && targetDropZoneMesh.visible) {
        const pulse = 0.45 + 0.45 * Math.sin(performance.now() * 0.006);
        targetDropZoneMesh.material.opacity = pulse;
      }
      if (cutterFeedDropZoneMesh && cutterFeedDropZoneMesh.visible) {
        const pulse = 0.4 + 0.5 * Math.sin(performance.now() * 0.007);
        cutterFeedDropZoneMesh.material.opacity = pulse;
      }

      // Smooth Curling Peel Animation for Release Liners (Steps 3, 5, 7) revealing White Backing Sheet
      if (STATE.peelAnimProgress >= 0 && STATE.peelingSealKey) {
        const activeSeal = sealMeshes[STATE.peelingSealKey];
        if (exposedWhiteZones[STATE.peelingSealKey]) {
          exposedWhiteZones[STATE.peelingSealKey].visible = true;
        }
        STATE.peelAnimProgress += 0.032;
        if (activeSeal) {
          activeSeal.visible = true;
          deformSealMeshForPeel(activeSeal, Math.min(1, STATE.peelAnimProgress));
        }
        if (STATE.peelAnimProgress >= 1.0) {
          if (activeSeal) activeSeal.visible = false;
          const doneStep = STATE.currentGameStep;
          const doneMsg = STATE.peelPendingMsg || `Step ${doneStep} Complete: Release liner peeled and white adhesive exposed!`;
          STATE.peelAnimProgress = -1;
          STATE.peelingSealKey = null;
          STATE.peelPendingMsg = null;

          STATE.completedSteps[doneStep] = true;
          saveProgressToStorage();
          showGameFeedback(true, doneMsg);

          clearTimeout(stepAdvanceTimer);
          stepAdvanceTimer = setTimeout(() => {
            STATE.stepTransitionLock = false;
            if (STATE.currentGameStep < RCDC_CONFIG.assemblySteps.length) {
              STATE.currentGameStep++;
              renderGameStepUI();
              sync3DSceneForGameStep();
            }
          }, 700);
        }
      }

      // Blue-Gloved Cover Paper Press Roller Animation along Vertical 30cm Strip (Steps 8 & 9)
      if (STATE.pressAnimProgress >= 0 && pressRollerMesh) {
        pressRollerMesh.visible = true;
        STATE.pressAnimProgress += 0.024;
        const zPos = -32 + STATE.pressAnimProgress * 76;
        pressRollerMesh.position.set(-28, 2.8, zPos);
        if (STATE.pressAnimProgress >= 1) {
          STATE.pressAnimProgress = -1;
          pressRollerMesh.visible = false;
        }
      }

      // Step 10 Alignment Inspection Laser Scan across the Assembled 30cm Master Card
      if (STATE.qcScanProgress >= 0 && qcScannerMesh) {
        qcScannerMesh.visible = true;
        STATE.qcScanProgress += 0.022;
        const zPos = -32 + Math.sin(STATE.qcScanProgress * Math.PI) * 76;
        qcScannerMesh.position.set(-28, 2.6, zPos);
        if (STATE.qcScanProgress >= 1) {
          STATE.qcScanProgress = -1;
          qcScannerMesh.visible = false;
        }
      }

      // Improvement #3: 2-Stage Biochemical Lateral Flow & Capillary Action Visualizer (Explorer Mode)
      if (STATE.flowParticleProgress >= 0 && flowParticlesGroup) {
        flowParticlesGroup.visible = true;
        STATE.flowParticleProgress += 0.0055;
        const p = Math.min(1, STATE.flowParticleProgress);
        const currX = 30 - p * 60;
        const yPos = 1.6 + STATE.explodeFactor * 2.0;
        flowParticlesGroup.position.set(currX, yPos, 0);

        if (explorerFluidWaveMesh) {
          explorerFluidWaveMesh.visible = true;
          explorerFluidWaveMesh.position.set(currX, yPos - 0.35, 0);
        }

        const bannerEl = document.getElementById('explorerFlowBanner');
        const stageTextEl = document.getElementById('explorerFlowStageText');
        const stageDotEl = document.getElementById('explorerFlowStageDot');
        if (bannerEl) bannerEl.classList.remove('hidden');

        const linesGrp = assembledMeshes['indicator_lines'];
        const tlX = linesGrp && linesGrp.userData ? linesGrp.userData.tlX : 5.5;
        const ctlX = linesGrp && linesGrp.userData ? linesGrp.userData.ctlX : 1.5;

        // Stage 1 (Sample Pad -> Conjugate Pad): Clear/Blue buffer rehydrates purple gold-conjugate antibodies
        if (currX > 16) {
          flowParticlesGroup.children.forEach(sp => sp.material.color.setHex(0x0284c7));
          if (explorerFluidWaveMesh) explorerFluidWaveMesh.material.color.setHex(0x38bdf8);
          if (stageTextEl) stageTextEl.textContent = 'Stage 1: Stool-buffer sample migrating from Sample Pad into Conjugate Pad...';
          if (stageDotEl) stageDotEl.className = 'w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping';
        } else if (currX <= 16 && currX > -12) {
          // Stage 2A (Conjugate Pad -> Membrane): Rehydrated gold-labelled antibodies turn fluid wave magenta/purple
          flowParticlesGroup.children.forEach((sp, idx) => {
            sp.material.color.setHex(idx % 2 === 0 ? 0xc026d3 : 0xe11d48);
          });
          if (explorerFluidWaveMesh) explorerFluidWaveMesh.material.color.setHex(0xc026d3);
          if (stageTextEl) stageTextEl.textContent = 'Stage 2: Gold-labelled antibodies released! Antigen–antibody complex migrating across Membrane...';
          if (stageDotEl) stageDotEl.className = 'w-2.5 h-2.5 rounded-full bg-fuchsia-400 animate-ping';
        } else {
          if (stageTextEl) stageTextEl.textContent = 'Capillary Action Complete: TL (13mm) & CTL (17mm) immobilized lines captured; excess drawn into Absorbent Pad.';
          if (stageDotEl) stageDotEl.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
        }

        // Progressively develop Test Line (TL: 13mm) and Control Line (CTL: 17mm) as fluid front passes them
        if (explorerTlLineMesh && currX <= tlX) {
          explorerTlLineMesh.material.color.setHex(0xdc2626);
          explorerTlLineMesh.scale.y = 1.45;
        }
        if (explorerCtlLineMesh && currX <= ctlX) {
          explorerCtlLineMesh.material.color.setHex(0xb91c1c);
          explorerCtlLineMesh.scale.y = 1.45;
        }

        if (STATE.flowParticleProgress >= 1) {
          STATE.flowParticleProgress = -1;
          flowParticlesGroup.visible = false;
          if (explorerFluidWaveMesh) explorerFluidWaveMesh.visible = false;
          if (explorerTlLineMesh) explorerTlLineMesh.scale.y = 1.0;
          if (explorerCtlLineMesh) explorerCtlLineMesh.scale.y = 1.0;
          setTimeout(() => {
            if (STATE.flowParticleProgress < 0 && bannerEl) bannerEl.classList.add('hidden');
          }, 2600);
        }
      }

      // Programmable Strip Cutter Machine: Master Card Feeds In & Cut Pieces Come Out the Front
      if (STATE.cutterProgress >= 0 && stripCutterMachineGroup && cutterBladeMesh) {
        stripCutterMachineGroup.visible = true;
        STATE.cutterProgress += 0.0042 * (STATE.cutterSpeedMult || 1.0);
        const totalSlices = STATE.totalCutSlices;
        const clampedProg = Math.min(1, STATE.cutterProgress);
        const gCoords = computeGameBenchCoordinates();
        const targetYield = Math.round(300 / (STATE.cutterPitchMm || 7.5));

        // Feed the assembled 30 cm master card forward into the cutter throat & shrink un-cut length as it gets sliced
        if (assembledMasterCardGroup) {
          const remainingRatio = Math.max(0.02, 1 - clampedProg);
          assembledMasterCardGroup.scale.set(1, 1, remainingRatio);
          // Keep the front edge of the remaining master card right at the guillotine blade (Z = machineZ)
          const frontEdgeOffset = (gCoords.stripLengthZ * remainingRatio) / 2;
          assembledMasterCardGroup.position.set(
            gCoords.cutterMachineX - gCoords.asmCenterX,
            0.35,
            (gCoords.cutterMachineZ - frontEdgeOffset) - gCoords.asmCenterZ
          );
        }

        // Reciprocate the stainless-steel guillotine blade up and down on each slice
        const sliceFloat = clampedProg * totalSlices;
        const currentSliceIdx = Math.min(totalSlices - 1, Math.floor(sliceFloat));
        const slicePhase = sliceFloat - Math.floor(sliceFloat);
        const bladeStroke = Math.sin(slicePhase * Math.PI);
        cutterBladeMesh.position.y = 6.2 - bladeStroke * 5.1;

        // Play mechanical chop sound & eject each newly cut ICT test strip out the front of the machine
        if (currentSliceIdx > STATE.lastCutSliceIndex && slicePhase >= 0.35) {
          STATE.lastCutSliceIndex = currentSliceIdx;
          SFX.cutSlice();
          if (cutStripsOutputGroup && cutStripsOutputGroup.children[currentSliceIdx]) {
            const piece = cutStripsOutputGroup.children[currentSliceIdx];
            piece.visible = true;
            piece.position.set(piece.userData.targetX, piece.userData.targetY + 0.6, piece.userData.bladeZ);
          }
        }

        // Smoothly slide all ejected cut pieces forward out of the machine into the front collection tray
        if (cutStripsOutputGroup) {
          cutStripsOutputGroup.children.forEach(piece => {
            if (piece.visible && piece.userData) {
              piece.position.z += (piece.userData.targetZ - piece.position.z) * 0.16;
              piece.position.y += (piece.userData.targetY - piece.position.y) * 0.16;
              piece.rotation.y = piece.userData.targetRotY;
            }
          });
        }

        // Update live HUD counter & progress bar using configured Cut Width Pitch
        const displayCount = Math.min(targetYield, Math.max(1, Math.round(clampedProg * targetYield)));
        const badgeEl = document.getElementById('cutterStatusBadge');
        if (badgeEl) badgeEl.textContent = `Cutting (${STATE.cutterPitchMm}mm): ${displayCount} / ${targetYield}`;
        const barEl = document.getElementById('cutterProgressBar');
        if (barEl) barEl.style.width = `${Math.round(clampedProg * 100)}%`;

        if (STATE.cutterProgress >= 1) {
          STATE.cutterProgress = -1;
          cutterBladeMesh.position.y = 6.2;
          if (assembledMasterCardGroup) assembledMasterCardGroup.visible = false;
          if (badgeEl) badgeEl.textContent = `${targetYield} / ${targetYield} Strips Cut ✓`;
          const btn = document.getElementById('btnRunStripCutter');
          if (btn) btn.innerHTML = '<span>✂ Reset Card &amp; Cut Again</span>';
          SFX.fanfare();
          showGameFeedback(true, `✓ All ${targetYield} ICT test strips (${STATE.cutterPitchMm} mm pitch) ejected into the output tray!`);
        }
      }

      if (controls) controls.update();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
        updateDomLabelsPosition();
      }
    }

    function onWindowResize() {
      if (!renderer || !camera) return;
      const viewport = document.getElementById('page3DWorkspace');
      if (!viewport) return;

      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      if (width <= 0 || height <= 0) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    