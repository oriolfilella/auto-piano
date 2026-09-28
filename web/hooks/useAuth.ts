// hooks/useAuth.ts
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../utils/superbaseClient";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setIsGuest(false);
      }
      setLoading(false);
    });

    // Asegurarnos de tener la sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setSession(session);
            setIsGuest(false);
        }
        setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { session, isGuest, setIsGuest, loading };
}
