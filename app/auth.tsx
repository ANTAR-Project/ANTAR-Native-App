import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/context/AuthContext";
import { useAuthApi } from "../src/hooks/useAuthApi";
import { useBiometrics } from "../src/hooks/useBiometrics";
import type { Session, UserRole } from "../src/types";

const inputClass = "rounded-2xl bg-blue-900 px-5 py-4 text-base text-blue-100 border border-blue-800";
const PLACEHOLDER = "#6b8bd6";

function normalizeRoleHint(raw?: string): UserRole {
  const up = (raw ?? "").toUpperCase();
  if (up === "OWNER" || up === "RESIDENT" || up === "GUEST") return up;
  return "RESIDENT";
}

export default function Auth() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const roleHint = normalizeRoleHint(params.role);
  const roleLabel =
    roleHint === "OWNER" ? "Owner" : roleHint === "GUEST" ? "Guest" : "Resident";

  const { gatewayUrl, signIn, readVault, saveVault, clearVault } = useAuth();
  const { login, refreshWithToken } = useAuthApi();
  const { check, authenticate } = useBiometrics();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fingerprintReady, setFingerprintReady] = useState(false);
  const [vaultUser, setVaultUser] = useState<string | null>(null);

  useEffect(() => {
    readVault().then((v) => {
      setFingerprintReady(!!v?.refreshToken);
      setVaultUser(v?.username ?? null);
    });
  }, [readVault]);

  const finish = async (session: Session) => {
    await signIn(session);
    router.replace("/(tabs)/files");
  };

  const askEnableFingerprint = () =>
    new Promise<boolean>((resolve) =>
      Alert.alert(
        "Enable biometric sign-in?",
        "Use your fingerprint or Face ID to unlock and refresh your session next time.",
        [
          { text: "Not now", style: "cancel", onPress: () => resolve(false) },
          { text: "Enable", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      )
    );

  const handleLogin = async () => {
    const cleanUser = username.trim();
    if (!cleanUser) return setError("Enter your username.");
    if (!password) return setError("Enter your password.");

    setError(null);
    setBusy(true);
    try {
      const session = await login({ username: cleanUser, password });

      if ((await check()) === "ready" && !(await readVault())) {
        if (await askEnableFingerprint()) {
          if (await authenticate("Confirm biometrics for AN | TAR.")) {
            await saveVault(session);
          }
        }
      }

      await finish(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleFingerprint = async () => {
    setError(null);
    const status = await check();
    if (status === "no-hardware") {
      return setError("This device has no biometric sensor.");
    }
    if (status === "not-enrolled") {
      return setError("No biometrics enrolled. Add one in your device settings.");
    }

    const vault = await readVault();
    if (!vault?.refreshToken) {
      return setError("Biometric sign-in isn't set up yet. Sign in with password first.");
    }

    setBusy(true);
    try {
      if (!(await authenticate("Sign in to AN | TAR."))) return;
      try {
        // Rotate refresh token against /api/v1/auth/refresh so expired/revoked sessions are caught
        const refreshed = await refreshWithToken(vault.refreshToken);
        await saveVault(refreshed);
        await finish(refreshed);
      } catch {
        await clearVault();
        setFingerprintReady(false);
        setVaultUser(null);
        setError("Saved session expired or revoked. Please sign in with your password.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-6 pb-10 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} hitSlop={12} className="flex-row items-center">
            <Ionicons name="arrow-back" size={18} color="#93c5fd" />
            <Text className="ml-1.5 text-base text-blue-300">Back</Text>
          </Pressable>

          <View className="mt-6 items-center">
            <Text className="text-3xl font-bold text-blue-200">AN | TAR.</Text>
            <View className="mt-3 flex-row items-center rounded-full bg-blue-900 px-4 py-1.5 border border-blue-800">
              <Text className="text-xs font-semibold uppercase tracking-wider text-blue-200">
                {roleLabel} Sign In
              </Text>
            </View>
            <Text className="mt-2 text-xs text-blue-400" numberOfLines={1}>
              Gateway: {gatewayUrl}
            </Text>
          </View>

          {/* Form */}
          <View className="mt-8 gap-4">
            <View>
              <Text className="mb-1.5 ml-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. owner, resident01, guest01"
                placeholderTextColor={PLACEHOLDER}
                autoCapitalize="none"
                autoCorrect={false}
                className={inputClass}
              />
            </View>

            <View>
              <Text className="mb-1.5 ml-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
                Password
              </Text>
              <View className="flex-row items-center rounded-2xl border border-blue-800 bg-blue-900 pr-3">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={PLACEHOLDER}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  className="flex-1 px-5 py-4 text-base text-blue-100"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#93c5fd"
                  />
                </Pressable>
              </View>
            </View>
          </View>

          {error && (
            <View className="mt-4 flex-row items-center rounded-xl border border-red-400/50 bg-red-950/60 px-3.5 py-2.5">
              <Ionicons name="alert-circle-outline" size={18} color="#fca5a5" />
              <Text className="ml-2 flex-1 text-sm text-red-200">{error}</Text>
            </View>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={busy}
            className="mt-6 items-center rounded-2xl bg-blue-200 py-4"
          >
            {busy ? (
              <ActivityIndicator color="#172554" />
            ) : (
              <Text className="text-lg font-bold text-blue-950">Sign In</Text>
            )}
          </Pressable>

          {/* Policy note: no self-registration in auth-service */}
          <View className="mt-5 rounded-2xl border border-blue-800/80 bg-blue-900/40 p-3.5">
            <Text className="text-xs leading-4 text-blue-300">
              Accounts are created strictly by the <Text className="font-semibold text-blue-100">OWNER</Text>{" "}
              (per Hearth auth policy). Your assigned role is verified from your signed JWT on login.
            </Text>
          </View>

          {/* Biometrics */}
          <View className="my-6 flex-row items-center">
            <View className="h-px flex-1 bg-blue-800" />
            <Text className="mx-3 text-xs uppercase tracking-widest text-blue-400">or</Text>
            <View className="h-px flex-1 bg-blue-800" />
          </View>

          <Pressable
            onPress={handleFingerprint}
            disabled={busy}
            className="items-center rounded-2xl border-2 border-blue-700 bg-blue-900/40 py-5"
          >
            <Ionicons name="finger-print" size={38} color="#bfdbfe" />
            <Text className="mt-1.5 text-base font-semibold text-blue-100">
              {vaultUser ? `Unlock as ${vaultUser}` : "Sign in with Biometrics"}
            </Text>
            <Text className="mt-0.5 text-xs text-blue-400">
              {fingerprintReady
                ? "Rotates refresh token securely on unlock"
                : "Set up automatically after your first sign-in"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
