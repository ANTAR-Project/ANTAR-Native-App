import { Image, type ImageStyle, type StyleProp, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

const LOGO_ASSET = require("../../assets/images/antar-logo.png");

interface Props {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export default function BrandLogo({ size = 84, style }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 0,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.hairlineStrong,
        backgroundColor: "#283044",
      }}
    >
      <Image
        source={LOGO_ASSET}
        style={[{ width: "100%", height: "100%" }, style]}
        resizeMode="cover"
      />
    </View>
  );
}
