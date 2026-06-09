import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { authService } from "@/services/authService";
import { savedAccessService } from "@/services/savedAccessService";
import { AuthUser } from "@/types/finance";

type AuthSessionValue = {
  user: AuthUser | null;
  isLoading: boolean;
};

const AuthSessionContext = createContext<AuthSessionValue>({
  user: null,
  isLoading: true
});

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let hasBootstrapped = false;

    const unsubscribe = authService.subscribe((nextUser) => {
      if (!isMounted) {
        return;
      }

      setUser(nextUser);

      if (hasBootstrapped) {
        setIsLoading(false);
      }
    });

    async function bootstrapSession() {
      try {
        const saveAccessEnabled = await savedAccessService.isEnabled();
        let resumedUser: AuthUser | null = null;

        try {
          resumedUser = await authService.resumeSession();
        } catch {
          resumedUser = null;
        }

        if (resumedUser) {
          if (isMounted) {
            setUser(resumedUser);
          }

          return;
        }

        if (!saveAccessEnabled) {
          if (isMounted) {
            setUser(null);
          }

          return;
        }

        try {
          const savedUser = await savedAccessService.resumeSavedAccess();

          if (isMounted) {
            setUser(savedUser);
          }
        } catch {
          if (isMounted) {
            setUser(null);
          }
        }
      } finally {
        hasBootstrapped = true;

        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading
    }),
    [user, isLoading]
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
