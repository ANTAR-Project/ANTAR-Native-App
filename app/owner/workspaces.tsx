import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { MOCK_RESIDENTS } from "../../src/data/mock";
import type { Resident } from "../../src/types";

export default function ResidentWorkspaces() {
  const [residents, setResidents] = useState<Resident[]>(MOCK_RESIDENTS);

  const setWorkspace = (id: string, hasWorkspace: boolean) =>
    setResidents((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hasWorkspace } : r))
    );

  const revoke = (r: Resident) =>
    Alert.alert(
      "Revoke workspace?",
      `${r.username} will lose access to their workspace.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          // TODO: call the owner revoke endpoint
          onPress: () => setWorkspace(r.id, false),
        },
      ]
    );

  const active = residents.filter((r) => r.hasWorkspace).length;

  return (
    <ScrollView className="flex-1 bg-blue-950" contentContainerClassName="p-4 pb-10">
      <View className="rounded-2xl bg-blue-800 p-4">
        <Text className="text-2xl font-bold text-blue-100">
          {active} / {residents.length}
        </Text>
        <Text className="text-xs text-blue-300">residents with an active workspace</Text>
      </View>

      <View className="mt-5 gap-2.5">
        {residents.map((r) => (
          <View key={r.id} className="flex-row items-center rounded-2xl bg-blue-800 p-4">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-950">
              <Text className="text-lg font-bold uppercase text-blue-200">
                {r.username[0]}
              </Text>
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-blue-100">{r.username}</Text>
              <Text className="mt-0.5 text-xs text-blue-300">
                Unit {r.unit} · {r.hasWorkspace ? "Workspace active" : "No workspace"}
              </Text>
            </View>

            {r.hasWorkspace ? (
              <Pressable
                onPress={() => revoke(r)}
                className="rounded-xl border border-red-400/60 px-3 py-2"
              >
                <Text className="text-sm font-semibold text-red-300">Revoke</Text>
              </Pressable>
            ) : (
              <Pressable
                // TODO: call the owner create-workspace endpoint
                onPress={() => setWorkspace(r.id, true)}
                className="rounded-xl bg-blue-200 px-3 py-2"
              >
                <Text className="text-sm font-bold text-blue-900">Create</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}