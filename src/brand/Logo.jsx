import GlobalOpsLogo from "./GlobalOpsLogo";
import { useTheme } from "../theme";

// O logo no modo atual. bg é a cor real do fundo (usada na folga onde a órbita passa à frente do O).
const SURFACE = { dark: "#0A0A0B", light: "#F7F4EF" };
export default function Logo({ colors, surface, ...props }) {
  const { theme } = useTheme();
  return (
    <GlobalOpsLogo
      theme={theme}
      {...props}
      colors={{ bg: surface?.[theme] || SURFACE[theme], ...colors }}
    />
  );
}
