/**
 * UI slice - Redux Toolkit
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  theme: 'light',
  isWidgetOpen: false,
  isMobile: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    toggleWidget: (state) => {
      state.isWidgetOpen = !state.isWidgetOpen;
    },
    setWidgetOpen: (state, action) => {
      state.isWidgetOpen = action.payload;
    },
    setMobile: (state, action) => {
      state.isMobile = action.payload;
    },
  },
});

export const { setTheme, toggleWidget, setWidgetOpen, setMobile } = uiSlice.actions;
export default uiSlice.reducer;








