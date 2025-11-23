/**
 * useRealtime hook - Supabase realtime subscriptions
 */

import { useEffect } from 'react';
import { supabase } from '../services/supabase.js';

export const useRealtime = (channel, callback) => {
  useEffect(() => {
    if (!supabase) return;

    const subscription = supabase
      .channel(channel)
      .on('postgres_changes', { event: '*', schema: 'public' }, callback)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channel, callback]);
};








