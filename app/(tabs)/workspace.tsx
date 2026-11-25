import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";

type WsState = "active" | "empty" | "deleted";

const TOTAL_GB = 10;
const USED_GB = 2.4;

export default function Workspace() {
  const { session, clearVault } = useAuth();
  const [state, setState] = useState<WsState>("active");

  const confirm = (title: string, message: string, label: string, action: () => void) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: label, style: "destructive", onPress: action },
    ]);

  const used = state === "active" ? USED_GB : 0;
  const pct = Math.round((used / TOTAL_GB) * 100);

  return (
    <ScrollView className="flex-1 bg-blue-950" contentContainerClassName="p-4 pb-10">
      {/* Workspace card */}
      <View className="rounded-2xl bg-blue-800 p-5">
        <View className="flex-row items-center">
          <Ionicons name="server-outline" size={28} color="#bfdbfe" />
          <View className="ml-3 flex-1">
            <Text className="text-lg font-bold text-blue-100">
              {session?.username}'s workspace
            </Text>
            <Text className="text-xs uppercase tracking-widest text-blue-400">
              {state === "deleted" ? "Deleted" : "Active"}
            </Text>
          </View>
        </View>

        {state !== "deleted" && (
          <View className="mt-5">
            <View className="h-2.5 overflow-hidden rounded-full bg-blue-950">
              <View
                className="h-full rounded-full bg-blue-200"
                style={{ width: `${pct}%` }}
              />
            </View>
            <Text className="mt-2 text-sm text-blue-300">
              {used.toFixed(1)} GB of {TOTAL_GB} GB used
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {state === "deleted" ? (
        <View className="mt-6 items-center rounded-2xl border border-blue-700 p-6">
          <Text className="text-center text-base text-blue-300">
            Your workspace was deleted. Create a new one to start uploading files again.
          </Text>
          <Pressable
            // TODO: POST /workspace/create
            onPress={() => setState("empty")}
            className="mt-5 w-full items-center rounded-2xl bg-blue-200 py-4"
          >
            <Text className="text-lg font-bold text-blue-900">Create workspace</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-6 gap-3">
          <Pressable
            disabled={state === "empty"}
            onPress={() =>
              confirm(
                "Clear workspace?",
                "All files and folders inside will be removed. The workspace itself stays.",
                "Clear",
                // TODO: DELETE /workspace/clear
                () => setState("empty")
              )
            }
            className={`flex-row items-center rounded-2xl border-2 p-4 ${
              state === "empty" ? "border-blue-800 opacity-50" : "border-blue-500"
            }`}
          >
            <Ionicons name="trash-bin-outline" size={24} color="#bfdbfe" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-blue-100">Clear workspace</Text>
              <Text className="text-xs text-blue-300">
                {state === "empty" ? "Already empty" : "Remove everything inside"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() =>
              confirm(
                "Delete workspace?",
                "Your entire workspace and all its contents will be permanently deleted.",
                "Delete",
                // TODO: DELETE /workspace/delete
                () => setState("deleted")
              )
            }
            className="flex-row items-center rounded-2xl border-2 border-red-400/60 p-4"
          >
            <Ionicons name="warning-outline" size={24} color="#f87171" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-red-300">Delete workspace</Text>
              <Text className="text-xs text-blue-300">Permanently remove the workspace</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Security */}
      <Text className="mb-2 mt-10 text-sm font-semibold uppercase tracking-widest text-blue-400">
        Security
      </Text>
      <Pressable
        onPress={async () => {
          await clearVault();
          Alert.alert("Done", "Fingerprint login was removed from this device.");
        }}
        className="flex-row items-center rounded-2xl bg-blue-800 p-4"
      >
        <Ionicons name="finger-print-outline" size={24} color="#bfdbfe" />
        <Text className="ml-3 text-base text-blue-100">Forget fingerprint on this device</Text>
      </Pressable>
    </ScrollView>
  );
}