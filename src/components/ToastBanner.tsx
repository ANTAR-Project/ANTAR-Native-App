import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import type { ToastState } from "../hooks/useToast";

interface Props {
  toast: ToastState | null;
  onDismiss?: () => void;
}

export default function ToastBanner({ toast, onDismiss }: Props) {
  const { colors } = useTheme();
  if (!toast) return null;

  const palette =
    toast.kind === "error"
      ? {
          bg: colors.crimsonBg,
          border: colors.crimsonBorder,
          text: colors.crimson,
          icon: "alert-circle-outline" as const,
        }
      : toast.kind === "success"
      ? {
          bg: colors.emeraldBg,
          border: colors.emeraldBorder,
          text: colors.emerald,
          icon: "checkmark-circle-outline" as const,
        }
      : {
          bg: colors.elevated,
          border: colors.hairlineStrong,
          text: colors.ink,
          icon: "information-circle-outline" as const,
        };

  return (
    <Pressable
      onPress={onDismiss}
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.border,
        borderWidth: 1,
      }}
      className="mx-4 mt-3 flex-row items-center rounded-2xl px-4 py-3"
    >
      <Ionicons name={palette.icon} size={18} color={palette.text} />
      <Text
        style={{ color: palette.text }}
        className="ml-2.5 flex-1 text-xs font-medium leading-4"
      >
        {toast.message}
      </Text>
      {onDismiss && (
        <View className="ml-2 opacity-70">
          <Ionicons name="close" size={15} color={palette.text} />
        </View>
      )}
    </Pressable>
  );
}
