/***************************************************************************
     * 9. RESET MODAL & INITIALIZATION
     ***************************************************************************/
    function openResetModal() {
      document.getElementById('resetModal').classList.remove('hidden');
    }

    function closeResetModal() {
      document.getElementById('resetModal').classList.add('hidden');
    }

    function confirmFullReset() {
      clearAssemblyTransientState();
      STATE.completedSteps = {};
      STATE.checkedEnv = {};
      STATE.quizAnswers = {};
      STATE.precisionScores = {};
      STATE.currentGameStep = 1;
      updatePrecisionBadge();
      applyDimensionPreset('drawing');
      saveProgressToStorage();
      renderBenchWipeStatus();
      renderOverviewPage();
      renderGameStepUI();
      if (STATE.activePage === 'game') sync3DSceneForGameStep();
      closeResetModal();
    }

    window.addEventListener('load', () => {
      loadProgressFromStorage();
      initThreeScene();
      renderBenchWipeStatus();
      renderOverviewPage();
      selectComponent('backing_sheet');
      animate();
    });