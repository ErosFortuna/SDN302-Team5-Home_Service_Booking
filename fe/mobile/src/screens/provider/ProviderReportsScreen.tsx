import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon } from '../../components/ui/Icon';
import {
  formatProviderReportMoney,
  getProviderPerformanceReport,
  type ProviderPerformanceReport,
  type ReportGranularity,
  type RequestGranularity,
} from '../../services/providerReportService';

type RangePreset = '7d' | '30d' | '12m';

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rangeFor(preset: RangePreset) {
  const end = new Date();
  const start = new Date(end);
  if (preset === '7d') start.setDate(start.getDate() - 6);
  else if (preset === '30d') start.setDate(start.getDate() - 29);
  else start.setMonth(start.getMonth() - 11, 1);
  return { startDate: dateKey(start), endDate: dateKey(end) };
}

function periodLabel(period: string, granularity: ReportGranularity | RequestGranularity) {
  if (granularity === 'week') {
    const [year, week] = period.split('-W');
    return `Tuần ${week}/${year}`;
  }
  if (granularity === 'month') {
    const [year, month] = period.split('-');
    return `${month}/${year}`;
  }
  const [, month, day] = period.split('-');
  return `${day}/${month}`;
}

function MetricCard({ title, value, caption, icon }: { title: string; value: string; caption: string; icon: 'earnings' | 'briefcase' | 'trendingUp' | 'clock' }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeading}>
        <Text style={styles.metricLabel}>{title}</Text>
        <Icon name={icon} size={18} color={Colors.primary[600]} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricCaption}>{caption}</Text>
    </View>
  );
}

