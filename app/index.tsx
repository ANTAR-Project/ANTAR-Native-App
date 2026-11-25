import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { testGatewayConnection } from "../src/api/client";
import { useAuth } from "../src/context/AuthContext";
import type { UserRole } from "../src/types";

const ROLES: {
  key: UserRole;
  title: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    key: "OWNER",
    title: "Owner",
    desc: "Manage users, provision workspaces, inspect policies, and access all home media.",
    icon: "shield-checkmark-outline",
  },
  {
    key: "RESIDENT",
    title: "Resident",
    desc: "Private & shared NAS files, HLS video uploads, Streamyard, and smart elements.",
    icon: "home-outline",
  },
  {
    key: "GUEST",
    title: "Guest",
    desc: "Time-scoped access to your NAS space, shared files, and Streamyard.",
    icon: "person-outline",
  },
];

const FEATURES = ["NAS Storage", "HLS Streamyard", "Smart Elements", "Policy Guarded"];

export default function Landing() {
  const router = useRouter();
  const { session, booting, gatewayUrl, updateGatewayUrl } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);

  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(gatewayUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setUrlInput(gatewayUrl);
  }, [gatewayUrl]);

  if (booting) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-blue-950">
        <ActivityIndicator size="large" color="#bfdbfe" />
        <Text className="mt-3 text-sm text-blue-300">Restoring session...</Text>
      </SafeAreaView>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)/files" />;
  }

  const handleContinue = () => {
    if (!role) return;
    router.push({ pathname: "/auth", params: { role } });
  };

  const handleSaveAndTest = async () => {
    setTesting(true);
    setTestResult(null);
    const saved = await updateGatewayUrl(urlInput);
    setUrlInput(saved);
    const res = await testGatewayConnection(saved);
    setTestResult({ ok: res.ok, text: res.detail });
    setTesting(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-950">
      <ScrollView contentContainerClassName="flex-grow px-6 pb-8 pt-10">
        {/* Brand */}
        <View className="items-center">
          <Text className="text-5xl font-bold tracking-wider text-blue-200">
            AN | TAR.
          </Text>
          <Text className="mt-2.5 text-center text-sm text-blue-300">
            Hearth Auth-Chain · NAS, HLS Streamyard & Elements
          </Text>

          <View className="mt-4 flex-row flex-wrap justify-center gap-2">
            {FEATURES.map((f) => (
              <View key={f} className="rounded-full bg-blue-900 px-3 py-1">
                <Text className="text-xs font-medium text-blue-200">{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Role selection */}
        <Text className="mb-3 mt-10 text-xs font-semibold uppercase tracking-widest text-blue-400">
          Select account type
        </Text>

        <View className="gap-3">
          {ROLES.map((r) => {
            const selected = role === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRole(r.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`flex-row items-center rounded-2xl border-2 p-4 ${
                  selected
                    ? "border-blue-300 bg-blue-800"
                    : "border-blue-800 bg-blue-900/60"
                }`}
              >
                <View className="mr-3.5 h-11 w-11 items-center justify-center rounded-xl bg-blue-950">
                  <Ionicons name={r.icon} size={24} color="#bfdbfe" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-blue-100">
                    {r.title}
                  </Text>
                  <Text className="mt-0.5 text-xs leading-4 text-blue-300">
                    {r.desc}
                  </Text>
                </View>
                <View
                  className={`ml-2 h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selected ? "border-blue-200 bg-blue-200" : "border-blue-600"
                  }`}
                >
                  {selected && (
                    <View className="h-2.5 w-2.5 rounded-full bg-blue-950" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-1 min-h-6" />

        {/* Gateway endpoint bar */}
        <Pressable
          onPress={() => {
            setTestResult(null);
            setServerModalOpen(true);
          }}
          className="mb-4 flex-row items-center justify-between rounded-2xl border border-blue-800 bg-blue-900/60 px-4 py-3"
        >
          <View className="flex-1 flex-row items-center">
            <Ionicons name="server-outline" size={18} color="#93c5fd" />
            <View className="ml-2.5 flex-1">
              <Text className="text-[11px] uppercase tracking-wider text-blue-400">
                API Gateway
              </Text>
              <Text className="text-xs font-medium text-blue-100" numberOfLines={1}>
                {gatewayUrl}
              </Text>
            </View>
          </View>
          <Text className="ml-2 text-xs font-semibold text-blue-300">Edit</Text>
        </Pressable>

        {/* CTA */}
        <Pressable
          disabled={!role}
          onPress={handleContinue}
          className={`items-center rounded-2xl py-4 ${
            role ? "bg-blue-200" : "bg-blue-900"
          }`}
        >
          <Text
            className={`text-lg font-bold ${
              role ? "text-blue-950" : "text-blue-500"
            }`}
          >
            {role
              ? `Continue as ${
                  role === "OWNER" ? "Owner" : role === "RESIDENT" ? "Resident" : "Guest"
                }`
              : "Select a role"}
          </Text>
        </Pressable>

        <Text className="mt-3 text-center text-xs text-blue-400">
          Secured by Hearth JWT + Policy Registry
        </Text>
      </ScrollView>

      {/* Gateway Config Modal */}
      <Modal
        visible={serverModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setServerModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full max-w-md rounded-3xl border border-blue-700 bg-blue-900 p-6">
            <Text className="text-lg font-bold text-blue-100">
              Configure API Gateway
            </Text>
            <Text className="mt-1 text-xs text-blue-300">
              For Expo Go on a physical phone, enter your host machine&apos;s LAN IP
              and gateway port (e.g. http://192.168.0.104:8443).
            </Text>

            <TextInput
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="http://192.168.0.104:8443"
              placeholderTextColor="#6b8bd6"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              className="mt-4 rounded-xl bg-blue-950 px-4 py-3 text-sm text-blue-100"
            />

            {testResult && (
              <Text
                className={`mt-3 text-xs font-medium ${
                  testResult.ok ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {testResult.text}
              </Text>
            )}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setServerModalOpen(false)}
                className="flex-1 items-center rounded-xl border border-blue-700 py-3"
              >
                <Text className="font-semibold text-blue-200">Close</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveAndTest}
                disabled={testing}
                className="flex-1 items-center rounded-xl bg-blue-200 py-3"
              >
                {testing ? (
                  <ActivityIndicator color="#172554" />
                ) : (
                  <Text className="font-bold text-blue-950">Save & Test</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
