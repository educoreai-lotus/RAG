/**
 * Material-UI theme configuration
 */

import { createTheme } from '@mui/material/styles';
import { lightTheme } from './lightTheme.js';
import { darkTheme } from './darkTheme.js';

export const theme = createTheme({
  ...lightTheme,
  // Can be switched to darkTheme based on user preference
});

export { lightTheme, darkTheme };



