function PeriodSelector<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <View style={styles.selector}>
      {options.map((option) => (
        <TouchableOpacity key={option.value} onPress={() => onChange(option.value)} style={[styles.selectorItem, value === option.value && styles.selectorItemActive]}>
          <Text style={[styles.selectorText, value === option.value && styles.selectorTextActive]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ProviderReportsScreen() {
  const [preset, setPreset] = React.useState<RangePreset>('30d');
  const [granularity, setGranularity] = React.useState<ReportGranularity>('day');
  const [requestGranularity, setRequestGranularity] = React.useState<RequestGranularity>('day');
  const [report, setReport] = React.useState<ProviderPerformanceReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setReport(await getProviderPerformanceReport({ ...rangeFor(preset), granularity, requestGranularity }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải báo cáo provider.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preset, granularity, requestGranularity]);

  useFocusEffect(React.useCallback(() => {
    void load();
  }, [load]));

  const responseMinutes = report?.summary.averageResponseMinutes;
  const responseTime = responseMinutes == null
    ? '—'
    : responseMinutes < 60
      ? `${Math.round(responseMinutes)} phút`
      : `${(responseMinutes / 60).toFixed(1)} giờ`;
  const maxRevenue = Math.max(1, ...(report?.revenueSeries.map((point) => point.revenue) ?? []));
  const maxRequests = Math.max(1, ...(report?.requestSeries.map((point) => point.bookingCount) ?? []));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Báo cáo hoạt động</Text>
          <Text style={styles.subtitle}>Doanh thu thực tế và hiệu quả phản hồi booking của bạn.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Khoảng thời gian</Text>
          <PeriodSelector value={preset} onChange={setPreset} options={[
            { value: '7d', label: '7 ngày' },
            { value: '30d', label: '30 ngày' },
            { value: '12m', label: '12 tháng' },
          ]} />
          {report && <Text style={styles.rangeText}>{report.dateRange.startDate} đến {report.dateRange.endDate}</Text>}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void load(true)}><Text style={styles.retryText}>Thử lại</Text></TouchableOpacity>
          </View>
        ) : null}

        {loading && !report ? <ActivityIndicator size="large" color={Colors.primary[600]} style={styles.loader} /> : (
          <>
            <View style={styles.metricsGrid}>
              <MetricCard title="Doanh thu thực tế" value={formatProviderReportMoney(report?.summary.totalRevenue ?? 0)} caption="Từ finalPrice booking hoàn tất" icon="earnings" />
              <MetricCard title="Đơn hoàn tất" value={String(report?.summary.completedBookings ?? 0)} caption="Có giá cuối cùng" icon="briefcase" />
              <MetricCard title="Tỷ lệ phản hồi" value={`${report?.summary.responseRate ?? 0}%`} caption={`${report?.summary.respondedRequests ?? 0}/${report?.summary.totalRequests ?? 0} booking`} icon="trendingUp" />
              <MetricCard title="Phản hồi trung bình" value={responseTime} caption="Từ lúc nhận đến xác nhận/từ chối" icon="clock" />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Doanh thu theo kỳ</Text>
              <Text style={styles.sectionCaption}>Tính theo ngày hoàn tất booking</Text>
              <PeriodSelector value={granularity} onChange={setGranularity} options={[
                { value: 'day', label: 'Ngày' },
                { value: 'week', label: 'Tuần' },
                { value: 'month', label: 'Tháng' },
              ]} />
              {report?.revenueSeries.length ? report.revenueSeries.map((point) => (
                <View key={point.period} style={styles.chartRow}>
                  <View style={styles.chartLabels}>
                    <Text style={styles.chartPeriod}>{periodLabel(point.period, granularity)}</Text>
                    <Text style={styles.chartValue}>{formatProviderReportMoney(point.revenue)}</Text>
                  </View>
                  <View style={styles.barTrack}><View style={[styles.bar, { width: `${Math.max(point.revenue ? 2 : 0, point.revenue / maxRevenue * 100)}%` }]} /></View>
                </View>
              )) : <Text style={styles.emptyText}>Chưa có doanh thu trong khoảng thời gian này.</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Tỷ lệ có booking</Text>
              <Text style={styles.sectionCaption}>Số booking theo kỳ và tỷ trọng trong khoảng đã chọn</Text>
              <PeriodSelector value={requestGranularity} onChange={setRequestGranularity} options={[
                { value: 'day', label: 'Theo ngày' },
                { value: 'week', label: 'Theo tuần' },
              ]} />
              {report?.requestSeries.length ? report.requestSeries.map((point) => (
                <View key={point.period} style={styles.chartRow}>
                  <View style={styles.chartLabels}>
                    <Text style={styles.chartPeriod}>{periodLabel(point.period, requestGranularity)}</Text>
                    <Text style={styles.chartValue}>{point.bookingCount} booking · {point.sharePercent}%</Text>
                  </View>
                  <View style={styles.barTrack}><View style={[styles.bar, styles.requestBar, { width: `${Math.max(point.bookingCount ? 2 : 0, point.bookingCount / maxRequests * 100)}%` }]} /></View>
                </View>
              )) : <Text style={styles.emptyText}>Chưa có booking trong khoảng thời gian này.</Text>}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  content: { padding: Space.md, paddingBottom: 40, gap: Space.md },
  heading: { gap: 4, marginBottom: Space.xs },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.neutral[900] },
  subtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral[500], lineHeight: 18 },
  card: { padding: Space.md, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[0], ...Shadow.sm },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.neutral[900] },
  sectionCaption: { marginTop: 3, marginBottom: Space.sm, fontFamily: FontFamily.regular, fontSize: 11, color: Colors.neutral[500] },
  selector: { flexDirection: 'row', gap: 6, marginTop: Space.sm, padding: 4, borderRadius: Radius.md, backgroundColor: Colors.neutral[100] },
  selectorItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.sm },
  selectorItemActive: { backgroundColor: Colors.neutral[0], ...Shadow.sm },
  selectorText: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.neutral[500] },
  selectorTextActive: { fontFamily: FontFamily.bold, color: Colors.primary[700] },
  rangeText: { marginTop: Space.xs, fontFamily: FontFamily.regular, fontSize: 10, color: Colors.neutral[500] },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  metricCard: { width: '48%', flexGrow: 1, minHeight: 112, padding: Space.sm + 2, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[0], ...Shadow.sm },
  metricHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 5 },
  metricLabel: { flex: 1, fontFamily: FontFamily.bold, fontSize: 10, color: Colors.neutral[500] },
  metricValue: { marginTop: Space.sm, fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral[900] },
  metricCaption: { marginTop: 4, fontFamily: FontFamily.regular, fontSize: 9, lineHeight: 13, color: Colors.neutral[500] },
  chartRow: { marginTop: Space.md },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: Space.sm, marginBottom: 6 },
  chartPeriod: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.neutral[700] },
  chartValue: { fontFamily: FontFamily.bold, fontSize: 10, color: Colors.neutral[600] },
  barTrack: { height: 9, overflow: 'hidden', borderRadius: 5, backgroundColor: Colors.neutral[100] },
  bar: { height: '100%', borderRadius: 5, backgroundColor: Colors.primary[500] },
  requestBar: { backgroundColor: Colors.accent[500] },
  emptyText: { marginTop: Space.md, padding: Space.md, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.neutral[200], borderRadius: Radius.lg, textAlign: 'center', fontFamily: FontFamily.regular, fontSize: 11, color: Colors.neutral[500] },
  errorCard: { padding: Space.md, borderRadius: Radius.lg, backgroundColor: Colors.semantic.errorBg, gap: Space.sm },
  errorText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.semantic.error },
  retryText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.semantic.error },
  loader: { marginTop: 40 },
});
