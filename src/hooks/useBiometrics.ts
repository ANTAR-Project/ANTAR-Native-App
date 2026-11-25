import { useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";

export type BiometricStatus = "ready" | "no-hardware" | "not-enrolled";

export function useBiometrics() {
  const check = useCallback(async (): Promise<BiometricStatus> => {
    if (!(await LocalAuthentication.hasHardwareAsync())) return "no-hardware";
    if (!(await LocalAuthentication.isEnrolledAsync())) return "not-enrolled";
    return "ready";
  }, []);

  const authenticate = useCallback(async (reason: string): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Cancel",
    });
    return result.success;
  }, []);

  return { check, authenticate };
}