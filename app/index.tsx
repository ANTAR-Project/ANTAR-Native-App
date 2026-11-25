import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

type Role = "owner" | "resident";

const ROLES: { key: Role; title: string; desc: string; icon: string }[] = [
  {
    key: "owner",
    title: "Owner",
    desc: "Manage residents, workspaces and access permissions.",
    icon: "🏢",
  },
  {
    key: "resident",
    title: "Resident",
    desc: "Browse files, watch Streamyard and control your elements.",
    icon: "🏠",
  },
];

const FEATURES = ["📁 Files", "🎬 Streamyard", "🎛️ Elements"];

export default function Landing() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  const handleContinue = () => {
  router.push({ pathname: "/auth", params: { role: role! } });
};
  return (
    <SafeAreaView className="flex-1 bg-blue-900">
      <View className="flex-1 px-6 pb-8 pt-12">
        {/* Brand */}
        <View className="items-center">
          <Text className="text-5xl font-bold tracking-wider text-blue-200">
            AN | TAR.
          </Text>
          <Text className="mt-3 text-center text-base text-blue-300">
            Your files, streams and smart elements in one place.
          </Text>

          <View className="mt-5 flex-row flex-wrap justify-center gap-2">
            {FEATURES.map((f) => (
              <View key={f} className="rounded-full bg-blue-800 px-3 py-1.5">
                <Text className="text-xs font-medium text-blue-200">{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Role selection */}
        <Text className="mb-3 mt-12 text-sm font-semibold uppercase tracking-widest text-blue-400">
          Continue as
        </Text>

        <View className="gap-4">
          {ROLES.map((r) => {
            const selected = role === r.key;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRole(r.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`flex-row items-center rounded-2xl border-2 p-5 ${
                  selected
                    ? "border-blue-200 bg-blue-800"
                    : "border-blue-700 bg-blue-900"
                }`}
              >
                <Text className="mr-4 text-4xl">{r.icon}</Text>
                <View className="flex-1">
                  <Text className="text-xl font-semibold text-blue-100">
                    {r.title}
                  </Text>
                  <Text className="mt-1 text-sm text-blue-300">{r.desc}</Text>
                </View>
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selected ? "border-blue-200 bg-blue-200" : "border-blue-500"
                  }`}
                >
                  {selected && (
                    <View className="h-2.5 w-2.5 rounded-full bg-blue-900" />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-1" />

        {/* CTA */}
        <Pressable
          disabled={!role}
          onPress={handleContinue}
          className={`items-center rounded-2xl py-4 ${
            role ? "bg-blue-200" : "bg-blue-800"
          }`}
        >
          <Text
            className={`text-lg font-bold ${
              role ? "text-blue-900" : "text-blue-500"
            }`}
          >
            {role
              ? `Continue as ${role === "owner" ? "Owner" : "Resident"}`
              : "Select a role"}
          </Text>
        </Pressable>

        <Text className="mt-4 text-center text-xs text-blue-400">
          Secure sign-in with password or fingerprint
        </Text>
      </View>
    </SafeAreaView>
  );
}