const handleSupervisorClosed = async (confirmed) => {
  setShowSupervisorModal(false);

  if (!confirmed) return;

  const stored = getStoredState(cycleKey);

  saveStoredState(cycleKey, {
    ...stored,
    supervisor: true
  });

  setSupervisorPressed(true);
};
