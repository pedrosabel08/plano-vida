import {
  BookOpen,
  Wallet,
  BriefcaseBusiness,
  Brain,
  Heart,
  Target,
  Sparkles,
  Coffee,
  Music,
  House,
  Globe,
  Leaf,
  type LucideProps,
} from "lucide-react";
const icons = {
  "book-open": BookOpen,
  wallet: Wallet,
  briefcase: BriefcaseBusiness,
  brain: Brain,
  heart: Heart,
  target: Target,
  sparkles: Sparkles,
  coffee: Coffee,
  music: Music,
  home: House,
  globe: Globe,
  leaf: Leaf,
};
export function AreaIcon({ name, ...props }: LucideProps & { name: string }) {
  const Icon = icons[name as keyof typeof icons] || Leaf;
  return <Icon aria-hidden="true" {...props} />;
}
