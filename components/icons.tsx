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
  ChevronLeft,
  ChevronRight,
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
  Repeat,
  ShoppingBag,
  RefreshCw,
  Vault,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Package,
  Droplets,
  Baby,
  MapPin,
  FileText,
  ShoppingCart,
  CalendarClock,
  LayoutGrid,
  Undo2,
  Download,
  Upload,
  Printer,
  FileSpreadsheet,
  Minus,
  WifiOff,
  Heart,
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
export const IconFamilia = withDefaultStroke(Users);
export const IconCadastro = withDefaultStroke(ClipboardList);
export const IconAjustes = withDefaultStroke(Settings);
export const IconBell = withDefaultStroke(Bell);
export const IconChevronDown = withDefaultStroke(ChevronDown);
export const IconChevronLeft = withDefaultStroke(ChevronLeft);
export const IconChevronRight = withDefaultStroke(ChevronRight);
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
export const IconRecorrente = withDefaultStroke(Repeat);
export const IconCompras = withDefaultStroke(ShoppingBag);
export const IconAtualizar = withDefaultStroke(RefreshCw);
export const IconCofre = withDefaultStroke(Vault);
export const IconDepositar = withDefaultStroke(ArrowDownToLine);
export const IconRetirar = withDefaultStroke(ArrowUpFromLine);
export const IconCadeado = withDefaultStroke(Lock);

// Estoque familiar / portal de apps
export const IconEstoque = withDefaultStroke(Package);
export const IconAgua = withDefaultStroke(Droplets);
export const IconBebe = withDefaultStroke(Baby);
export const IconLocal = withDefaultStroke(MapPin);
export const IconRelatorio = withDefaultStroke(FileText);
export const IconCarrinho = withDefaultStroke(ShoppingCart);
export const IconValidade = withDefaultStroke(CalendarClock);
export const IconApps = withDefaultStroke(LayoutGrid);
export const IconDesfazer = withDefaultStroke(Undo2);
export const IconBaixar = withDefaultStroke(Download);
export const IconEnviar = withDefaultStroke(Upload);
export const IconImprimir = withDefaultStroke(Printer);
export const IconPlanilha = withDefaultStroke(FileSpreadsheet);
export const IconMenos = withDefaultStroke(Minus);
export const IconOffline = withDefaultStroke(WifiOff);
export const IconLife = withDefaultStroke(Heart);
