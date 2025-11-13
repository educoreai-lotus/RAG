/**
 * Chat Mode slice - Redux Toolkit
 * Manages chatbot mode state (General Chat, Assessment Support, DevLab Support)
 */

import { createSlice } from '@reduxjs/toolkit';

const MODES = {
  GENERAL: 'general',
  ASSESSMENT_SUPPORT: 'assessment_support',
  DEVLAB_SUPPORT: 'devlab_support',
};

const initialState = {
  currentMode: MODES.GENERAL,
  previousMode: null,
};

const chatModeSlice = createSlice({
  name: 'chatMode',
  initialState,
  reducers: {
    setMode: (state, action) => {
      state.previousMode = state.currentMode;
      state.currentMode = action.payload;
    },
    setGeneralMode: (state) => {
      state.previousMode = state.currentMode;
      state.currentMode = MODES.GENERAL;
    },
    setAssessmentSupportMode: (state) => {
      state.previousMode = state.currentMode;
      state.currentMode = MODES.ASSESSMENT_SUPPORT;
    },
    setDevLabSupportMode: (state) => {
      state.previousMode = state.currentMode;
      state.currentMode = MODES.DEVLAB_SUPPORT;
    },
    resetMode: (state) => {
      state.previousMode = state.currentMode;
      state.currentMode = MODES.GENERAL;
    },
  },
});

export const {
  setMode,
  setGeneralMode,
  setAssessmentSupportMode,
  setDevLabSupportMode,
  resetMode,
} = chatModeSlice.actions;

export { MODES };
export default chatModeSlice.reducer;

