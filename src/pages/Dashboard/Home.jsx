import React, { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import AttentionBand from '../../components/Dashboard/AttentionBand';
import AwaitingLinking from '../../components/Dashboard/AwaitingLinking';
import KpiCard from '../../components/Dashboard/KpiCard';
import RecentMovement from '../../components/Dashboard/RecentMovement';
import StockByPack from '../../components/Dashboard/StockByPack';
import { SkeletonKpiCard } from '../../components/Dashboard/Skeleton';
import {
  CalendarIcon,
  ChartIcon,
  InboxIcon,
  RefreshIcon,
  TagIcon,
  TruckIcon,
} from '../../components/Dashboard/icons';
import {
  MOVEMENT_TABS,
  formatPeriod,
  formatQuantity,
} from '../../components/Dashboard/dashboardFormat';

const Home = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState(null);

  // The first load replaces the whole page with skeletons; a tab change only
  // replaces the feed, so the figures above it keep their place.
  const [initialLoading, setInitialLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const tab = MOVEMENT_TABS.find((entry) => entry.key === activeTab) || MOVEMENT_TABS[0];
    const isFirstLoad = firstLoadRef.current;

    if (isFirstLoad) setInitialLoading(true);
    setFeedLoading(true);
    setError(null);

    const fetchDashboardData = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.DASHBOARD.GET_DATA, {
          params: tab.types ? { types: tab.types } : undefined,
        });
        if (cancelled) return;
        setDashboardData(response.data);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load the dashboard', err);
        setError(
          err?.response?.data?.message || 'Something went wrong while loading the dashboard.'
        );
      } finally {
        if (!cancelled) {
          firstLoadRef.current = false;
          setInitialLoading(false);
          setFeedLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, reloadToken]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  const kpis = dashboardData?.kpis;
  const period = dashboardData?.period;
  const awaitingLinking = dashboardData?.awaitingLinking;
  const stockByPack = dashboardData?.stockByPack || [];
  const recentMovement = dashboardData?.recentMovement || [];

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">

        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">
              Operations overview
            </h1>
            <p className="mt-1.5 mb-0 text-[13px] text-[#5A636D]">
              Excise label movement for the current period
              {period?.previous &&
                `, against ${formatPeriod(period.previous.startDate, period.previous.endDate)}`}
              .
            </p>
          </div>
          <span className="flex h-9 items-center gap-2 rounded-lg border border-[#E3E2DE] bg-white px-3 text-[12.5px] text-[#2A2F36]">
            <span className="text-[#5A636D]">
              <CalendarIcon size={15} strokeWidth={1.8} />
            </span>
            <span className="font-numeric tabular-nums">
              {period ? formatPeriod(period.startDate, period.endDate) : 'Month to date'}
            </span>
          </span>
        </div>

        {error && (
          <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
            <span className="min-w-[220px] flex-1">{error}</span>
            <button
              type="button"
              onClick={retry}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-[#E1B4B2] bg-white px-3 text-[12.5px] font-medium text-[#7A2322]"
            >
              <RefreshIcon size={14} strokeWidth={1.8} />
              Try again
            </button>
          </div>
        )}

        {!initialLoading && (
          <AttentionBand
            count={awaitingLinking?.count || 0}
            casesOutstanding={awaitingLinking?.casesOutstanding || 0}
          />
        )}

        {/* KPI row */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {initialLoading ? (
            Array.from({ length: 4 }).map((_, index) => <SkeletonKpiCard key={index} />)
          ) : (
            <>
              <KpiCard
                label="Labels on hand"
                icon={<TagIcon size={15} />}
                kpi={kpis?.labelsOnHand}
                footnote={`${formatQuantity(kpis?.labelsOnHand?.openRanges || 0)} open ${
                  kpis?.labelsOnHand?.openRanges === 1 ? 'range' : 'ranges'
                }`}
              />
              <KpiCard
                label="Issued this period"
                icon={<InboxIcon size={15} />}
                kpi={kpis?.issued}
                footnote={`${formatQuantity(kpis?.issued?.count || 0)} ${
                  kpis?.issued?.count === 1 ? 'issuance' : 'issuances'
                }`}
              />
              <KpiCard
                label="Applied in production"
                icon={<ChartIcon size={15} />}
                kpi={kpis?.applied}
                footnote={
                  kpis?.applied?.utilisationPct == null
                    ? `${formatQuantity(kpis?.applied?.count || 0)} usage records`
                    : `${kpis.applied.utilisationPct}% of labels available`
                }
              />
              <KpiCard
                label="Dispatched"
                icon={<TruckIcon size={15} />}
                kpi={kpis?.dispatched}
                footnote={`${formatQuantity(kpis?.dispatched?.count || 0)} dispatch ${
                  kpis?.dispatched?.count === 1 ? 'note' : 'notes'
                }`}
              />
            </>
          )}
        </div>

        {/* Stock and linking */}
        <div className="flex flex-wrap items-start gap-3.5">
          <StockByPack rows={stockByPack} loading={initialLoading} />
          <AwaitingLinking notes={awaitingLinking?.notes || []} loading={initialLoading} />
        </div>

        <RecentMovement
          rows={recentMovement}
          loading={initialLoading || feedLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </DashboardLayout>
  );
};

export default Home;
