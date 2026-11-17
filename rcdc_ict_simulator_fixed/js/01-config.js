/***************************************************************************
     * 1. CONFIGURABLE DATA MODULE (`components.js` equivalent)
     ***************************************************************************/
    const RCDC_CONFIG = {
      metadata: {
        documentTitle: "ICT-Kit Assembly Process",
        version: "Version 01",
        listedEffectiveDate: "26 October 2026",
        totalLengthMm: 69,
        masterWidthMm: 300,
        cutStripWidthMm: 7.5
      },

      activeDimensions: {
        presetKey: 'drawing',
        backingLengthMm: 69,
        reactionFilmWidthMm: 30,
        conjugatePadWidthMm: 10,
        samplePadWidthMm: 20,    // 20 mm in Ref A Drawing vs 25 mm in Procedure
        absorbentPadWidthMm: 25, // 25 mm in Ref A Drawing vs 20 mm in Procedure
        absorbentRightEdgeFromRightMm: 44,
        conjugateLeftEdgeFromRightMm: 18,
        conjugateRightEdgeFromRightMm: 10,
        ctlDistanceFromReactionRightMm: 17,
        tlDistanceFromReactionRightMm: 13
      },

      components: [
        {
          id: 'backing_sheet',
          number: 1,
          name: 'Backing Sheet',
          shortLabel: 'Backing (69mm)',
          provisionalNote: null,
          conflictNote: null,
          procedureSpec: '69 mm × 30 cm',
          drawingSpec: '69 mm',
          colorHex: '#7ab87a',
          thicknessMm: 0.9,
          textureType: 'backing',
          refPhoto: 'RefB',
          functionDesc: 'The backing sheet has a specification of 69 mm × 30 cm and serves as the supporting base of the test strip. It provides structural support and holds all the strip components in their correct positions and alignment. Its principle is to provide a stable adhesive surface for assembling the membrane, conjugate pad, sample pad, and absorbent pad.'
        },
        {
          id: 'reaction_film',
          number: 2,
          name: 'Membrane',
          shortLabel: 'Membrane (30mm)',
          provisionalNote: 'PROVISIONAL LABEL: Procedure lists "Membrane (30 mm × 30 cm)"; Reference A labels this "Reaction film (30 mm)". Confirm with technical owner whether these refer to the same physical layer.',
          conflictNote: null,
          procedureSpec: '30 mm × 30 cm',
          drawingSpec: '30 mm (Reaction film)',
          colorHex: '#f8fafc',
          thicknessMm: 0.65,
          textureType: 'membrane',
          refPhoto: 'RefC',
          functionDesc: 'The membrane has a specification of 30 mm × 30 cm and contains the immobilized Test and Control lines. It is the main reaction area where the test result is generated. As the sample migrates along the membrane, antigen–antibody reactions occur, producing visible lines at the appropriate test and control regions.'
        },
        {
          id: 'conjugate_pad',
          number: 3,
          name: 'Conjugate Pad',
          shortLabel: 'Conjugate (10mm)',
          provisionalNote: null,
          conflictNote: null,
          procedureSpec: '10 mm × 30 cm',
          drawingSpec: '10 mm',
          colorHex: '#b84d9e',
          thicknessMm: 0.85,
          textureType: 'fibrous',
          refPhoto: 'RefD',
          functionDesc: 'The conjugate pad has a specification of 10 mm × 30 cm and contains gold-labelled antibodies. Its function is to release these antibodies when the sample flows through the strip. The antibodies interact with the target H. pylori antigen in the sample and migrate together toward the membrane.'
        },
        {
          id: 'sample_pad',
          number: 4,
          name: 'Sample Pad',
          shortLabel: 'Sample Pad*',
          provisionalNote: null,
          conflictNote: 'DIMENSION CONFIRMATION REQUIRED: Procedure lists 25 mm × 30 cm; Final Annotated Drawing (Ref A) labels 20 mm. Confirm controlled value before locking.',
          procedureSpec: '25 mm × 30 cm (Conflict)',
          drawingSpec: '20 mm (Conflict)',
          colorHex: '#ffffff',
          thicknessMm: 1.05,
          textureType: 'mesh',
          refPhoto: 'RefE',
          functionDesc: 'The sample pad receives the stool-buffer mixture and introduces the sample into the test strip. It allows the sample to be absorbed and transferred gradually to the next components, helping to ensure a controlled and consistent flow through the strip.'
        },
        {
          id: 'absorbent_pad',
          number: 5,
          name: 'Absorbent Pad',
          shortLabel: 'Absorbent Pad*',
          provisionalNote: null,
          conflictNote: 'DIMENSION CONFIRMATION REQUIRED: Procedure lists 20 mm × 30 cm; Final Annotated Drawing (Ref A) labels 25 mm. Confirm controlled value before locking.',
          procedureSpec: '20 mm × 30 cm (Conflict)',
          drawingSpec: '25 mm (Conflict)',
          colorHex: '#dfd3c3',
          thicknessMm: 1.15,
          textureType: 'fibrous_beige',
          refPhoto: 'RefF',
          functionDesc: 'The absorbent pad draws the liquid along the test strip and absorbs excess fluid. Its principle is based on capillary action, which helps maintain continuous sample flow through the membrane and supports the proper functioning of the lateral-flow test.'
        },
        {
          id: 'indicator_lines',
          number: 6,
          name: 'TL (13mm) & CTL (17mm)',
          shortLabel: 'CTL/TL Lines',
          provisionalNote: 'Shown strictly as thin red lines on the reaction film as represented in Reference A.',
          conflictNote: null,
          procedureSpec: 'On Membrane',
          drawingSpec: 'CTL: 17mm | TL: 13mm',
          colorHex: '#dc2626',
          thicknessMm: 0.15,
          textureType: 'smooth',
          refPhoto: 'RefA',
          functionDesc: 'Control Line (CTL: 17 mm) and Test Line (TL: 13 mm) on the reaction film.'
        }
      ],
      // Interactive Drag Tray Items for the Guided Assembly Game (Sequential [1]-[5] Materials + Bench Tools)
      gameTrayItems: [
        { id: 'backing_sheet', badge: '1', label: 'Backing Sheet', sub: '69 mm × 30 cm • Green Base', color: '#8fd175', icon: '1', category: 'strip' },
        { id: 'reaction_film', badge: '2', label: 'Membrane Film', sub: '30 mm × 30 cm • White Film', color: '#f8fafc', icon: '2', category: 'strip' },
        { id: 'conjugate_pad', badge: '3', label: 'Conjugate Pad', sub: '10 mm × 30 cm • Purple/Pink', color: '#c85bb0', icon: '3', category: 'strip' },
        { id: 'sample_pad', badge: '4', label: 'Sample Pad*', sub: '25/20 mm × 30 cm • Fibrous', color: '#e2e8f0', icon: '4', category: 'strip' },
        { id: 'absorbent_pad', badge: '5', label: 'Absorbent Pad*', sub: '20/25 mm × 30 cm • Off-White', color: '#ebe6dc', icon: '5', category: 'strip' }
      ],

      environmentalConditions: [
        { id: 'env_lux', label: 'Light intensity > 1000 lux', detail: 'Pre-work lighting requirement' },
        { id: 'env_hum', label: 'Humidity below 60%', detail: 'Moisture control for pads' },
        { id: 'env_temp', label: 'Room temperature 19–25°C', detail: 'Controlled operating range' },
        { id: 'env_alc', label: 'Decontaminate with 70% alcohol', detail: 'Before and after work' },
        { id: 'env_logs', label: 'Maintain the relevant logs', detail: 'Laboratory record keeping' },
        { id: 'env_seq', label: 'Materials arranged in sequence', detail: 'Layout 1 to 5 (Ref B)' }
      ],

      // 10 Streamlined Assembly Steps (Removed former Steps 2, 11, 13) mapped to Authentic RCDC Vertical 30cm Benchtop Layout
      assemblySteps: [
        {
          step: 1,
          instruction: "Place the backing sheet on the benchtop.",
          requiredItem: "backing_sheet",
          actionType: "DRAG STRIP [1] FROM RIGHT",
          hint: "Grab Strip [1] Backing Sheet (69mm × 30cm green strip) from the right side of the benchtop (or Right Dock) and drag it left onto the glowing acrylic work mat.",
          refPhoto: "RefB",
          technicalFlag: null
        },
        {
          step: 2,
          instruction: "Remove the upper first seal from the backing sheet.",
          requiredItem: "tool_peel",
          actionType: "PEEL FIRST SEAL LINER",
          hint: "Click and drag the green First Seal liner downward/upward to curl it off and expose the white adhesive zone underneath.",
          refPhoto: "RefC",
          technicalFlag: "CONCEPTUAL ANIMATION: Peeling the green release liner reveals the white adhesive backing underneath."
        },
        {
          step: 3,
          instruction: "Paste the membrane carefully on the backing sheet with the projected side facing left.",
          requiredItem: "reaction_film",
          actionType: "DRAG STRIP [2] FROM RIGHT",
          hint: "Grab Strip [2] Membrane (30mm × 30cm white strip) from the right side of the benchtop (or Right Dock) and align it onto the exposed white adhesive zone.",
          refPhoto: "RefC",
          technicalFlag: "CLARIFICATION REQUIRED: Confirm intended meaning of 'projected side facing left' and whether 'Membrane' & 'Reaction film' are identical."
        },
        {
          step: 4,
          instruction: "Remove the second seal of the backing sheet.",
          requiredItem: "tool_peel",
          actionType: "PEEL SECOND SEAL LINER",
          hint: "Click and drag the green Second Seal liner along the left side of the backing sheet to curl it off and reveal the white adhesive strip underneath.",
          refPhoto: "RefD",
          technicalFlag: "CONCEPTUAL ANIMATION: Illustrates removing the second protective release liner to expose the white adhesive zone."
        },
        {
          step: 5,
          instruction: "Align and stick the conjugate pad.",
          requiredItem: "conjugate_pad",
          actionType: "DRAG STRIP [3] FROM RIGHT",
          hint: "Grab Strip [3] Conjugate Pad (10mm × 30cm purple/pink strip) from the right side of the benchtop and stick it along the newly exposed white adhesive zone (Ref D).",
          refPhoto: "RefD",
          technicalFlag: "Confirm controlled overlap distance (in mm) between Conjugate Pad and Membrane from the approved specification."
        },
        {
          step: 6,
          instruction: "Remove the last seal of the backing sheet.",
          requiredItem: "tool_peel",
          actionType: "PEEL LAST SEAL LINER",
          hint: "Click and drag the final green Seal #3 liner off the far-left edge of the backing sheet to expose the white adhesive zone underneath.",
          refPhoto: "RefE",
          technicalFlag: "CONCEPTUAL ANIMATION: Illustrates removing the final release liner to expose the white adhesive backing."
        },
        {
          step: 7,
          instruction: "Align and stick the sample pad.",
          requiredItem: "sample_pad",
          actionType: "DRAG STRIP [4] FROM RIGHT",
          hint: "Grab Strip [4] Sample Pad (white fibrous strip) from the right side of the benchtop and align it along the left edge overlapping the purple conjugate pad (Ref E).",
          refPhoto: "RefE",
          technicalFlag: "DIMENSION CONFLICT: Procedure lists Sample Pad = 25 mm × 30 cm; Final Drawing (Ref A) labels 20 mm. Confirm controlled dimension."
        },
        {
          step: 8,
          instruction: "Align and stick the absorbent pad on the top edge of the backing sheet and press down gently for adhesion.",
          requiredItem: "absorbent_pad",
          actionType: "DRAG STRIP [5] FROM RIGHT",
          hint: "Grab Strip [5] Absorbent Pad (off-white/beige strip) from the right side of the benchtop and stick it along the opposite (right) edge of the backing sheet (Ref F).",
          refPhoto: "RefF",
          technicalFlag: "DIMENSION CONFLICT: Procedure lists Absorbent Pad = 20 mm × 30 cm; Final Drawing (Ref A) labels 25 mm. Also confirm 'top edge' orientation."
        }
      ],

      quizBank: [
        {
          id: 'q1',
          question: "1. What discrepancy exists between the RCDC procedure materials list and the final annotated drawing (Reference A)?",
          options: [
            "Procedure lists Sample pad = 25 mm & Absorbent pad = 20 mm; Final Drawing labels Sample pad = 20 mm & Absorbent pad = 25 mm.",
            "Procedure lists Backing sheet = 100 mm; Final Drawing shows 50 mm.",
            "Conjugate pad is omitted from the drawing."
          ],
          correctIndex: 0,
          explanation: "Both sources show Backing sheet (69 mm), Membrane/Reaction film (30 mm), and Conjugate pad (10 mm), but swap the 20 mm and 25 mm dimensions for the Sample and Absorbent pads."
        },
        {
          id: 'q2',
          question: "2. Which environmental preparation conditions are stated on Page 1 of the RCDC procedure?",
          options: [
            "Light > 1000 lux, Humidity < 60%, Room temperature 19–25°C, and 70% alcohol decontamination before and after work.",
            "Light > 200 lux, Humidity > 80%, Room temperature 30–37°C.",
            "No environmental conditions are mentioned."
          ],
          correctIndex: 0,
          explanation: "Page 1 explicitly lists Light > 1000 lux, Humidity < 60%, Temp 19–25°C, 70% alcohol work-area decontamination before and after work, maintaining logs, and sequential material arrangement."
        },
        {
          id: 'q3',
          question: "3. In what sequence are the four functional layers pasted onto the green backing sheet?",
          options: [
            "Membrane (Step 4) → Conjugate pad (Step 6) → Sample pad (Step 8) → Absorbent pad (Step 9)",
            "Sample pad → Absorbent pad → Conjugate pad → Membrane",
            "Absorbent pad first, then Membrane last"
          ],
          correctIndex: 0,
          explanation: "Following the sequential removal of the three backing seals, the Membrane is pasted in Step 4, Conjugate pad in Step 6, Sample pad in Step 8, and Absorbent pad in Step 9."
        },
        {
          id: 'q4',
          question: "4. What are the actual colours of the Backing sheet and Conjugate pad in the supplied RCDC photographs?",
          options: [
            "Backing sheet is green; Conjugate pad is purple/pink.",
            "Backing sheet is white; Conjugate pad is blue.",
            "Both are beige."
          ],
          correctIndex: 0,
          explanation: "References A–F show a green backing substrate and a narrow 10 mm purple/pink conjugate pad."
        },
        {
          id: 'q5',
          question: "5. What indicator line measurements are annotated on the Reaction film in Reference A?",
          options: [
            "CTL: 17 mm and TL: 13 mm",
            "CTL: 44 mm and TL: 69 mm",
            "CTL: 5 mm and TL: 10 mm"
          ],
          correctIndex: 0,
          explanation: "Reference A marks the red Control Line at CTL: 17 mm and Test Line at TL: 13 mm from the right edge of the reaction film."
        },
        {
          id: 'q6',
          question: "6. Does completing this simulator authorise commercial batch release or replace the approved SOP?",
          options: [
            "No. It is strictly an educational training simulation and never replaces the approved RCDC SOP or supervised authorisation.",
            "Yes, it certifies production batch release.",
            "Yes, it replaces physical QC inspection."
          ],
          correctIndex: 0,
          explanation: "The simulator is an educational tool only and does not replace approved SOPs or authorise product release."
        }
      ]
    };

    