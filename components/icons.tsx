import type { SVGProps } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Landmark,
  Target,
  TrendingUp,
  Users,
  ClipboardList,
  Settings,
  Bell,
  ChevronDown,
  Plus,
  Trash2,
  Pencil,
  LogOut,
  Menu,
  X,
  Wallet,
  TrendingDown,
  LineChart,
  PanelLeftClose,
  PanelLeft,
  Eye,
  EyeOff,
  AlertTriangle,
  Calendar,
  Search,
  CreditCard,
  Image,
  Clock,
  ArrowUpDown,
  Filter,
  Check,
  type LucideIcon,
} from 'lucide-react';

function withDefaultStroke(LucideComponent: LucideIcon) {
  return function ThemedIcon(props: SVGProps<SVGSVGElement>) {
    return <LucideComponent strokeWidth={1.8} {...props} />;
  };
}

export const IconDashboard = withDefaultStroke(LayoutDashboard);
export const IconTransacoes = withDefaultStroke(ArrowLeftRight);
export const IconOrcamentos = withDefaultStroke(PiggyBank);
export const IconDividas = withDefaultStroke(Landmark);
export const IconMetas = withDefaultStroke(Target);
export const IconPrevisao = withDefaultStroke(TrendingUp);
export const IconFamilia = withDefaultStroke(Users);
export const IconCadastro = withDefaultStroke(ClipboardList);
export const IconAjustes = withDefaultStroke(Settings);
export const IconBell = withDefaultStroke(Bell);
export const IconChevronDown = withDefaultStroke(ChevronDown);
export const IconPlus = withDefaultStroke(Plus);
export const IconTrash = withDefaultStroke(Trash2);
export const IconEdit = withDefaultStroke(Pencil);
export const IconLogout = withDefaultStroke(LogOut);
export const IconMenu = withDefaultStroke(Menu);
export const IconClose = withDefaultStroke(X);
export const IconWallet = withDefaultStroke(Wallet);
export const IconLandmark = withDefaultStroke(Landmark);
export const IconPiggyBank = withDefaultStroke(PiggyBank);
export const IconTrendUp = withDefaultStroke(TrendingUp);
export const IconTrendDown = withDefaultStroke(TrendingDown);
export const IconChart = withDefaultStroke(LineChart);
export const IconSidebarClose = withDefaultStroke(PanelLeftClose);
export const IconSidebarOpen = withDefaultStroke(PanelLeft);
export const IconEye = withDefaultStroke(Eye);
export const IconEyeOff = withDefaultStroke(EyeOff);
export const IconAlerta = withDefaultStroke(AlertTriangle);
export const IconCalendario = withDefaultStroke(Calendar);
export const IconSearch = withDefaultStroke(Search);
export const IconCartao = withDefaultStroke(CreditCard);
export const IconImagem = withDefaultStroke(Image);
export const IconRelogio = withDefaultStroke(Clock);
export const IconOrdenar = withDefaultStroke(ArrowUpDown);
export const IconFiltro = withDefaultStroke(Filter);
export const IconCheck = withDefaultStroke(Check);
