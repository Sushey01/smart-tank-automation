import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  Home,
  TrendingDown,
  VolumeX,
  Zap,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { getWaterInsights, getDailyConsumptionSeries, getHomes, ackAlert } from '../api/telemetry';
import { formatNumber } from '../lib/format';

const poll = { refetchInterval: 4000, refetchIntervalInBackground: false } as const;

export function SmartWaterInsights() {
  const queryClient = useQueryClient();
  const [selectedHome, setSelectedHome] = useState<string>('H001');
  const [isBuzzerSilenced, setIsBuzzerSilenced] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopBuzzerRef = useRef<(() => void) | null>(null);

  const insightsQuery = useQuery({
    queryKey: ['water-insights', selectedHome],
    queryFn: () => getWaterInsights(),
    ...poll,
  });

  const dailyQuery = useQuery({
    queryKey: ['daily-consumption', selectedHome],
    queryFn: () => getDailyConsumptionSeries(7),
    ...poll,
  });

  const homesQuery = useQuery({
    queryKey: ['homes-list'],
    queryFn: getHomes,
    staleTime: 60000,
  });

  const ackMutation = useMutation({
    mutationFn: ackAlert,
    onSuccess: () => {
      silenceBuzzer();
      void queryClient.invalidateQueries({ queryKey: ['water-insights'] });
    },
  });

  const data = insightsQuery.data;
  const homes = homesQuery.data?.homes || [];
  const currentHome = homes.find((h) => h.home_id === selectedHome) || {
    home_id: 'H001',
    owner: 'Alex Mercer',
    address: '142 Elm Road',
    city: 'Birmingham',
    postcode: 'B4 7ET',
    water_tariff: 'Smart Standard Meter (0.0018 GBP/L)',
  };

  const activeAlert = data?.latest_alert && data.latest_alert.status === 'unread' ? data.latest_alert : null;
  const hasAbnormalAlert = activeAlert && (activeAlert.alert_type === 'ABNORMAL_WATER_USAGE' || activeAlert.alert_type.includes('LEAK'));

  // Audio Buzzer logic using Web Audio API
  useEffect(() => {
    if (hasAbnormalAlert && !isBuzzerSilenced) {
      playChime();
    } else {
      stopBuzzer();
    }
    return () => stopBuzzer();
  }, [hasAbnormalAlert, isBuzzerSilenced]);

  function playChime() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') void ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      const interval = setInterval(() => {
        if (!ctx) return;
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        setTimeout(() => {
          try {
            osc.frequency.setValueAtTime(500, ctx.currentTime);
          } catch {
            /* ignore */
          }
        }, 150);
      }, 700);

      stopBuzzerRef.current = () => {
        clearInterval(interval);
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* Browser autoplay audio policy fallback */
    }
  }

  function stopBuzzer() {
    if (stopBuzzerRef.current) {
      stopBuzzerRef.current();
      stopBuzzerRef.current = null;
    }
  }

  function silenceBuzzer() {
    setIsBuzzerSilenced(true);
    stopBuzzer();
  }

  if (insightsQuery.isLoading || !data) {
    return (
      <div className="card space-y-3 animate-pulse">
        <div className="h-6 bg-slate-700/50 rounded w-1/3" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const { consumption, prediction } = data;

  return (
    <div className="space-y-4">
      {/* 1. Family Household Header */}
      <div className="card bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-cyan-800/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-600/30 text-cyan-400">
              <Home size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  {currentHome.owner} Household
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700/40">
                  {currentHome.home_id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentHome.address}, {currentHome.city} · Tariff: <span className="text-slate-300">{currentHome.water_tariff || '0.0018 GBP/L'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-400">Water Storage Tank</span>
              <p className="text-sm font-semibold text-slate-200">
                {data.current_volume_litres} L <span className="text-xs font-normal text-slate-400">/ {data.tank_capacity_litres} L</span>
              </p>
            </div>
            <select
              value={selectedHome}
              onChange={(e) => setSelectedHome(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              aria-label="Select Resident Household"
            >
              {homes.map((h) => (
                <option key={h.home_id} value={h.home_id}>
                  {h.owner} ({h.home_id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Active Anomaly Alert Banner + Buzzer Control */}
      {hasAbnormalAlert && (
        <div className="card bg-red-950/60 border border-red-500/70 p-4 shadow-lg animate-fade-up">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-900/80 text-red-200 animate-bounce">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-700 text-white">
                    {activeAlert.alert_type}
                  </span>
                  <span className="text-xs text-red-300">
                    {new Date(activeAlert.timestamp).toLocaleTimeString()} UTC
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  {activeAlert.message}
                </h3>
                <p className="text-xs text-red-200">
                  Estimated excess water loss: <strong className="text-yellow-300 font-mono text-sm">{activeAlert.estimated_excess_loss_litres || 85} Litres</strong>
                </p>
                <p className="text-xs text-red-300/90 italic">
                  💡 Recommendation: {activeAlert.recommendation || 'Please check household taps, toilets, and pipelines.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-center sm:self-auto">
              {!isBuzzerSilenced && (
                <button
                  type="button"
                  onClick={silenceBuzzer}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-red-800 hover:bg-red-700 text-white transition-colors"
                >
                  <VolumeX size={14} />
                  Mute Buzzer
                </button>
              )}
              <button
                type="button"
                disabled={ackMutation.isPending}
                onClick={() => ackMutation.mutate(activeAlert._id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-white hover:bg-slate-100 text-red-950 transition-colors shadow"
              >
                <CheckCircle2 size={14} />
                Acknowledge Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Water Intelligence Stat Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        {/* Today's Usage */}
        <div className="card p-4 space-y-1.5 border-slate-700/60 hover:border-cyan-700/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today's Usage</span>
            <Droplets size={16} className="text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white">
              {formatNumber(consumption.today_litres, 0)}
            </span>
            <span className="text-xs text-slate-400">Litres</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${consumption.is_today_estimated ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'}`}>
            {consumption.is_today_estimated ? 'Normalized Daily Rate' : 'Live Aggregation'}
          </span>
        </div>

        {/* Yesterday's Usage */}
        <div className="card p-4 space-y-1.5 border-slate-700/60 hover:border-cyan-700/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Yesterday</span>
            <Calendar size={16} className="text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white">
              {formatNumber(consumption.yesterday_litres, 0)}
            </span>
            <span className="text-xs text-slate-400">Litres</span>
          </div>
          <p className="text-[11px] text-slate-400">Past 24h consumption cycle</p>
        </div>

        {/* Daily Average */}
        <div className="card p-4 space-y-1.5 border-slate-700/60 hover:border-cyan-700/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Daily Average</span>
            <TrendingDown size={16} className="text-teal-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white">
              {formatNumber(consumption.daily_average_litres, 0)}
            </span>
            <span className="text-xs text-slate-400">Litres/day</span>
          </div>
          <p className="text-[11px] text-slate-400">30-day baseline</p>
        </div>

        {/* Monthly Total */}
        <div className="card p-4 space-y-1.5 border-slate-700/60 hover:border-cyan-700/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Monthly Usage</span>
            <Zap size={16} className="text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white">
              {formatNumber(consumption.monthly_litres, 0)}
            </span>
            <span className="text-xs text-slate-400">L (30d)</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Prev month: {formatNumber(consumption.previous_month_litres, 0)} L
          </p>
        </div>

        {/* Depletion Time Prediction */}
        <div className="card p-4 space-y-1.5 border-cyan-800/50 bg-cyan-950/20 sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between text-xs text-cyan-300">
            <span>Time to Critical (25%)</span>
            <Clock size={16} className="text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-cyan-100">
              {prediction.display}
            </span>
          </div>
          <p className="text-[11px] text-cyan-300/80 truncate">
            {prediction.drain_rate_lph ? `${prediction.drain_rate_lph} L/h consumption` : prediction.message || 'Reserve stable'}
          </p>
        </div>
      </div>

      {/* 4. 7-Day Consumption Trend Bar Chart */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Daily Water Consumption History (Litres)
            </h3>
            <p className="text-xs text-slate-400">
              Calculated via MongoDB Aggregation Pipelines across the 3-node replica set
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
            {dailyQuery.data?.series ? `${dailyQuery.data.series.length} Days Aggregated` : '7-Day View'}
          </span>
        </div>

        <div className="h-44 w-full pt-2">
          {dailyQuery.data?.series && dailyQuery.data.series.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyQuery.data.series} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val: string) => val.slice(5)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.375rem', fontSize: '12px' }}
                  formatter={(value: number) => [`${value} Litres`, 'Consumed']}
                  labelFormatter={(lbl: string) => `Date: ${lbl}`}
                />
                <Bar dataKey="litres" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
              Historical consumption pipeline active on secondary nodes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
