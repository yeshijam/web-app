/***************************************************************************
     * 2. APPLICATION STATE & PROGRESS PERSISTENCE
     ***************************************************************************/
    const STATE = {
      activePage: 'overview', // 'overview' | 'explorer' | 'game' | 'export'
      selectedComponentId: 'backing_sheet',
      inspectorVisible: true,
      explodeFactor: 0.60,
      targetExplodeFactor: 0.60,
      isMasterSheetMode: false,
      showLabels: true,
      darkViewport: false,

      // Guided Assembly Game State
      currentGameStep: 1,
      stepTransitionLock: false, // Prevents double-advancing steps during peel/press/completion timers
      draggingItemId: null,     // ID of component/tool currently dragged from UI tray or 3D scene
      dragging3DMesh: null,     // Reference to 3D staged part being dragged on the bench
      isDraggingAssembledCard: false, // True when dragging the completed 30cm master card into the Strip Cutter Machine
      dragPlane: null,          // Horizontal plane for 3D raycast dragging
      isPeelingLiner: false,
      peelDragStartZ: 0,
      currentPeelDragProgress: 0,

      // Active Curling Peel Animation State
      peelingSealKey: null,     // 'seal1' | 'seal2' | 'seal3'
      peelAnimProgress: -1,     // 0.0 -> 1.0 smooth curling peel progress
      peelPendingMsg: null,

      // Animations & Improvements State
      flowParticleProgress: -1,
      cutterProgress: -1,
      lastCutSliceIndex: -1,
      totalCutSlices: 16,
      cutterPitchMm: 7.5,       // Configurable Cut Width Pitch (4.0mm, 5.0mm, or 7.5mm)
      cutterSpeedMult: 1.0,     // Configurable Guillotine Blade Speed (0.65x, 1.0x, 1.75x)
      precisionScores: {},      // Stores alignment accuracy % per placed strip step
      hovered3DObject: null,    // Tracks currently hovered 3D object for cyan edge glow & tooltip
      pressAnimProgress: -1,
      alcoholWipeProgress: -1,
      qcScanProgress: -1,

      // Custom Reference Image Overrides & Code Viewer
      customRefImages: {},
      selectedCodeFile: 'components.js',

      // Persisted Training Progress
      completedSteps: {},
      checkedEnv: {},
      quizAnswers: {}
    };

    /***************************************************************************
     * 2B. PROCEDURAL WEB AUDIO API SOUND EFFECTS (`SFX`) FOR ASSEMBLY GAME
     ***************************************************************************/
    const SFX = {
      ctx: null,
      enabled: true,

      init() {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      },

      // Soft tactile pop/click when picking up a 3D strip or dragging a card from the rack
      pickup() {
        if (!this.enabled) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(640, now + 0.055);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.065);
        } catch (e) {}
      },

      // Crisp adhesive release-liner peeling sound (filtered noise + rising sweep)
      peel() {
        if (!this.enabled) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const dur = 0.34;
          const bufferSize = Math.floor(this.ctx.sampleRate * dur);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(900, now);
          filter.frequency.exponentialRampToValueAtTime(2800, now + dur);
          filter.Q.setValueAtTime(3.0, now);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.008, now + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          noise.start(now);
          noise.stop(now + dur);
        } catch (e) {}
      },

      // Satisfying two-note harmonic chime when a strip layer snaps into alignment
      snap() {
        if (!this.enabled) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          [523.25, 659.25].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            const start = now + idx * 0.065;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.18, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.2);
          });
        } catch (e) {}
      },

      // Soft swish sound for 70% alcohol benchtop wipe
      wipe() {
        if (!this.enabled) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const dur = 0.28;
          const bufferSize = Math.floor(this.ctx.sampleRate * dur);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(600, now);
          filter.frequency.exponentialRampToValueAtTime(1600, now + dur);
          filter.Q.setValueAtTime(1.8, now);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.005, now + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          noise.start(now);
          noise.stop(now + dur);
        } catch (e) {}
      },

      // Gentle low double-buzz when wrong component or out-of-sequence action is attempted
      error() {
        if (!this.enabled) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          [185, 145].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            const start = now + idx * 0.085;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.10, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.095);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.105);
          });
        } catch (e) {}
      },

      // Crisp metallic guillotine blade chop + stepper motor feed click for the Strip Cutter Machine
      cutSlice() {
        if (!this.enabled) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;

          // 1. Metallic guillotine shear burst
          const dur = 0.065;
          const bufferSize = Math.floor(this.ctx.sampleRate * dur);
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2400, now);
          filter.Q.setValueAtTime(2.6, now);

          const nGain = this.ctx.createGain();
          nGain.gain.setValueAtTime(0.22, now);
          nGain.gain.exponentialRampToValueAtTime(0.004, now + dur);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(this.ctx.destination);
          noise.start(now);
          noise.stop(now + dur);

          // 2. Stepper motor index click + solenoid thud
          const osc = this.ctx.createOscillator();
          const oGain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(62, now + 0.05);
          oGain.gain.setValueAtTime(0.20, now);
          oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
          osc.connect(oGain);
          oGain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
        } catch (e) {}
      },

      // Bright ascending major-triad fanfare when all 8 assembly steps are finished
      fanfare() {
        if (!this.enabled) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            const start = now + idx * 0.09;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.36);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.38);
          });
        } catch (e) {}
      }
    };

    function toggleGameSound() {
      SFX.enabled = !SFX.enabled;
      const btn = document.getElementById('btnGameSoundToggle');
      if (btn) {
        btn.textContent = SFX.enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        btn.className = SFX.enabled
          ? 'py-1.5 px-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-400/40 text-[11px] font-mono-tech transition'
          : 'py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-[11px] font-mono-tech transition';
      }
      if (SFX.enabled) SFX.pickup();
    }

    function loadProgressFromStorage() {
      try {
        const raw = localStorage.getItem('rcdc_ict_clean_sim_v2');
        if (!raw) return;

        const parsed = JSON.parse(raw);
        const completedSteps = parsed.completedSteps && typeof parsed.completedSteps === 'object' ? parsed.completedSteps : {};
        const checkedEnv = parsed.checkedEnv && typeof parsed.checkedEnv === 'object' ? parsed.checkedEnv : {};
        const quizAnswers = parsed.quizAnswers && typeof parsed.quizAnswers === 'object' ? parsed.quizAnswers : {};

        STATE.completedSteps = Object.fromEntries(
          RCDC_CONFIG.assemblySteps
            .filter(step => completedSteps[step.step] === true)
            .map(step => [step.step, true])
        );
        STATE.checkedEnv = Object.fromEntries(
          RCDC_CONFIG.environmentalConditions
            .filter(item => checkedEnv[item.id] === true)
            .map(item => [item.id, true])
        );
        STATE.quizAnswers = Object.fromEntries(
          RCDC_CONFIG.quizBank.flatMap(question => {
            const answer = quizAnswers[question.id];
            return Number.isInteger(answer) && answer >= 0 && answer < question.options.length
              ? [[question.id, answer]]
              : [];
          })
        );
        const firstIncompleteStep = RCDC_CONFIG.assemblySteps.find(step => STATE.completedSteps[step.step] !== true);
        STATE.currentGameStep = firstIncompleteStep
          ? firstIncompleteStep.step
          : RCDC_CONFIG.assemblySteps[RCDC_CONFIG.assemblySteps.length - 1].step;
      } catch (error) {
        STATE.completedSteps = {};
        STATE.checkedEnv = {};
        STATE.quizAnswers = {};
      }
    }

    function saveProgressToStorage() {
      try {
        localStorage.setItem('rcdc_ict_clean_sim_v2', JSON.stringify({
          completedSteps: STATE.completedSteps,
          checkedEnv: STATE.checkedEnv,
          quizAnswers: STATE.quizAnswers
        }));
      } catch (error) {
        // Storage can be unavailable in private browsing or restricted contexts.
      }
      updateProgressBadges();
    }

    function updateProgressBadges() {
      const totalSteps = RCDC_CONFIG.assemblySteps.length;
      const totalEnv = RCDC_CONFIG.environmentalConditions.length;
      const totalQuiz = RCDC_CONFIG.quizBank.length;
      const stepsDone = RCDC_CONFIG.assemblySteps.filter(step => STATE.completedSteps[step.step] === true).length;
      const envDone = RCDC_CONFIG.environmentalConditions.filter(item => STATE.checkedEnv[item.id] === true).length;
      const quizDone = RCDC_CONFIG.quizBank.filter(question => Number.isInteger(STATE.quizAnswers[question.id])).length;
      const totalTasks = totalSteps + totalEnv + totalQuiz;
      const pct = Math.min(100, Math.round(((stepsDone + envDone + quizDone) / totalTasks) * 100));

      document.getElementById('overallProgressText').textContent = `${pct}%`;
      document.getElementById('navGameStepBadge').textContent = `${STATE.currentGameStep}/${totalSteps}`;
      document.getElementById('overviewStepsBadge').textContent = `${stepsDone}/${totalSteps} Built`;
      document.getElementById('overviewEnvBadge').textContent = `${envDone}/${totalEnv} Verified`;
      document.getElementById('overviewQuizBadge').textContent = `${quizDone}/${totalQuiz} Answered`;
    }

    