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
import BrandLogo from "../src/components/BrandLogo";
import { useAuth } from "../src/context/AuthContext";
import { useTheme } from "../src/context/ThemeContext";
import { useAuthApi } from "../src/hooks/useAuthApi";
import { useBiometrics } from "../src/hooks/useBiometrics";
import type { Session, UserRole } from "../src/types";

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
  const { isDark, colors, toggleMode } = useTheme();
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
        "Use biometrics to unlock and rotate your session on next launch.",
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
      return setError("No biometrics enrolled in device settings.");
    }

    const vault = await readVault();
    if (!vault?.refreshToken) {
      return setError("Biometric sign-in isn't configured yet. Sign in with password first.");
    }

    setBusy(true);
    try {
      if (!(await authenticate("Sign in to AN | TAR."))) return;
      try {
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
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-6 pb-10 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="flex-row items-center"
            >
              <Ionicons name="chevron-back" size={18} color={colors.inkMuted} />
              <Text style={{ color: colors.inkMuted }} className="ml-1 text-sm">
                Back
              </Text>
            </Pressable>

            <Pressable
              onPress={toggleMode}
              hitSlop={10}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="flex-row items-center rounded-full px-3 py-1.5"
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={13}
                color={colors.accentWarm}
              />
              <Text
                style={{ color: colors.inkMuted }}
                className="ml-1.5 text-[11px] font-semibold"
              >
                {isDark ? "Light" : "Dark"}
              </Text>
            </Pressable>
          </View>

          <View className="mt-6 items-center">
            <BrandLogo size={68} />
            <Text
              style={{ color: colors.ink }}
              className="mt-3 text-2xl font-light tracking-[0.22em]"
            >
              AN | TAR.
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="mt-3 rounded-full px-3.5 py-1"
            >
              <Text
                style={{ color: colors.accentWarm }}
                className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              >
                {roleLabel} Sign In
              </Text>
            </View>
            <Text
              style={{ color: colors.inkSubtle }}
              className="mt-2 font-mono text-[11px]"
              numberOfLines={1}
            >
              {gatewayUrl}
            </Text>
          </View>

          {/* Form */}
          <View className="mt-8 gap-4">
            <View>
              <Text
                style={{ color: colors.inkSubtle }}
                className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
              >
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="owner, resident01, or guest01"
                placeholderTextColor={colors.inkSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  backgroundColor: colors.recessed,
                  borderColor: colors.hairlineStrong,
                  borderWidth: 1,
                  color: colors.ink,
                }}
                className="rounded-2xl px-4 py-3.5 text-sm"
              />
            </View>

            <View>
              <Text
                style={{ color: colors.inkSubtle }}
                className="mb-2 ml-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
              >
                Password
              </Text>
              <View
                style={{
                  backgroundColor: colors.recessed,
                  borderColor: colors.hairlineStrong,
                  borderWidth: 1,
                }}
                className="flex-row items-center rounded-2xl pr-3.5"
              >
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={colors.inkSubtle}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={{ color: colors.ink }}
                  className="flex-1 px-4 py-3.5 text-sm"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={19}
                    color={colors.inkMuted}
                  />
                </Pressable>
              </View>
            </View>
          </View>

          {error && (
            <View
              style={{
                backgroundColor: colors.crimsonBg,
                borderColor: colors.crimsonBorder,
                borderWidth: 1,
              }}
              className="mt-4 flex-row items-center rounded-2xl px-4 py-3"
            >
              <Ionicons name="alert-circle-outline" size={18} color={colors.crimson} />
              <Text
                style={{ color: colors.crimson }}
                className="ml-2.5 flex-1 text-xs leading-4"
              >
                {error}
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={busy}
            style={{ backgroundColor: colors.accent }}
            className="mt-6 items-center rounded-2xl py-4"
          >
            {busy ? (
              <ActivityIndicator color={colors.accentInk} />
            ) : (
              <Text
                style={{ color: colors.accentInk }}
                className="text-sm font-bold tracking-wide"
              >
                Sign In
              </Text>
            )}
          </Pressable>

          <Text
            style={{ color: colors.inkSubtle }}
            className="mt-4 text-center text-[11px] leading-4"
          >
            Accounts are provisioned by the Owner. Authoritative role is verified from
            your signed JWT upon authentication.
          </Text>

          <View className="my-7 flex-row items-center">
            <View style={{ backgroundColor: colors.hairline }} className="h-px flex-1" />
            <Text
              style={{ color: colors.inkSubtle }}
              className="mx-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
            >
              or
            </Text>
            <View style={{ backgroundColor: colors.hairline }} className="h-px flex-1" />
          </View>

          <Pressable
            onPress={handleFingerprint}
            disabled={busy}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="items-center rounded-2xl py-5"
          >
            <Ionicons
              name="finger-print"
              size={32}
              color={fingerprintReady ? colors.accentWarm : colors.inkMuted}
            />
            <Text style={{ color: colors.ink }} className="mt-2 text-sm font-semibold">
              {vaultUser ? `Unlock as ${vaultUser}` : "Biometric Sign In"}
            </Text>
            <Text style={{ color: colors.inkSubtle }} className="mt-0.5 text-[11px]">
              {fingerprintReady
                ? "Rotates refresh token securely on unlock"
                : "Available after first password sign-in"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
