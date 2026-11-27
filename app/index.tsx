import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import BrandLogo from "../src/components/BrandLogo";
import KeyboardModal from "../src/components/KeyboardModal";
import { useAuth } from "../src/context/AuthContext";
import { useTheme } from "../src/context/ThemeContext";
import type { UserRole } from "../src/types";

const ROLES: {
  key: UserRole;
  title: string;
  subtitle: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    key: "OWNER",
    title: "Owner",
    subtitle: "Full Control",
    desc: "Provision accounts, manage workspaces, inspect policies, and access all media.",
    icon: "shield-checkmark-outline",
  },
  {
    key: "RESIDENT",
    title: "Resident",
    subtitle: "Member",
    desc: "Private & shared NAS storage, HLS video uploads, Streamyard, and elements.",
    icon: "home-outline",
  },
  {
    key: "GUEST",
    title: "Guest",
    subtitle: "Time-Scoped",
    desc: "Scoped access to personal NAS files, shared space reads, and Streamyard.",
    icon: "person-outline",
  },
];

export default function Landing() {
  const router = useRouter();
  const { session, booting, gatewayUrl, updateGatewayUrl } = useAuth();
  const { isDark, colors, toggleMode } = useTheme();
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
      <SafeAreaView
        style={{ backgroundColor: colors.bg }}
        className="flex-1 items-center justify-center"
      >
        <ActivityIndicator size="small" color={colors.accent} />
        <Text
          style={{ color: colors.inkSubtle }}
          className="mt-3 text-xs uppercase tracking-widest"
        >
          Restoring session
        </Text>
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
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <ScrollView contentContainerClassName="flex-grow px-6 pb-8 pt-4">
        {/* Top bar with subtle appearance toggle */}
        <View className="flex-row justify-end">
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
              size={14}
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

        {/* Brand */}
        <View className="mt-4 items-center">
          <BrandLogo size={92} />
          <Text
            style={{ color: colors.ink }}
            className="mt-4 text-3xl font-light tracking-[0.24em]"
          >
            AN | TAR.
          </Text>
          <Text
            style={{ color: colors.inkMuted }}
            className="mt-2 text-center text-xs leading-5"
          >
            Hearth Private Cloud · Storage, Adaptive Streaming & Elements
          </Text>
        </View>

        {/* Role selection */}
        <Text
          style={{ color: colors.inkSubtle }}
          className="mb-3 mt-10 text-[11px] font-semibold uppercase tracking-[0.18em]"
        >
          Select Identity
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
                style={{
                  backgroundColor: selected ? colors.elevated : colors.surface,
                  borderColor: selected ? colors.accent : colors.hairline,
                  borderWidth: 1,
                }}
                className="flex-row items-center rounded-2xl p-4"
              >
                <View
                  style={{
                    backgroundColor: selected ? colors.bg : colors.recessed,
                    borderColor: selected ? colors.accent : colors.hairline,
                    borderWidth: 1,
                  }}
                  className="mr-4 h-11 w-11 items-center justify-center rounded-xl"
                >
                  <Ionicons
                    name={r.icon}
                    size={21}
                    color={selected ? colors.accent : colors.inkMuted}
                  />
                </View>

                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text
                      style={{ color: colors.ink }}
                      className="text-base font-semibold"
                    >
                      {r.title}
                    </Text>
                    <Text
                      style={{ color: colors.inkSubtle }}
                      className="text-[10px] font-medium uppercase tracking-wider"
                    >
                      · {r.subtitle}
                    </Text>
                  </View>
                  <Text
                    style={{ color: colors.inkMuted }}
                    className="mt-1 text-xs leading-4"
                  >
                    {r.desc}
                  </Text>
                </View>

                <View
                  style={{
                    borderColor: selected ? colors.accent : colors.hairlineStrong,
                    backgroundColor: selected ? colors.accent : "transparent",
                    borderWidth: 1.5,
                  }}
                  className="ml-3 h-5 w-5 items-center justify-center rounded-full"
                >
                  {selected && (
                    <View
                      style={{ backgroundColor: colors.accentInk }}
                      className="h-2 w-2 rounded-full"
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="min-h-8 flex-1" />

        {/* Gateway endpoint bar */}
        <Pressable
          onPress={() => {
            setTestResult(null);
            setServerModalOpen(true);
          }}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="mb-3.5 flex-row items-center justify-between rounded-2xl px-4 py-3"
        >
          <View className="flex-1 flex-row items-center">
            <Ionicons name="radio-outline" size={16} color={colors.accentWarm} />
            <View className="ml-3 flex-1">
              <Text
                style={{ color: colors.inkSubtle }}
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              >
                Gateway Endpoint
              </Text>
              <Text
                style={{ color: colors.ink }}
                className="mt-0.5 font-mono text-xs"
                numberOfLines={1}
              >
                {gatewayUrl}
              </Text>
            </View>
          </View>
          <Text
            style={{ color: colors.accent }}
            className="ml-3 text-xs font-semibold"
          >
            Configure
          </Text>
        </Pressable>

        {/* CTA */}
        <Pressable
          disabled={!role}
          onPress={handleContinue}
          style={{
            backgroundColor: role ? colors.accent : colors.surface,
            borderColor: role ? colors.accent : colors.hairline,
            borderWidth: 1,
          }}
          className="items-center rounded-2xl py-4"
        >
          <Text
            style={{ color: role ? colors.accentInk : colors.inkSubtle }}
            className="text-sm font-bold tracking-wide"
          >
            {role
              ? `Continue as ${
                  role === "OWNER" ? "Owner" : role === "RESIDENT" ? "Resident" : "Guest"
                }`
              : "Select an identity to continue"}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Gateway Config Modal */}
      <KeyboardModal
        visible={serverModalOpen}
        variant="center"
        onRequestClose={() => setServerModalOpen(false)}
      >
        <Text style={{ color: colors.ink }} className="text-base font-semibold">
          API Gateway Endpoint
        </Text>
        <Text
          style={{ color: colors.inkMuted }}
          className="mt-1.5 text-xs leading-4"
        >
          When running in Expo Go on a physical device, enter your host machine&apos;s LAN IP
          and gateway port (e.g. http://192.168.0.104:8443).
        </Text>

        <TextInput
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="http://192.168.0.104:8443"
          placeholderTextColor={colors.inkSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={{
            backgroundColor: colors.recessed,
            borderColor: colors.hairlineStrong,
            borderWidth: 1,
            color: colors.ink,
          }}
          className="mt-4 rounded-xl px-4 py-3 font-mono text-sm"
        />

        {testResult && (
          <Text
            style={{ color: testResult.ok ? colors.emerald : colors.crimson }}
            className="mt-3 text-xs font-medium"
          >
            {testResult.text}
          </Text>
        )}

        <View className="mt-5 flex-row gap-3">
          <Pressable
            onPress={() => setServerModalOpen(false)}
            style={{ borderColor: colors.hairlineStrong, borderWidth: 1 }}
            className="flex-1 items-center rounded-xl py-3"
          >
            <Text style={{ color: colors.inkMuted }} className="text-xs font-semibold">
              Close
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSaveAndTest}
            disabled={testing}
            style={{ backgroundColor: colors.accent }}
            className="flex-1 items-center rounded-xl py-3"
          >
            {testing ? (
              <ActivityIndicator color={colors.accentInk} />
            ) : (
              <Text style={{ color: colors.accentInk }} className="text-xs font-bold">
                Save & Test
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardModal>
    </SafeAreaView>
  );
}
