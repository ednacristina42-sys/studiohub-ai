import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      data-testid="theme-toggle-btn"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full text-muted-foreground hover:text-foreground transition-colors"
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </Button>
  );
};

export default ThemeToggle;
