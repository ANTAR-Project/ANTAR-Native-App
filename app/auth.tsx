import { useEffect, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import type { Role, Session } from "../src/context/AuthContext";
import { useAuthApi } from "../src/hooks/useAuthApi";
import { useBiometrics } from "../src/hooks/useBiometrics";


type Mode = "login" | "register";

const USERNAME_RE = /^[a-zA-Z0-9._-]{1,64}$/;
const MIN_PASSWORD = 12;

const inputClass = "rounded-2xl bg-blue-800 px-5 py-4 text-base text-blue-100";
const PLACEHOLDER = "#6b8bd6";

export default function Auth() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role: Role = params.role === "owner" ? "owner" : "resident";
  const roleLabel = role === "owner" ? "Owner" : "Resident";

  const { signIn, readVault, saveVault, clearVault } = useAuth();
  const { register, login, validateToken } = useAuthApi();
  const { check, authenticate } = useBiometrics();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fingerprintReady, setFingerprintReady] = useState(false);

  const isRegister = mode === "register";

  useEffect(() => {
    readVault().then((v) => setFingerprintReady(!!v));
  }, [readVault]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const finish = (session: Session) => {
    signIn(session);
    router.replace("/files");
  };

  const askEnableFingerprint = () =>
    new Promise<boolean>((resolve) =>
      Alert.alert(
        "Enable fingerprint?",
        "Use your fingerprint for faster sign-in next time.",
        [
          { text: "Not now", style: "cancel", onPress: () => resolve(false) },
          { text: "Enable", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      )
    );

  const validate = (): string | null => {
    if (!USERNAME_RE.test(username)) {
      return "Username: letters, numbers, dot, dash or underscore (max 64).";
    }
    if (!password) return "Enter your password.";
    if (isRegister) {
      if (password.length < MIN_PASSWORD) {
        return `Password must be at least ${MIN_PASSWORD} characters.`;
      }
      if (password !== confirm) return "Passwords do not match.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) return setError(problem);

    setError(null);
    setBusy(true);
    try {
      if (isRegister) await register({ username, password });
      const res = await login({ username, password });
      const session: Session = { token: res.token, username: res.username, role };

      // Offer fingerprint once, if the device supports it and it isn't set up yet.
      if ((await check()) === "ready" && !(await readVault())) {
        if (await askEnableFingerprint()) {
          if (await authenticate("Confirm your fingerprint")) {
            await saveVault(session);
          }
        }
      }
      finish(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleFingerprint = async () => {
    setError(null);
    const status = await check();
    if (status === "no-hardware") {
      return setError("This device has no fingerprint sensor.");
    }
    if (status === "not-enrolled") {
      return setError("No fingerprint enrolled. Add one in your device settings.");
    }

    const vault = await readVault();
    if (!vault) {
      return setError("Fingerprint isn't set up yet. Log in with your password first.");
    }

    setBusy(true);
    try {
      if (!(await authenticate("Log in to AN | TAR."))) return;
      try {
        await validateToken(vault.token);
      } catch {
        await clearVault();
        setFingerprintReady(false);
        return setError("Session expired. Please log in with your password.");
      }
      finish(vault);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-6 pb-10 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text className="text-base text-blue-300">← Back</Text>
          </Pressable>

          <View className="mt-6 items-center">
            <Text className="text-3xl font-bold text-blue-200">AN | TAR.</Text>
            <View className="mt-3 rounded-full bg-blue-800 px-4 py-1">
              <Text className="text-sm font-medium text-blue-200">{roleLabel}</Text>
            </View>
          </View>

          {/* Login / Register toggle */}
          <View className="mt-8 flex-row rounded-2xl bg-blue-800 p-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                className={`flex-1 items-center rounded-xl py-3 ${
                  mode === m ? "bg-blue-200" : ""
                }`}
              >
                <Text
                  className={`font-semibold ${
                    mode === m ? "text-blue-900" : "text-blue-300"
                  }`}
                >
                  {m === "login" ? "Login" : "Register"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Form */}
          <View className="mt-6 gap-4">
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor={PLACEHOLDER}
              autoCapitalize="none"
              autoCorrect={false}
              className={inputClass}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={isRegister ? `Password (min ${MIN_PASSWORD} characters)` : "Password"}
              placeholderTextColor={PLACEHOLDER}
              secureTextEntry
              autoCapitalize="none"
              className={inputClass}
            />
            {isRegister && (
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Confirm password"
                placeholderTextColor={PLACEHOLDER}
                secureTextEntry
                autoCapitalize="none"
                className={inputClass}
              />
            )}
          </View>

          {error && <Text className="mt-4 text-sm text-red-300">{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={busy}
            className="mt-6 items-center rounded-2xl bg-blue-200 py-4"
          >
            {busy ? (
              <ActivityIndicator color="#1e3a8a" />
            ) : (
              <Text className="text-lg font-bold text-blue-900">
                {isRegister ? "Create Account" : "Login"}
              </Text>
            )}
          </Pressable>

          {/* Fingerprint (login only) */}
          {!isRegister && (
            <>
              <View className="my-6 flex-row items-center">
                <View className="h-px flex-1 bg-blue-700" />
                <Text className="mx-3 text-sm text-blue-400">or</Text>
                <View className="h-px flex-1 bg-blue-700" />
              </View>

              <Pressable
                onPress={handleFingerprint}
                disabled={busy}
                className="items-center rounded-2xl border-2 border-blue-500 py-5"
              >
                <Text className="text-4xl">👆</Text>
                <Text className="mt-1 text-base font-semibold text-blue-200">
                  Login with Fingerprint
                </Text>
                <Text className="mt-0.5 text-xs text-blue-400">
                  {fingerprintReady ? "Ready on this device" : "Set up after your first login"}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}