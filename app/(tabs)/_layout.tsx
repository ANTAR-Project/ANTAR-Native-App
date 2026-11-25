import { useState } from "react";
import { Alert, Modal, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BrandLogo from "../../src/components/BrandLogo";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import type { ThemeMode } from "../../src/theme";
import { roleBadgeLabel } from "../../src/utils";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: "files", title: "Files", icon: "folder-outline", activeIcon: "folder" },
  { name: "workspace", title: "Workspace", icon: "hardware-chip-outline", activeIcon: "hardware-chip" },
  { name: "streamyard", title: "Streamyard", icon: "play-circle-outline", activeIcon: "play-circle" },
  { name: "elements", title: "Elements", icon: "options-outline", activeIcon: "options" },
  { name: "panel", title: "Owner", icon: "shield-checkmark-outline", activeIcon: "shield-checkmark" },
];

export default function TabsLayout() {
  const { session, booting, logout } = useAuth();
  const { mode, colors, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [accountOpen, setAccountOpen] = useState(false);

  if (booting) return null;
  if (!session) return <Redirect href="/" />;

  const isOwner = session.role === "OWNER";
  const bottomOffset = Math.max(insets.bottom, 12) + 12;
  const barWidth = Math.min(width - 64, 340);
  const sideInset = Math.max(28, Math.round((width - barWidth) / 2));
  const useNativeGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();

  const confirmLogout = () => {
    setAccountOpen(false);
    Alert.alert(
      "Sign out?",
      `Revoke active session for ${session.username} (${roleBadgeLabel(session.role)})?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => void logout() },
      ]
    );
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerTitleAlign: "left",
          headerStyle: {
            backgroundColor: colors.bg,
          },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 18,
            letterSpacing: 0.2,
          },
          headerRightContainerStyle: {
            paddingRight: 16,
            maxWidth: "56%",
          },
          sceneStyle: {
            backgroundColor: colors.bg,
          },
          tabBarStyle: {
            position: "absolute",
            left: sideInset,
            right: sideInset,
            bottom: bottomOffset,
            height: 60,
            borderRadius: 28,
            borderTopWidth: 0,
            backgroundColor: "transparent",
            elevation: 10,
            shadowColor: "#000",
            shadowOpacity: mode === "dark" ? 0.38 : 0.14,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            paddingBottom: 6,
            paddingTop: 6,
            paddingHorizontal: 8,
          },
          tabBarBackground: () =>
            useNativeGlass ? (
              <GlassView
                style={{
                  flex: 1,
                  borderRadius: 28,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.tabGlassBorder,
                }}
                glassEffectStyle="regular"
                colorScheme={mode}
                tintColor={colors.tabGlassBg}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  borderRadius: 28,
                  backgroundColor: colors.tabGlassBg,
                  borderWidth: 1,
                  borderColor: colors.tabGlassBorder,
                }}
              />
            ),
          tabBarLabelStyle: {
            fontSize: 9.5,
            fontWeight: "600",
            letterSpacing: 0.2,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.inkSubtle,
          headerRight: () => (
            <Pressable
              onPress={() => setAccountOpen(true)}
              hitSlop={8}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
                maxWidth: 190,
              }}
              className="flex-row items-center rounded-full px-3 py-1.5"
            >
              <View
                style={{ backgroundColor: colors.accentWarm }}
                className="mr-1.5 h-1.5 w-1.5 rounded-full"
              />
              <Text
                style={{ color: colors.ink }}
                className="flex-shrink text-[11px] font-semibold"
                numberOfLines={1}
              >
                {session.username}
              </Text>
              <Text
                style={{ color: colors.inkMuted }}
                className="ml-1 text-[10px] font-medium"
                numberOfLines={1}
              >
                · {session.role}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={colors.inkMuted}
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          ),
        }}
      >
        {TABS.map((t) => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              href: t.name === "panel" && !isOwner ? null : undefined,
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={focused ? t.activeIcon : t.icon}
                  size={size - 3}
                  color={color as string}
                />
              ),
            }}
          />
        ))}
      </Tabs>

      {/* Account & Appearance Modal (triggered from top-right user/role pill) */}
      <Modal
        visible={accountOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountOpen(false)}
      >
        <Pressable
          onPress={() => setAccountOpen(false)}
          style={{ backgroundColor: colors.backdrop }}
          className="flex-1 justify-start px-4 pt-24"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="w-full max-w-sm self-end rounded-3xl p-5 shadow-xl"
          >
            {/* Identity Header */}
            <View className="flex-row items-center">
              <BrandLogo size={42} />
              <View className="ml-3 flex-1">
                <Text style={{ color: colors.ink }} className="text-sm font-semibold">
                  {session.username}
                </Text>
                <Text
                  style={{ color: colors.accentWarm }}
                  className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider"
                >
                  {roleBadgeLabel(session.role)} Account
                </Text>
              </View>
              <Pressable onPress={() => setAccountOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={18} color={colors.inkMuted} />
              </Pressable>
            </View>

            {/* Theme Mode Switcher */}
            <Text
              style={{ color: colors.inkSubtle }}
              className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.16em]"
            >
              Appearance
            </Text>
            <View
              style={{
                backgroundColor: colors.recessed,
                borderColor: colors.hairline,
                borderWidth: 1,
              }}
              className="flex-row rounded-xl p-1"
            >
              {(
                [
                  { key: "dark", label: "Dark", icon: "moon-outline" },
                  { key: "light", label: "Light", icon: "sunny-outline" },
                ] as { key: ThemeMode; label: string; icon: IconName }[]
              ).map((opt) => {
                const active = mode === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setMode(opt.key)}
                    style={{
                      backgroundColor: active ? colors.elevated : "transparent",
                      borderColor: active ? colors.hairlineStrong : "transparent",
                      borderWidth: active ? 1 : 0,
                    }}
                    className="flex-1 flex-row items-center justify-center rounded-lg py-2.5"
                  >
                    <Ionicons
                      name={opt.icon}
                      size={14}
                      color={active ? colors.accent : colors.inkSubtle}
                    />
                    <Text
                      style={{ color: active ? colors.ink : colors.inkMuted }}
                      className="ml-1.5 text-xs font-semibold"
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Sign Out */}
            <Pressable
              onPress={confirmLogout}
              style={{
                backgroundColor: colors.crimsonBg,
                borderColor: colors.crimsonBorder,
                borderWidth: 1,
              }}
              className="mt-4 flex-row items-center justify-center rounded-xl py-3"
            >
              <Ionicons name="log-out-outline" size={16} color={colors.crimson} />
              <Text
                style={{ color: colors.crimson }}
                className="ml-2 text-xs font-semibold"
              >
                Sign Out
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
