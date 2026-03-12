import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { authService } from "@/services/authService";
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
    const unsubscribe = authService.subscribe((nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });

    return unsubscribe;
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
