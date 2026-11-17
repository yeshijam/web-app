/***************************************************************************
     * 3. THREE.JS 3D ENGINE (Supports Clean Explorer + Authentic RCDC Benchtop Game)
     ***************************************************************************/
    let scene, camera, renderer, controls, raycaster, mouse;
    let explorerGroup = null;       // Holds the horizontal cut-strip / master model for Page 2: 3D Explorer
    let gameBenchEnvironment = null;// Holds the Black Speckled Granite Benchtop, Acrylic Mat, Green Tape Tabs & Yellow Ruler for Page 3
    let assembledMasterCardGroup = null; // Parent 3D group holding the assembled 30cm master card so it can be dragged as one unit into the cutter machine
    const assembledMeshes = {};     // Explorer Mode meshes (Page 2)
    const gameAssembledMeshes = {}; // Game Mode vertical 30cm assembled strips on the left acrylic mat (Page 3)
    const stagedGameMeshes = {};    // Game Mode vertical 30cm draggable strips [1]–[5] laid out sequentially on the RIGHT side of benchtop
    const sealMeshes = {};          // 3 Peelable release liners on the vertical 30cm backing sheet in Game Mode
    const exposedWhiteZones = {};   // 3 Glossy white adhesive zones revealed on the backing sheet after peeling each seal
    let targetDropZoneMesh = null;  // Glowing wireframe drop target on the acrylic work mat
    let cutterFeedDropZoneMesh = null; // Glowing wireframe feed slot on the Strip Cutter Machine
    let pressRollerMesh = null;     // Blue-gloved cover paper press roller
    let cutterBladeMesh = null;     // Strip cutter animation mesh
    let stripCutterMachineGroup = null; // 3D Programmable Guillotine Strip Cutter Machine Bridge & Cut Strip Stack
    let cutStripsOutputGroup = null;    // Group holding individual sliced ICT strips produced during cutting
    let alcoholGauzeMesh = null;    // 70% Alcohol + Gauze Piece wipe mesh
    let qcScannerMesh = null;       // Alignment inspection laser bar for Step 10
    let flowParticlesGroup = null;
    let explorerFluidWaveMesh = null; // Translucent capillary fluid front wave across the membrane in Explorer mode
    let explorerCtlLineMesh = null;   // Explorer CTL line mesh for dynamic color development during flow demo
    let explorerTlLineMesh = null;    // Explorer TL line mesh for dynamic color development during flow demo
    let stepAdvanceTimer = null;
    let feedbackTimer = null;
    const labelAnchors = [];        // Explorer mode floating 3D callout labels
    const gameStagedBadges = [];    // Floating [1]–[5] numbered badges on the right side of the 3D benchtop in Game mode

    function createProceduralPadTexture(type, baseHex) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = baseHex;
      ctx.fillRect(0, 0, 256, 256);

      if (type === 'granite') {
        // Authentic RCDC Black Speckled Granite Benchtop texture ("Black Background Benchtop")
        ctx.fillStyle = '#181c20';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2800; i++) {
          const r = Math.random();
          ctx.fillStyle = r > 0.82
            ? 'rgba(203, 213, 225, 0.38)'
            : r > 0.45
            ? 'rgba(71, 85, 105, 0.45)'
            : 'rgba(15, 23, 42, 0.75)';
          const sz = 1 + Math.random() * 2.4;
          ctx.fillRect(Math.random() * 256, Math.random() * 256, sz, sz);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(6, 6);
        return tex;
      }

      if (type === 'fibrous' || type === 'fibrous_beige') {
        for (let i = 0; i < 850; i++) {
          ctx.strokeStyle = type === 'fibrous'
            ? (i % 2 === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(90,20,75,0.16)')
            : (i % 2 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(155,135,110,0.18)');
          ctx.lineWidth = 1;
          const x = Math.random() * 256;
          const y = Math.random() * 256;
          const len = 6 + Math.random() * 14;
          const ang = Math.random() * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
          ctx.stroke();
        }
      } else if (type === 'mesh') {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.30)';
        ctx.lineWidth = 1.2;
        for (let i = -256; i < 512; i += 16) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(i, 256); ctx.lineTo(i + 256, 0); ctx.stroke();
        }
      } else if (type === 'backing') {
        ctx.strokeStyle = 'rgba(55, 105, 55, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 85); ctx.lineTo(256, 85);
        ctx.moveTo(0, 170); ctx.lineTo(256, 170);
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 1);
      return tex;
    }

    function initThreeScene() {
      const canvas = document.getElementById('threeCanvas');

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(36, 1, 0.5, 1000);
      camera.position.set(0, 44, 92);

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(1, 1, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.maxDistance = 240;
      controls.minDistance = 18;
      controls.target.set(0, 1, 0);

      // Studio & Laboratory Overhead Lighting (>1000 Lux simulation)
      scene.add(new THREE.AmbientLight(0xffffff, 0.78));
      const keyLight = new THREE.DirectionalLight(0xffffff, 0.68);
      keyLight.position.set(25, 80, 45);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.35);
      fillLight.position.set(-40, 35, -35);
      scene.add(fillLight);

      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();
      STATE.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);

      // Pointer Events for 3D Selection & Direct 3D Drag-and-Drop (Capture phase prevents OrbitControls from rotating when grabbing 3D items)
      renderer.domElement.addEventListener('pointerdown', onCanvasPointerDown, { capture: true });
      window.addEventListener('pointermove', onWindowPointerMove);
      window.addEventListener('pointerup', onWindowPointerUp);
      window.addEventListener('resize', onWindowResize);

      rebuildStripGeometry();
    }

    // Builds the Authentic RCDC Black Granite Benchtop, Clear Acrylic Mat with Green Tape Tabs, and Yellow Top Ruler
    function buildRcdcBenchEnvironment() {
      const envGroup = new THREE.Group();

      // 1. Black Speckled Granite Benchtop Surface ("Black Background Benchtop")
      const graniteTex = createProceduralPadTexture('granite', '#181c20');
      const benchGeom = new THREE.BoxGeometry(190, 2.0, 125);
      const benchMat = new THREE.MeshStandardMaterial({
        map: graniteTex,
        roughness: 0.42,
        metalness: 0.12
      });
      const benchMesh = new THREE.Mesh(benchGeom, benchMat);
      benchMesh.position.set(4, -1.2, 0);
      benchMesh.receiveShadow = true;
      envGroup.add(benchMesh);

      // 2. Transparent Acrylic / Plastic Work Sheet on the Benchtop (as seen in Ref C, D, E, F)
      const acrylicGeom = new THREE.BoxGeometry(126, 0.18, 92);
      const acrylicMat = new THREE.MeshPhysicalMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.18,
        roughness: 0.1,
        metalness: 0.05,
        reflectivity: 0.9
      });
      const acrylicMatMesh = new THREE.Mesh(acrylicGeom, acrylicMat);
      acrylicMatMesh.position.set(-6, -0.05, 4);
      acrylicMatMesh.receiveShadow = true;
      envGroup.add(acrylicMatMesh);

      // Subtle glossy border outline of the clear acrylic work mat
      const acrylicEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(acrylicGeom),
        new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.55 })
      );
      acrylicEdges.position.copy(acrylicMatMesh.position);
      envGroup.add(acrylicEdges);

      // 3. Green Rectangular Tape Tabs holding down the left & top edges of the clear work mat (exact detail from RCDC photos)
      const tapeMat = new THREE.MeshStandardMaterial({ color: 0x9be564, roughness: 0.6 });
      const tapePositions = [
        { x: -69, z: -38, rotY: 0.35, w: 7.5, d: 4.8 }, // Top-left corner green tape
        { x: -69, z: 2,   rotY: 0.04, w: 7.5, d: 9.5 }, // Middle-left rectangular green tape tab
        { x: -68, z: 44,  rotY: -0.4, w: 8.5, d: 4.8 }, // Bottom-left corner green tape
        { x: 18,  z: -42, rotY: 0.1,  w: 7.0, d: 3.8 }  // Top-right green tape tab
      ];
      tapePositions.forEach(t => {
        const tapeMesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, 0.24, t.d), tapeMat);
        tapeMesh.position.set(t.x, 0.06, t.z);
        tapeMesh.rotation.y = t.rotY;
        envGroup.add(tapeMesh);
      });

      // 4. Yellow Measuring Tape / Ruler Strip along the top edge of the benchtop (seen in Ref C, D, E, F)
      const rulerGeom = new THREE.BoxGeometry(115, 0.22, 4.2);
      const rulerMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.45 });
      const rulerMesh = new THREE.Mesh(rulerGeom, rulerMat);
      rulerMesh.position.set(-12, 0.05, -51);
      rulerMesh.rotation.y = -0.02;
      envGroup.add(rulerMesh);

      // 5. Printed SOP Sheet resting at the top-right corner of the benchtop (seen in Ref C–F)
      const sopPaperGeom = new THREE.BoxGeometry(36, 0.15, 26);
      const sopPaperMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 });
      const sopPaperMesh = new THREE.Mesh(sopPaperGeom, sopPaperMat);
      sopPaperMesh.position.set(42, 0.05, -46);
      sopPaperMesh.rotation.y = 0.22;
      envGroup.add(sopPaperMesh);

      return envGroup;
    }

    // Coordinates for Page 2: 3D Component Explorer (Horizontal 69 mm layout matching Reference A)
    function computeExplorerCoordinates() {
      const d = RCDC_CONFIG.activeDimensions;
      const totalL = d.backingLengthMm; // 69 mm
      const rightEnd = totalL / 2;      // +34.5 mm
      const leftEnd = -totalL / 2;      // -34.5 mm
      const stripZ = STATE.isMasterSheetMode ? 48 : RCDC_CONFIG.metadata.cutStripWidthMm;

      const absorbentLen = d.absorbentPadWidthMm;
      const absorbentCenterX = leftEnd + absorbentLen / 2;

      const conjugateLen = d.conjugatePadWidthMm;
      const conjugateLeftX = rightEnd - d.conjugateLeftEdgeFromRightMm;
      const conjugateCenterX = conjugateLeftX + conjugateLen / 2;

      const reactionLen = d.reactionFilmWidthMm;
      const reactionRightX = conjugateLeftX + 2.0;
      const reactionCenterX = reactionRightX - reactionLen / 2;

      const sampleLen = d.samplePadWidthMm;
      const sampleCenterX = rightEnd - sampleLen / 2;

      const ctlX = conjugateLeftX - d.ctlDistanceFromReactionRightMm + 1.5;
      const tlX = conjugateLeftX - d.tlDistanceFromReactionRightMm + 1.5;

      return {
        totalL, stripZ,
        backing: { len: totalL, thick: 0.9, x: 0, y: 0, explodeMult: -4.8 },
        reaction_film: { len: reactionLen, thick: 0.65, x: reactionCenterX, y: 0.78, explodeMult: 0.5 },
        conjugate_pad: { len: conjugateLen, thick: 0.85, x: conjugateCenterX, y: 1.48, explodeMult: 4.2 },
        sample_pad: { len: sampleLen, thick: 1.05, x: sampleCenterX, y: 2.38, explodeMult: 8.5 },
        absorbent_pad: { len: absorbentLen, thick: 1.15, x: absorbentCenterX, y: 1.55, explodeMult: 6.2 },
        ctlX, tlX
      };
    }

    /**
     * Coordinates for Page 3: Guided Assembly Game (Authentic RCDC Vertical 30 cm Benchtop Perspective)
     * - In the RCDC photographs (Ref C, D, E, F), the 30 cm strip length runs vertically (along Z)
     *   and the 69 mm width runs left-to-right (along X), where:
     *   * Left Edge (0 mm) = Sample Pad end; Right Edge (69 mm) = Absorbent Pad end
     *   * Backing Sheet: 0 mm to 69 mm (width = 69 mm, centered at asmCenterX = -28)
     *   * Reaction Film (Membrane): 16 mm to 46 mm from Left Edge (30 mm wide; 2 mm overlap with Conjugate at 16–18 mm, 2 mm overlap with Absorbent at 44–46 mm)
     *   * CTL & TL Red Lines: 17 mm and 13 mm from the sample-side (left) edge of the Reaction Film (i.e. 33 mm and 29 mm from Left Edge)
     *   * Conjugate Pad: 8 mm to 18 mm from Left Edge (10 mm wide; overlaps Reaction Film from 16–18 mm, matching Ref A 18 mm & 10 mm callouts)
     *   * Sample Pad: 0 mm to samplePadWidthMm (20 mm Drawing / 25 mm Procedure) flush at Left Edge, overlapping Conjugate Pad
     *   * Absorbent Pad: (69 - absorbentPadWidthMm) to 69 mm (44–69 mm in Drawing) flush at Right Edge, overlapping Reaction Film (44–46 mm)
     *   * 3 Contiguous Release Liner Seals:
     *     - seal3 (Last seal, Step 6): 0 mm to 8 mm
     *     - seal2 (Second seal, Step 4): 8 mm to 16 mm
     *     - seal1 (First upper seal, Step 2): 16 mm to 69 mm (53 mm wide)
     */
    function computeGameBenchCoordinates() {
      const d = RCDC_CONFIG.activeDimensions;
      const scaleW = 0.36;              // Scale 69 mm width to ~24.84 units in X so all 5 staged strips fit side-by-side
      const stripLengthZ = 74;          // Vertical 30 cm master strip length along Z-axis
      const asmCenterX = -28;           // Assembly target zone on the left side of the acrylic mat
      const asmCenterZ = 6;

      const totalW = d.backingLengthMm * scaleW;         // 69 mm scaled
      const leftEdgeX = asmCenterX - totalW / 2;         // 0 mm mark (Left Edge = Sample End)
      const rightEdgeX = asmCenterX + totalW / 2;        // 69 mm mark (Right Edge = Absorbent End)

      // Exact physical widths (scaled)
      const reactW = d.reactionFilmWidthMm * scaleW;     // 30 mm
      const conjW = d.conjugatePadWidthMm * scaleW;      // 10 mm
      const sampleW = d.samplePadWidthMm * scaleW;       // 20 mm (Drawing) or 25 mm (Procedure)
      const absorbW = d.absorbentPadWidthMm * scaleW;    // 25 mm (Drawing) or 20 mm (Procedure)

      // Exact physical X centers across the 69 mm backing sheet (from leftEdgeX = 0 mm)
      const reactLeftMm = 16;                            // 16 mm to 46 mm (30 mm Membrane)
      const reactCenterX = leftEdgeX + (reactLeftMm + d.reactionFilmWidthMm / 2) * scaleW;

      const conjLeftMm = 8;                              // 8 mm to 18 mm (10 mm Conjugate Pad; overlaps Membrane 16–18 mm)
      const conjCenterX = leftEdgeX + (conjLeftMm + d.conjugatePadWidthMm / 2) * scaleW;

      const sampleCenterX = leftEdgeX + sampleW / 2;     // 0 mm to 20/25 mm flush with Left Edge
      const absorbCenterX = rightEdgeX - absorbW / 2;    // (69 - 25/20) mm to 69 mm flush with Right Edge

      // Red indicator line offsets relative to Reaction Film center (15 mm from left edge of 30 mm membrane)
      const tlOffsetFromReactCenter = (d.tlDistanceFromReactionRightMm - d.reactionFilmWidthMm / 2) * scaleW;   // 13 - 15 = -2 mm
      const ctlOffsetFromReactCenter = (d.ctlDistanceFromReactionRightMm - d.reactionFilmWidthMm / 2) * scaleW; // 17 - 15 = +2 mm

      // Contiguous 3-zone release liner seals covering 100% of 0–69 mm with zero gaps
      const seal3W = 8 * scaleW;                         // 0 mm to 8 mm
      const seal3CenterX = leftEdgeX + (4 * scaleW);
      const seal2W = 8 * scaleW;                         // 8 mm to 16 mm
      const seal2CenterX = leftEdgeX + (12 * scaleW);
      const seal1W = (d.backingLengthMm - 16) * scaleW;  // 16 mm to 69 mm (53 mm)
      const seal1CenterX = leftEdgeX + ((16 + d.backingLengthMm) / 2) * scaleW;

      return {
        scaleW,
        stripLengthZ,
        asmCenterX,
        asmCenterZ,
        cutterMachineX: 28,
        cutterMachineZ: 6,
        leftEdgeX,
        rightEdgeX,
        tlOffsetFromReactCenter,
        ctlOffsetFromReactCenter,
        // Assembled target coordinates on the left side of the acrylic mat (tiered Y heights prevent Z-fighting)
        assembled: {
          backing_sheet: { w: totalW,  thick: 0.65, x: asmCenterX,    y: 0.45, z: asmCenterZ },
          reaction_film: { w: reactW,  thick: 0.50, x: reactCenterX,  y: 1.08, z: asmCenterZ },
          conjugate_pad: { w: conjW,   thick: 0.58, x: conjCenterX,   y: 1.52, z: asmCenterZ },
          sample_pad:    { w: sampleW, thick: 0.68, x: sampleCenterX, y: 2.02, z: asmCenterZ },
          absorbent_pad: { w: absorbW, thick: 0.72, x: absorbCenterX, y: 1.58, z: asmCenterZ }
        },
        seals: {
          seal1: { w: seal1W, x: seal1CenterX, sealIndex: 1 },
          seal2: { w: seal2W, x: seal2CenterX, sealIndex: 2 },
          seal3: { w: seal3W, x: seal3CenterX, sealIndex: 3 }
        },
        // Staged components [1] to [5] laid out sequentially on the RIGHT side of the benchtop
        stagedRightX: {
          backing_sheet: 12,
          reaction_film: 32,
          conjugate_pad: 45,
          sample_pad:    56,
          absorbent_pad: 70
        }
      };
    }

    function disposeAndRemove(object) {
      if (!object || !scene) return;
      scene.remove(object);
      object.traverse(node => {
        if (node.geometry) node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach(material => {
          if (!material) return;
          Object.values(material).forEach(value => {
            if (value && value.isTexture) value.dispose();
          });
          material.dispose();
        });
      });
    }

    function rebuildStripGeometry() {
      [
        explorerGroup,
        gameBenchEnvironment,
        assembledMasterCardGroup,
        ...Object.values(gameAssembledMeshes),
        ...Object.values(stagedGameMeshes),
        ...Object.values(sealMeshes),
        ...Object.values(exposedWhiteZones),
        targetDropZoneMesh,
        cutterFeedDropZoneMesh,
        pressRollerMesh,
        cutterBladeMesh,
        stripCutterMachineGroup,
        cutStripsOutputGroup,
        alcoholGauzeMesh,
        qcScannerMesh,
        flowParticlesGroup,
        explorerFluidWaveMesh
      ].forEach(disposeAndRemove);

      [assembledMeshes, gameAssembledMeshes, stagedGameMeshes, sealMeshes, exposedWhiteZones].forEach(collection => {
        Object.keys(collection).forEach(key => delete collection[key]);
      });

      labelAnchors.length = 0;
      gameStagedBadges.length = 0;

      const cMap = {};
      RCDC_CONFIG.components.forEach(c => cMap[c.id] = c);

      // =======================================================================
      // A. BUILD EXPLORER GROUP (Horizontal Reference A Model for Page 2)
      // =======================================================================
      explorerGroup = new THREE.Group();
      const expGrid = new THREE.GridHelper(160, 32, 0x94a3b8, 0xcbd5e1);
      expGrid.position.y = -2.2;
      expGrid.material.opacity = 0.35;
      expGrid.material.transparent = true;
      explorerGroup.add(expGrid);

      const coords = computeExplorerCoordinates();

      function buildExplorerLayer(compConfig, spec) {
        const group = new THREE.Group();
        group.userData = {
          componentId: compConfig.id,
          baseX: spec.x,
          baseY: spec.y,
          baseZ: 0,
          explodeMultiplier: spec.explodeMult,
          lenX: spec.len,
          thickY: spec.thick
        };

        const geom = new THREE.BoxGeometry(spec.len, spec.thick, coords.stripZ);
        const tex = createProceduralPadTexture(compConfig.textureType, compConfig.colorHex);
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: compConfig.textureType === 'membrane' || compConfig.textureType === 'backing' ? 0.35 : 0.85,
          metalness: 0.04
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { componentId: compConfig.id, parentGroup: group };
        group.add(mesh);

        const wire = new THREE.LineSegments(
          new THREE.EdgesGeometry(geom),
          new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.35 })
        );
        wire.name = 'selectionWire';
        group.add(wire);

        group.position.set(spec.x, spec.y + STATE.explodeFactor * spec.explodeMult, 0);
        explorerGroup.add(group);
        return group;
      }

      assembledMeshes['backing_sheet'] = buildExplorerLayer(cMap['backing_sheet'], coords.backing);
      assembledMeshes['reaction_film'] = buildExplorerLayer(cMap['reaction_film'], coords.reaction_film);
      assembledMeshes['conjugate_pad'] = buildExplorerLayer(cMap['conjugate_pad'], coords.conjugate_pad);
      assembledMeshes['sample_pad'] = buildExplorerLayer(cMap['sample_pad'], coords.sample_pad);
      assembledMeshes['absorbent_pad'] = buildExplorerLayer(cMap['absorbent_pad'], coords.absorbent_pad);

      // Indicator Lines Group for Explorer Mode (Dynamic Materials for 2-Stage Flow Capture)
      const linesGroup = new THREE.Group();
      linesGroup.userData = {
        componentId: 'indicator_lines',
        baseX: 0,
        baseY: coords.reaction_film.y + 0.36,
        baseZ: 0,
        explodeMultiplier: 1.6,
        ctlX: coords.ctlX,
        tlX: coords.tlX
      };
      const lineGeom = new THREE.BoxGeometry(0.95, 0.15, coords.stripZ + 0.08);
      const ctlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
      const tlMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
      explorerCtlLineMesh = new THREE.Mesh(lineGeom, ctlMat);
      explorerCtlLineMesh.position.set(coords.ctlX, 0, 0);
      explorerCtlLineMesh.userData = { componentId: 'indicator_lines' };
      explorerTlLineMesh = new THREE.Mesh(lineGeom, tlMat);
      explorerTlLineMesh.position.set(coords.tlX, 0, 0);
      explorerTlLineMesh.userData = { componentId: 'indicator_lines' };
      linesGroup.add(explorerCtlLineMesh, explorerTlLineMesh);
      linesGroup.position.set(0, coords.reaction_film.y + 0.36 + STATE.explodeFactor * 1.6, 0);
      explorerGroup.add(linesGroup);
      assembledMeshes['indicator_lines'] = linesGroup;

      // Register Floating 3D Callout Labels for Explorer Mode (with staggered offsets to prevent congestion)
      const customOffsets = {
        backing_sheet:  new THREE.Vector3(-8, -1.6, 2.2),
        reaction_film:  new THREE.Vector3(2, 0.9, -2.2),
        conjugate_pad:  new THREE.Vector3(3, 1.3, 2.2),
        sample_pad:     new THREE.Vector3(4, 1.6, -1.5),
        absorbent_pad:  new THREE.Vector3(-3, 1.5, 0)
      };

      ['backing_sheet', 'reaction_film', 'conjugate_pad', 'sample_pad', 'absorbent_pad'].forEach(id => {
        const comp = cMap[id];
        const grp = assembledMeshes[id];
        labelAnchors.push({
          id,
          name: comp.shortLabel,
          dimText: `${grp.userData.lenX} mm`,
          hasConflict: Boolean(comp.conflictNote),
          group: grp,
          localOffset: customOffsets[id] || new THREE.Vector3(0, grp.userData.thickY / 2 + 1.0, 0)
        });
      });
      labelAnchors.push({
        id: 'indicator_lines',
        name: 'CTL (17mm) & TL (13mm)',
        dimText: 'Red Lines',
        hasConflict: false,
        group: linesGroup,
        localOffset: new THREE.Vector3((coords.ctlX + coords.tlX) / 2 - 4, 2.1, -2.5)
      });

      scene.add(explorerGroup);

      // =======================================================================
      // B. BUILD AUTHENTIC RCDC VERTICAL 30cm BENCHTOP FOR PAGE 3: ASSEMBLY GAME
      // =======================================================================
      gameBenchEnvironment = buildRcdcBenchEnvironment();
      scene.add(gameBenchEnvironment);

      const gCoords = computeGameBenchCoordinates();

      function buildVerticalGameStrip(compConfig, spec, isStagedOnRight = false, stagedX = 0) {
        const group = new THREE.Group();
        const posX = isStagedOnRight ? stagedX : spec.x;
        const posY = isStagedOnRight ? 0.45 : spec.y;
        const posZ = spec.z;

        group.userData = {
          componentId: compConfig.id,
          isStagedPart: isStagedOnRight,
          baseX: posX,
          baseY: posY,
          baseZ: posZ,
          widthX: spec.w,
          thickY: spec.thick
        };

        // Vertical 30 cm strip: X = width (mm scaled), Y = thickness, Z = 30 cm length
        const geom = new THREE.BoxGeometry(spec.w, spec.thick, gCoords.stripLengthZ);
        const tex = createProceduralPadTexture(compConfig.textureType, compConfig.colorHex);
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: compConfig.textureType === 'membrane' || compConfig.textureType === 'backing' ? 0.35 : 0.85,
          metalness: 0.04
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { componentId: compConfig.id, isStagedPart: isStagedOnRight, parentGroup: group };
        group.add(mesh);

        const wire = new THREE.LineSegments(
          new THREE.EdgesGeometry(geom),
          new THREE.LineBasicMaterial({
            color: isStagedOnRight ? 0x38bdf8 : 0x334155,
            transparent: true,
            opacity: isStagedOnRight ? 0.55 : 0.35
          })
        );
        group.add(wire);

        group.position.set(posX, posY, posZ);
        if (isStagedOnRight) scene.add(group);
        return group;
      }

      // 1. Build Assembled Vertical Strips inside `assembledMasterCardGroup` on the Left Acrylic Mat (X around -28)
      assembledMasterCardGroup = new THREE.Group();
      assembledMasterCardGroup.position.set(0, 0, 0);
      scene.add(assembledMasterCardGroup);

      ['backing_sheet', 'reaction_film', 'conjugate_pad', 'sample_pad', 'absorbent_pad'].forEach(id => {
        gameAssembledMeshes[id] = buildVerticalGameStrip(cMap[id], gCoords.assembled[id], false);
        gameAssembledMeshes[id].visible = false;
        assembledMasterCardGroup.add(gameAssembledMeshes[id]);
      });

      // 2. Build Staged Vertical Strips [1] to [5] Sequentially on the RIGHT Side of the Benchtop
      ['backing_sheet', 'reaction_film', 'conjugate_pad', 'sample_pad', 'absorbent_pad'].forEach((id, idx) => {
        const rightX = gCoords.stagedRightX[id];
        const stagedGrp = buildVerticalGameStrip(cMap[id], gCoords.assembled[id], true, rightX);
        stagedGrp.visible = false;
        stagedGameMeshes[id] = stagedGrp;

        // Register floating [1]–[5] numbered badge above each staged strip on the right side of the bench
        gameStagedBadges.push({
          id,
          badgeNum: idx + 1,
          name: cMap[id].name,
          group: stagedGrp,
          localOffset: new THREE.Vector3(0, 1.5, -gCoords.stripLengthZ / 2 - 4)
        });
      });

      // 3. Build 3 Contiguous Glossy White Adhesive Zones + 3 Segmented Curling Release Liner Seals (Steps 2, 4, 6)
      const whiteAdhesiveMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.18,
        metalness: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -1
      });

      Object.entries(gCoords.seals).forEach(([key, spec]) => {
        // A. White adhesive backing surface revealed after peeling
        const whiteGeom = new THREE.BoxGeometry(spec.w - 0.04, 0.06, gCoords.stripLengthZ - 0.1);
        const whiteMesh = new THREE.Mesh(whiteGeom, whiteAdhesiveMat.clone());
        whiteMesh.position.set(spec.x, 0.79, gCoords.asmCenterZ);
        whiteMesh.visible = false;
        assembledMasterCardGroup.add(whiteMesh);
        exposedWhiteZones[key] = whiteMesh;

        // B. Segmented Curling Release Liner Mesh (Green protective release paper with a cyan pull-tab at top)
        const linerGeom = new THREE.PlaneGeometry(spec.w - 0.04, gCoords.stripLengthZ, 1, 40);
        linerGeom.rotateX(-Math.PI / 2);

        const posAttr = linerGeom.attributes.position;
        const basePositions = new Float32Array(posAttr.array.length);
        basePositions.set(posAttr.array);
        linerGeom.userData.basePositions = basePositions;

        const linerCanvas = document.createElement('canvas');
        linerCanvas.width = 128;
        linerCanvas.height = 512;
        const lctx = linerCanvas.getContext('2d');
        lctx.fillStyle = '#8ccf70';
        lctx.fillRect(0, 0, 128, 512);
        lctx.strokeStyle = 'rgba(45, 90, 35, 0.45)';
        lctx.lineWidth = 3;
        lctx.strokeRect(2, 2, 124, 508);
        lctx.fillStyle = '#38bdf8';
        lctx.fillRect(0, 0, 128, 46);
        lctx.fillStyle = '#0f172a';
        lctx.font = 'bold 20px monospace';
        lctx.textAlign = 'center';
        lctx.fillText(`SEAL #${spec.sealIndex}`, 64, 30);

        const linerTex = new THREE.CanvasTexture(linerCanvas);
        const linerMat = new THREE.MeshStandardMaterial({
          map: linerTex,
          roughness: 0.4,
          metalness: 0.05,
          side: THREE.DoubleSide
        });

        const sealMesh = new THREE.Mesh(linerGeom, linerMat);
        sealMesh.position.set(spec.x, 0.84, gCoords.asmCenterZ);
        sealMesh.castShadow = true;
        sealMesh.userData = {
          isPeelSeal: true,
          sealKey: key,
          sealIndex: spec.sealIndex,
          stripLengthZ: gCoords.stripLengthZ
        };
        sealMesh.visible = false;
        scene.add(sealMesh);
        sealMeshes[key] = sealMesh;
      });

      // 4. Glowing Target Drop-Zone Mesh on the Left Acrylic Work Mat
      const dropGeom = new THREE.BoxGeometry(10, 1.4, gCoords.stripLengthZ + 1.2);
      const dropMat = new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        wireframe: true,
        transparent: true,
        opacity: 0.9
      });
      targetDropZoneMesh = new THREE.Mesh(dropGeom, dropMat);
      targetDropZoneMesh.visible = false;
      scene.add(targetDropZoneMesh);

      // 5. Blue-Gloved Hand / Cover Paper Press Roller Mesh
      const rollerGeom = new THREE.CylinderGeometry(2.2, 2.2, gCoords.assembled.backing_sheet.w + 4, 24);
      rollerGeom.rotateZ(Math.PI / 2);
      const rollerMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35, metalness: 0.1 });
      pressRollerMesh = new THREE.Mesh(rollerGeom, rollerMat);
      pressRollerMesh.visible = false;
      scene.add(pressRollerMesh);

      // 7. Programmable Guillotine Strip Cutter Machine (`stripCutterMachineGroup`) + Reciprocating Blade (`cutterBladeMesh`)
      stripCutterMachineGroup = new THREE.Group();
      const bodyW = gCoords.assembled.backing_sheet.w + 11;
      const machineX = gCoords.cutterMachineX;
      const machineZ = gCoords.cutterMachineZ;

      // Machine stainless base plate & outfeed collection chute on the benchtop
      const basePlateGeom = new THREE.BoxGeometry(bodyW + 6, 0.6, 48);
      const basePlateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.55, roughness: 0.4 });
      const basePlateMesh = new THREE.Mesh(basePlateGeom, basePlateMat);
      basePlateMesh.position.set(0, 0.3, 10);
      basePlateMesh.receiveShadow = true;
      stripCutterMachineGroup.add(basePlateMesh);

      // Outfeed collection tray walls where cut strips come out in front of the machine
      const trayBedGeom = new THREE.BoxGeometry(bodyW + 2, 0.35, 34);
      const trayBedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.3, roughness: 0.5 });
      const trayBedMesh = new THREE.Mesh(trayBedGeom, trayBedMat);
      trayBedMesh.position.set(0, 0.65, 22);
      stripCutterMachineGroup.add(trayBedMesh);

      // Left & Right anodized aluminum upright pillars
      const pillarGeom = new THREE.BoxGeometry(2.4, 11.5, 7.5);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.65, roughness: 0.3 });
      const leftPillar = new THREE.Mesh(pillarGeom, pillarMat);
      leftPillar.position.set(-bodyW / 2, 5.75, 0);
      leftPillar.castShadow = true;
      const rightPillar = new THREE.Mesh(pillarGeom, pillarMat);
      rightPillar.position.set(bodyW / 2, 5.75, 0);
      rightPillar.castShadow = true;
      stripCutterMachineGroup.add(leftPillar, rightPillar);

      // Top overhead gantry housing & digital control bridge
      const bridgeGeom = new THREE.BoxGeometry(bodyW + 2.6, 3.4, 8.2);
      const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.35 });
      const bridgeMesh = new THREE.Mesh(bridgeGeom, bridgeMat);
      bridgeMesh.position.set(0, 10.6, 0);
      bridgeMesh.castShadow = true;
      stripCutterMachineGroup.add(bridgeMesh);

      // Glowing cyan digital LCD status screen on top of the cutter gantry
      const lcdGeom = new THREE.BoxGeometry(11, 1.3, 0.35);
      const lcdMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const lcdMesh = new THREE.Mesh(lcdGeom, lcdMat);
      lcdMesh.position.set(0, 10.7, 4.15);
      stripCutterMachineGroup.add(lcdMesh);

      // Yellow safety caution stripe across the cutter guard
      const guardGeom = new THREE.BoxGeometry(bodyW - 2.2, 0.7, 0.25);
      const guardMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const guardMesh = new THREE.Mesh(guardGeom, guardMat);
      guardMesh.position.set(0, 7.8, 3.85);
      stripCutterMachineGroup.add(guardMesh);

      // Rubberized feed roller inside the cutter bridge
      const feedRollerGeom = new THREE.CylinderGeometry(1.1, 1.1, bodyW - 2.6, 20);
      feedRollerGeom.rotateZ(Math.PI / 2);
      const feedRollerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 });
      const feedRollerMesh = new THREE.Mesh(feedRollerGeom, feedRollerMat);
      feedRollerMesh.position.set(0, 2.2, -2.0);
      stripCutterMachineGroup.add(feedRollerMesh);

      // Stainless-steel reciprocating guillotine blade inside the machine gantry
      const bladeGeom = new THREE.BoxGeometry(bodyW - 2.8, 4.8, 0.32);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.12 });
      cutterBladeMesh = new THREE.Mesh(bladeGeom, bladeMat);
      cutterBladeMesh.position.set(0, 6.2, 0.8);
      stripCutterMachineGroup.add(cutterBladeMesh);

      // Glowing Infeed Drop-Zone Box showing where to drag & insert the assembled 30 cm master card
      const feedZoneGeom = new THREE.BoxGeometry(gCoords.assembled.backing_sheet.w + 2.5, 3.2, 24);
      const feedZoneMat = new THREE.MeshBasicMaterial({
        color: 0x818cf8,
        wireframe: true,
        transparent: true,
        opacity: 0.85
      });
      cutterFeedDropZoneMesh = new THREE.Mesh(feedZoneGeom, feedZoneMat);
      cutterFeedDropZoneMesh.position.set(0, 2.2, -13);
      stripCutterMachineGroup.add(cutterFeedDropZoneMesh);

      // Output group holding individual sliced 69 mm × 7.5 mm ICT test strips emerging out the front of the machine
      cutStripsOutputGroup = new THREE.Group();
      const numVisualSlices = STATE.totalCutSlices;
      const slicePitchZ = gCoords.stripLengthZ / numVisualSlices;
      for (let i = 0; i < numVisualSlices; i++) {
        const singleStrip = new THREE.Group();
        const stripD = slicePitchZ * 0.72;
        // Backing base
        const bMesh = new THREE.Mesh(
          new THREE.BoxGeometry(gCoords.assembled.backing_sheet.w, 0.45, stripD),
          new THREE.MeshStandardMaterial({ color: 0x7ab87a, roughness: 0.4 })
        );
        // White membrane center
        const mMesh = new THREE.Mesh(
          new THREE.BoxGeometry(gCoords.assembled.reaction_film.w, 0.35, stripD),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
        );
        mMesh.position.set(gCoords.assembled.reaction_film.x - gCoords.asmCenterX, 0.35, 0);
        // Purple conjugate pad
        const cMesh = new THREE.Mesh(
          new THREE.BoxGeometry(gCoords.assembled.conjugate_pad.w, 0.4, stripD),
          new THREE.MeshStandardMaterial({ color: 0xb84d9e, roughness: 0.6 })
        );
        cMesh.position.set(gCoords.assembled.conjugate_pad.x - gCoords.asmCenterX, 0.45, 0);
        // Sample pad (left)
        const sMesh = new THREE.Mesh(
          new THREE.BoxGeometry(gCoords.assembled.sample_pad.w, 0.45, stripD),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
        );
        sMesh.position.set(gCoords.assembled.sample_pad.x - gCoords.asmCenterX, 0.55, 0);
        // Absorbent pad (right)
        const aMesh = new THREE.Mesh(
          new THREE.BoxGeometry(gCoords.assembled.absorbent_pad.w, 0.48, stripD),
          new THREE.MeshStandardMaterial({ color: 0xdfd3c3, roughness: 0.7 })
        );
        aMesh.position.set(gCoords.assembled.absorbent_pad.x - gCoords.asmCenterX, 0.52, 0);

        singleStrip.add(bMesh, mMesh, cMesh, sMesh, aMesh);
        const targetOutZ = machineZ + 4.5 + i * 2.15;
        singleStrip.userData = {
          bladeZ: machineZ + 1.0,
          targetX: machineX + ((i % 2 === 0 ? 1 : -1) * 0.45),
          targetY: 0.95 + (i % 3) * 0.14,
          targetZ: targetOutZ,
          targetRotY: (i % 2 === 0 ? 1 : -1) * 0.035
        };
        singleStrip.position.set(machineX, 0.95, machineZ + 1.0);
        singleStrip.visible = false;
        cutStripsOutputGroup.add(singleStrip);
      }

      stripCutterMachineGroup.position.set(machineX, 0, machineZ);
      stripCutterMachineGroup.visible = false;
      scene.add(stripCutterMachineGroup);
      scene.add(cutStripsOutputGroup);

      // 8. Step 10 Alignment Inspection Laser Scanner Bar (Scans vertically across the assembled 30cm master card)
      const qcGeom = new THREE.BoxGeometry(gCoords.assembled.backing_sheet.w + 6, 0.45, 1.4);
      const qcMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
      qcScannerMesh = new THREE.Mesh(qcGeom, qcMat);
      qcScannerMesh.visible = false;
      scene.add(qcScannerMesh);

      // 9. Upgraded 2-Stage Biochemical Lateral Flow Particles + Capillary Fluid Wave (Explorer Mode)
      flowParticlesGroup = new THREE.Group();
      for (let i = 0; i < 24; i++) {
        const spMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
        const sp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), spMat);
        sp.position.set((Math.random() - 0.5) * 6.5, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * (coords.stripZ * 0.72));
        flowParticlesGroup.add(sp);
      }
      flowParticlesGroup.visible = false;
      scene.add(flowParticlesGroup);

      // Translucent capillary fluid front wave migrating across the strip in Explorer Mode
      const waveGeom = new THREE.BoxGeometry(7.5, 0.25, coords.stripZ * 0.92);
      const waveMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.38
      });
      explorerFluidWaveMesh = new THREE.Mesh(waveGeom, waveMat);
      explorerFluidWaveMesh.visible = false;
      scene.add(explorerFluidWaveMesh);

      createDomLabelsOverlay();
      renderExplorerBottomDock();
      renderOverviewRefASvg();

      if (STATE.activePage === 'game') {
        explorerGroup.visible = false;
        gameBenchEnvironment.visible = true;
        sync3DSceneForGameStep();
      } else {
        explorerGroup.visible = true;
        gameBenchEnvironment.visible = false;
        highlightSelectedMesh();
      }
    }

    function createDomLabelsOverlay() {
      const container = document.getElementById('labelsOverlay');
      container.innerHTML = '';

      // 1. Explorer Mode Floating 3D Callout Pills (Compact size to avoid congestion)
      labelAnchors.forEach(anchor => {
        const el = document.createElement('div');
        el.className = `label-3d cursor-pointer select-none px-1.5 py-0.5 rounded-full shadow-md border text-[9px] font-medium flex items-center gap-1 whitespace-nowrap backdrop-blur-sm ${
          anchor.hasConflict
            ? 'bg-amber-950/85 border-amber-400/80 text-amber-200'
            : 'bg-slate-900/80 border-slate-600/80 text-white'
        }`;
        el.innerHTML = `
          <span>${anchor.name}</span>
          <span class="font-mono-tech font-semibold px-1 py-0 rounded-full text-[8px] ${
            anchor.hasConflict ? 'bg-amber-400 text-slate-950' : 'bg-sky-500/30 text-sky-300'
          }">${anchor.dimText}${anchor.hasConflict ? '*' : ''}</span>
        `;
        el.onclick = (e) => {
          e.stopPropagation();
          selectComponent(anchor.id);
        };
        anchor.domElement = el;
        container.appendChild(el);
      });

      // 2. Game Mode Floating [1]–[5] Numbered Badges on the Right Side of the Benchtop (matching Ref B)
      gameStagedBadges.forEach(badge => {
        const el = document.createElement('div');
        el.className = 'label-3d cursor-grab active:cursor-grabbing select-none px-1.5 py-0.5 rounded shadow border border-sky-300/60 bg-sky-900/85 text-white font-mono-tech text-[9px] font-bold flex items-center gap-1 whitespace-nowrap';
        el.innerHTML = `<span>[${badge.badgeNum}]</span><span class="text-[8px] font-sans font-medium text-sky-200 hidden sm:inline">${badge.name.split(' ')[0]}</span>`;
        el.onpointerdown = (e) => {
          e.stopPropagation();
          startTrayCardDrag(e, badge.id);
        };
        badge.domElement = el;
        container.appendChild(el);
      });
    }

    function updateDomLabelsPosition() {
      const wHalf = renderer.domElement.clientWidth / 2;
      const hHalf = renderer.domElement.clientHeight / 2;

      // Explorer Labels
      labelAnchors.forEach(anchor => {
        if (!anchor.domElement) return;
        if (STATE.activePage !== 'explorer' || !STATE.showLabels || !anchor.group.visible) {
          anchor.domElement.style.display = 'none';
          return;
        }
        const worldPos = new THREE.Vector3();
        anchor.group.getWorldPosition(worldPos);
        worldPos.add(anchor.localOffset);
        worldPos.project(camera);

        if (worldPos.z > 1) {
          anchor.domElement.style.display = 'none';
          return;
        }
        const x = (worldPos.x * wHalf) + wHalf;
        const y = -(worldPos.y * hHalf) + hHalf;
        anchor.domElement.style.display = 'flex';
        anchor.domElement.style.left = `${x}px`;
        anchor.domElement.style.top = `${y}px`;
      });

      // Game Mode Right-Side Staged Badges [1]–[5]
      gameStagedBadges.forEach(badge => {
        if (!badge.domElement) return;
        if (STATE.activePage !== 'game' || !badge.group.visible) {
          badge.domElement.style.display = 'none';
          return;
        }
        const worldPos = new THREE.Vector3();
        badge.group.getWorldPosition(worldPos);
        worldPos.add(badge.localOffset);
        worldPos.project(camera);

        if (worldPos.z > 1) {
          badge.domElement.style.display = 'none';
          return;
        }
        const x = (worldPos.x * wHalf) + wHalf;
        const y = -(worldPos.y * hHalf) + hHalf;
        badge.domElement.style.display = 'flex';
        badge.domElement.style.left = `${x}px`;
        badge.domElement.style.top = `${y}px`;
      });
    }

    