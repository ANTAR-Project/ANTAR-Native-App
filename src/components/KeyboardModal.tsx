import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

interface Props {
  visible: boolean;
  onRequestClose: () => void;
  variant?: "center" | "sheet";
  animationType?: "none" | "slide" | "fade";
  children: ReactNode;
}

export default function KeyboardModal({
  visible,
  onRequestClose,
  variant = "center",
  animationType = variant === "sheet" ? "slide" : "fade",
  children,
}: Props) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onRequestClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ backgroundColor: colors.backdrop }}
        className="flex-1"
      >
        {variant === "sheet" ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow justify-end pt-14"
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopColor: colors.hairlineStrong,
                borderTopWidth: 1,
              }}
              className="rounded-t-[28px] px-6 pb-8 pt-4"
            >
              <View
                style={{ backgroundColor: colors.hairlineStrong }}
                className="mb-5 h-1 w-10 self-center rounded-full"
              />
              {children}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow items-center justify-center px-6 py-8"
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="w-full max-w-md rounded-3xl p-6"
            >
              {children}
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
