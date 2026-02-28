/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect } from 'react';
import { Dashboard } from './components/dashboard/Dashboard';
import { EditorLayout } from './components/editor/EditorLayout';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { useProjectStore } from './store';
import { Toaster } from 'sonner';

function App() {
  const { viewMode, projects, activeProjectId } = useProjectStore();

  return (
    <>
      <Toaster position="bottom-right" theme="dark" />
      <GlobalSettingsModal />
      
      {viewMode === 'dashboard' ? (
        <Dashboard />
      ) : (
        <EditorLayout />
      )}
    </>
  );
}

export default App;