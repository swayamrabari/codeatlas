import {
  House,
  ChartPie,
  WalletCards,
  ArrowLeftRight,
  Sparkles,
  Shield,
} from 'lucide-react';

const navOptions = [
  { path: '/', icon: <House />, label: 'Home' },
  {
    path: '/entries',
    icon: <ArrowLeftRight />,
    label: 'Entries',
  },
  { path: '/insights', icon: <ChartPie />, label: 'Insights' },
  { path: '/budget', icon: <WalletCards />, label: 'Budgets' },
  { path: '/assistant', icon: <Sparkles />, label: 'TrackIt AI' },
  { path: '/admin', icon: <Shield />, label: 'Admin', adminOnly: true },
];

export default navOptions;
