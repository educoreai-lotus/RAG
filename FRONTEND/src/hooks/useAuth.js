/**
 * useAuth hook - Authentication management
 */

import { useSelector, useDispatch } from 'react-redux';
import { setUser, setToken, logout } from '../store/slices/auth.slice.js';

export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  const login = (user, token) => {
    dispatch(setUser(user));
    dispatch(setToken(token));
    localStorage.setItem('token', token);
  };

  const logoutUser = () => {
    dispatch(logout());
    localStorage.removeItem('token');
  };

  return {
    ...auth,
    login,
    logout: logoutUser,
  };
};








