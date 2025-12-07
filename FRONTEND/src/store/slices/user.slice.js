/**
 * User slice - Redux Toolkit
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  profile: null,
  preferences: null,
  isLoading: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setProfile: (state, action) => {
      state.profile = action.payload;
    },
    setPreferences: (state, action) => {
      state.preferences = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setProfile, setPreferences, setLoading } = userSlice.actions;
export default userSlice.reducer;












