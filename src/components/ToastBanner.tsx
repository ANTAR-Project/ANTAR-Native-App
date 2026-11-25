import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ToastState } from "../hooks/useToast";

interface Props {
  toast: ToastState | null;
  onDismiss?: () => void;
}

export default function ToastBanner({ toast, onDismiss }: Props) {
  if (!toast) return null;

  const palette =
    toast.kind === "error"
      ? { bg: "bg-red-950 border-red-400/60", text: "text-red-200", icon: "alert-circle" as const, iconColor: "#fca5a5" }
      : toast.kind === "success"
      ? { bg: "bg-emerald-950 border-emerald-400/60", text: "text-emerald-200", icon: "checkmark-circle" as const, iconColor: "#6ee7b7" }
      : { bg: "bg-blue-900 border-blue-400/60", text: "text-blue-100", icon: "notifications" as const, iconColor: "#93c5fd" };

  return (
    <Pressable
      onPress={onDismiss}
      className={`mx-4 mt-3 flex-row items-center rounded-2xl border px-4 py-3 ${palette.bg}`}
    >
      <Ionicons name={palette.icon} size={20} color={palette.iconColor} />
      <Text className={`ml-2.5 flex-1 text-sm font-medium ${palette.text}`}>
        {toast.message}
      </Text>
      {onDismiss && (
        <View className="ml-2">
          <Ionicons name="close" size={16} color={palette.iconColor} />
        </View>
      )}
    </Pressable>
  );
}
