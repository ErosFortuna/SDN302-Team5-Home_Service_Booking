import React from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon } from '../../components/ui/Icon';
import {
  cancelPendingMembershipCheckout,
  createMembershipCheckout,
  formatMembershipDate,
  formatMembershipPrice,
  getMembershipPlans,
  getMyMembershipPayments,
  getMySubscription,
  syncMembershipPayment,
  type MembershipPayment,
  type MembershipPlan,
  type ProviderSubscription,
} from '../../services/membershipService';

const PAYMENT_STATUS: Record<MembershipPayment['status'], string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  FAILED: 'Thất bại',
};

export default function MembershipScreen() {
  const [plans, setPlans] = React.useState<MembershipPlan[]>([]);
  const [subscription, setSubscription] = React.useState<ProviderSubscription | null>(null);
  const [payments, setPayments] = React.useState<MembershipPayment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = React.useState<string | null>(null);
  const [syncingOrderId, setSyncingOrderId] = React.useState<number | null>(null);
  const [cancellingPending, setCancellingPending] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadData = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [availablePlans, currentSubscription, paymentHistory] = await Promise.all([
        getMembershipPlans(),
        getMySubscription(),
        getMyMembershipPayments(),
      ]);
      setPlans(availablePlans);
      setSubscription(currentSubscription);
      setPayments(paymentHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin gói thành viên.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const pendingPayment = payments.find((p) => p.status === 'PENDING');

  const proceedCheckout = async (planId: string) => {
    setCheckoutPlanId(planId);
    setError('');
    try {
      const checkout = await createMembershipCheckout(planId);
      await WebBrowser.openBrowserAsync(checkout.checkoutUrl);

      // Auto-sync payment status after user finishes / returns from PayOS browser
      setSyncingOrderId(checkout.orderCode);
      try {
        const syncRes = await syncMembershipPayment(checkout.orderCode);
        if (syncRes.status === 'PAID') {
          Alert.alert('Thành công', '🎉 Gói thành viên của bạn đã được kích hoạt thành công!');
        } else if (syncRes.status === 'CANCELLED') {
          Alert.alert('Đã hủy', 'Giao dịch thanh toán đã bị hủy trên cổng PayOS.');
        }
      } catch {
        // Silently catch sync error here; reload below will fetch latest data
      } finally {
        setSyncingOrderId(null);
      }
      await loadData(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể khởi tạo thanh toán PayOS.';
      setError(message);
      if (message.toLowerCase().includes('pending')) {
        Alert.alert(
          'Đơn thanh toán chờ',
          'Bạn đang có đơn thanh toán chưa hoàn tất. Bạn có muốn hủy đơn cũ để tạo lại không?',
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Hủy đơn cũ và thử lại',
              style: 'destructive',
              onPress: async () => {
                try {
                  setCancellingPending(true);
                  await cancelPendingMembershipCheckout();
                  await loadData(true);
                  Alert.alert('Thành công', 'Đã hủy đơn chờ cũ. Bạn có thể chọn gói mới.');
                } catch (e) {
                  Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể hủy đơn.');
                } finally {
                  setCancellingPending(false);
                }
              },
            },
          ],
        );
      } else {
        Alert.alert('Không thể thanh toán', message);
      }
    } finally {
      setCheckoutPlanId(null);
    }
  };

  const handleCheckout = async (plan: MembershipPlan) => {
    if (pendingPayment) {
      Alert.alert(
        'Đơn thanh toán đang chờ',
        `Bạn đang có đơn thanh toán #${pendingPayment.orderCode} (${formatMembershipPrice(pendingPayment.amount)}) chưa hoàn tất. Bạn có muốn hủy đơn cũ để chọn gói mới?`,
        [
          { text: 'Đóng', style: 'cancel' },
          {
            text: 'Hủy đơn cũ & tạo mới',
            style: 'destructive',
            onPress: async () => {
              try {
                setCancellingPending(true);
                await cancelPendingMembershipCheckout();
                await proceedCheckout(plan.id);
              } catch (err) {
                Alert.alert('Lỗi', err instanceof Error ? err.message : 'Không thể hủy đơn.');
              } finally {
                setCancellingPending(false);
              }
            },
          },
        ],
      );
      return;
    }

    await proceedCheckout(plan.id);
  };

  const handleSyncPayment = async (orderCode?: number, simulateSuccess = false) => {
    if (orderCode) setSyncingOrderId(orderCode);
    setError('');
    try {
      const res = await syncMembershipPayment(orderCode, simulateSuccess);
      if (res.status === 'PAID') {
        Alert.alert('Thành công', '🎉 Thanh toán thành công! Gói thành viên đã được kích hoạt.');
      } else if (res.status === 'CANCELLED') {
        Alert.alert('Đã hủy', 'Giao dịch đã bị hủy trên cổng PayOS.');
      } else {
        Alert.alert('Chờ xử lý', 'Giao dịch đang chờ xác nhận từ ngân hàng hoặc cổng PayOS. Vui lòng kiểm tra lại sau ít phút.');
      }
      await loadData(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể đồng bộ với PayOS.';
      setError(msg);
      Alert.alert('Lỗi đồng bộ', msg);
    } finally {
      if (orderCode) setSyncingOrderId(null);
    }
  };

  const handleCancelPending = () => {
    Alert.alert(
      'Hủy đơn chờ thanh toán',
      'Bạn có chắc chắn muốn hủy đơn thanh toán đang chờ này để chọn gói khác?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: async () => {
            setCancellingPending(true);
            setError('');
            try {
              await cancelPendingMembershipCheckout();
              Alert.alert('Thành công', 'Đã hủy các đơn chờ thanh toán. Bạn có thể chọn gói mới.');
              await loadData(true);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Không thể hủy đơn thanh toán.';
              setError(msg);
              Alert.alert('Lỗi', msg);
            } finally {
              setCancellingPending(false);
            }
          },
        },
      ],
    );
  };

  const handleReopenCheckout = async (checkoutUrl: string, orderCode: number) => {
    try {
      await WebBrowser.openBrowserAsync(checkoutUrl);
      setSyncingOrderId(orderCode);
      try {
        const syncRes = await syncMembershipPayment(orderCode);
        if (syncRes.status === 'PAID') {
          Alert.alert('Thành công', '🎉 Gói thành viên của bạn đã được kích hoạt thành công!');
        }
      } catch {
        // Silently ignore
      } finally {
        setSyncingOrderId(null);
      }
      await loadData(true);
    } catch (err) {
      Alert.alert('Lỗi', err instanceof Error ? err.message : 'Không thể mở liên kết thanh toán.');
    }
  };

  const activeSubscription =
    subscription?.status === 'ACTIVE' &&
    (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > new Date());

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(true)} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Gói thành viên</Text>
          <Text style={styles.subtitle}>Duy trì quyền sử dụng nền tảng theo tháng.</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void loadData(true)} style={styles.retryButton}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={Colors.primary[600]} size="large" style={styles.loader} />
        ) : (
          <>
            {/* Current Subscription Card */}
            <View style={styles.subscriptionCard}>
              <View style={styles.subscriptionIcon}>
                <Icon name={activeSubscription ? 'verified' : 'calendar'} size={21} color={Colors.primary[700]} />
              </View>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.cardTitle}>Trạng thái hiện tại</Text>
                <Text style={styles.bodyText}>
                  {subscription
                    ? `${subscription.plan?.name ?? 'Gói thành viên'} · ${activeSubscription ? 'Đang hoạt động' : subscription.status === 'PENDING' ? 'Chưa kích hoạt' : 'Đã hết hạn'}`
                    : 'Bạn chưa có gói thành viên.'}
                </Text>
                {subscription && (
                  <Text style={styles.mutedText}>
                    Thời hạn đến {formatMembershipDate(subscription.currentPeriodEnd)}
                  </Text>
                )}
              </View>
            </View>

            {/* Pending Payment Card (if exists) */}
            {pendingPayment && !activeSubscription && (
              <View style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <View style={styles.pendingBadge}>
                    <Icon name="pending" size={15} color={Colors.semantic.warning} />
                    <Text style={styles.pendingBadgeText}>Đơn chờ xử lý</Text>
                  </View>
                  <Text style={styles.pendingTime}>
                    Mã #{pendingPayment.orderCode}
                  </Text>
                </View>

                <Text style={styles.pendingPlanTitle}>
                  {pendingPayment.planName} · {formatMembershipPrice(pendingPayment.amount)}
                </Text>
                <Text style={styles.pendingNotice}>
                  Nếu bạn đã chuyển khoản trên PayOS, hãy bấm &quot;Đồng bộ PayOS&quot; để kích hoạt gói ngay.
                </Text>

                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={[styles.syncButton, syncingOrderId === pendingPayment.orderCode && styles.disabledButton]}
                    disabled={syncingOrderId !== null || cancellingPending}
                    onPress={() => void handleSyncPayment(pendingPayment.orderCode)}
                    activeOpacity={0.8}
                  >
                    {syncingOrderId === pendingPayment.orderCode ? (
                      <ActivityIndicator size="small" color={Colors.neutral[0]} />
                    ) : (
                      <>
                        <Icon name="history" size={15} color={Colors.neutral[0]} />
                        <Text style={styles.syncButtonText}>Đồng bộ PayOS</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {pendingPayment.checkoutUrl ? (
                    <TouchableOpacity
                      style={styles.reopenButton}
                      disabled={syncingOrderId !== null || cancellingPending}
                      onPress={() => void handleReopenCheckout(pendingPayment.checkoutUrl!, pendingPayment.orderCode)}
                      activeOpacity={0.8}
                    >
                      <Icon name="payment" size={15} color={Colors.primary[700]} />
                      <Text style={styles.reopenButtonText}>Mở lại PayOS</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.cancelPendingButton}
                    disabled={syncingOrderId !== null || cancellingPending}
                    onPress={handleCancelPending}
                    activeOpacity={0.8}
                  >
                    {cancellingPending ? (
                      <ActivityIndicator size="small" color={Colors.semantic.error} />
                    ) : (
                      <Text style={styles.cancelPendingText}>Hủy đơn</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {__DEV__ && (
                  <TouchableOpacity
                    style={styles.devSimulateButton}
                    disabled={syncingOrderId !== null || cancellingPending}
                    onPress={() => void handleSyncPayment(pendingPayment.orderCode, true)}
                    activeOpacity={0.8}
                  >
                    <Icon name="sparkles" size={13} color={Colors.semantic.warning} />
                    <Text style={styles.devSimulateText}>Giả lập PayOS thành công (DEV)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Text style={styles.sectionTitle}>Chọn gói theo tháng</Text>
            {plans.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.bodyText}>Hiện chưa có gói thành viên nào được mở bán.</Text>
              </View>
            ) : plans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.price}>{formatMembershipPrice(plan.monthlyPrice)}</Text>
                <Text style={styles.mutedText}>/ tháng</Text>
                <View style={styles.benefits}>
                  {plan.benefits.map((benefit) => (
                    <View key={benefit} style={styles.benefitRow}>
                      <Icon name="verified" size={16} color={Colors.primary[600]} />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={checkoutPlanId !== null || cancellingPending}
                  onPress={() => void handleCheckout(plan)}
                  style={[styles.checkoutButton, (checkoutPlanId !== null || cancellingPending) && styles.disabledButton]}
                >
                  {checkoutPlanId === plan.id ? (
                    <ActivityIndicator color={Colors.neutral[0]} />
                  ) : (
                    <>
                      <Icon name="payment" size={17} color={Colors.neutral[0]} />
                      <Text style={styles.checkoutText}>Thanh toán với PayOS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.paymentHeading}>
              <Text style={styles.sectionTitle}>Lịch sử thanh toán</Text>
              <Text style={styles.mutedText}>20 giao dịch gần nhất</Text>
            </View>
            {payments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.bodyText}>Chưa có giao dịch membership.</Text>
              </View>
            ) : payments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentPlan}>{payment.planName}</Text>
                  <Text style={styles.mutedText}>
                    Mã đơn {payment.orderCode} · {formatMembershipDate(payment.createdAt)}
                  </Text>
                </View>
                <View style={styles.paymentAmount}>
                  <Text style={styles.paymentPrice}>{formatMembershipPrice(payment.amount)}</Text>
                  <View style={styles.statusRow}>
                    <Text style={[styles.paymentStatus, payment.status === 'PAID' && styles.paidStatus]}>
                      {PAYMENT_STATUS[payment.status]}
                    </Text>
                    {payment.status === 'PENDING' ? (
                      <TouchableOpacity
                        style={styles.rowSyncBtn}
                        onPress={() => void handleSyncPayment(payment.orderCode)}
                        disabled={syncingOrderId === payment.orderCode}
                      >
                        {syncingOrderId === payment.orderCode ? (
                          <ActivityIndicator size="small" color={Colors.primary[600]} />
                        ) : (
                          <Text style={styles.rowSyncText}>Đồng bộ</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
            <Text style={styles.disclaimer}>
              Thanh toán gói thành viên chỉ áp dụng cho thợ. Khách hàng thanh toán tiền dịch vụ trực tiếp cho bạn.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  content: { padding: Space.md, paddingBottom: 48, gap: Space.md },
  heading: { marginBottom: Space.xs },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.neutral[900] },
  subtitle: { marginTop: 4, fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral[500] },
  loader: { marginTop: 48 },
  errorCard: { padding: Space.md, borderRadius: Radius.lg, backgroundColor: Colors.semantic.errorBg, gap: Space.sm },
  errorText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.semantic.error },
  retryButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  retryText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.semantic.error },
  subscriptionCard: {
    flexDirection: 'row', gap: Space.md, padding: Space.md, borderRadius: Radius.xl,
    backgroundColor: Colors.neutral[0], borderWidth: 1, borderColor: Colors.neutral[200], ...Shadow.sm,
  },
  subscriptionIcon: {
    width: 42, height: 42, borderRadius: Radius.lg, backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center',
  },
  subscriptionInfo: { flex: 1, gap: 3 },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.neutral[900] },
  bodyText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral[700] },
  mutedText: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.neutral[500] },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral[900], marginTop: Space.md },
  planCard: {
    padding: Space.md, borderRadius: Radius.xl, backgroundColor: Colors.neutral[0],
    borderWidth: 1, borderColor: Colors.neutral[200], ...Shadow.sm,
  },
  planName: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral[900] },
  price: { marginTop: Space.sm, fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.primary[700] },
  benefits: { gap: Space.sm, marginVertical: Space.md },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  benefitText: { flex: 1, fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral[700] },
  checkoutButton: {
    minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm,
    borderRadius: Radius.lg, backgroundColor: Colors.primary[600], paddingHorizontal: Space.md,
  },
  disabledButton: { opacity: 0.6 },
  checkoutText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral[0] },
  paymentHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Space.md },
  emptyCard: { padding: Space.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[0] },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm,
    padding: Space.md, borderRadius: Radius.lg, backgroundColor: Colors.neutral[0],
    borderWidth: 1, borderColor: Colors.neutral[200],
  },
  paymentDetails: { flex: 1, gap: 4 },
  paymentPlan: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral[900] },
  paymentAmount: { alignItems: 'flex-end', gap: 4 },
  paymentPrice: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral[900] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  paymentStatus: { fontFamily: FontFamily.medium, fontSize: 10, color: Colors.neutral[500] },
  paidStatus: { color: Colors.primary[700], fontFamily: FontFamily.bold },
  rowSyncBtn: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm,
    backgroundColor: Colors.primary[50], borderWidth: 1, borderColor: Colors.primary[200],
  },
  rowSyncText: { fontFamily: FontFamily.bold, fontSize: 10, color: Colors.primary[700] },
  disclaimer: { marginTop: Space.xs, fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 17, color: Colors.neutral[500] },

  // Pending Payment Banner Card
  pendingCard: {
    padding: Space.md, borderRadius: Radius.xl, backgroundColor: Colors.semantic.warningBg,
    borderWidth: 1, borderColor: '#FDE68A', gap: Space.xs, ...Shadow.sm,
  },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pendingBadgeText: { fontFamily: FontFamily.bold, fontSize: 11, color: '#B45309', textTransform: 'uppercase' },
  pendingTime: { fontFamily: FontFamily.medium, fontSize: 11, color: '#B45309' },
  pendingPlanTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: '#78350F', marginTop: 2 },
  pendingNotice: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 16, color: '#92400E', marginTop: 2 },
  pendingActions: { flexDirection: 'row', alignItems: 'center', gap: Space.xs, marginTop: Space.sm, flexWrap: 'wrap' },
  syncButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Space.md,
    paddingVertical: 9, borderRadius: Radius.md, backgroundColor: Colors.primary[600],
  },
  syncButtonText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral[0] },
  reopenButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Space.sm + 2,
    paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.neutral[0],
    borderWidth: 1, borderColor: Colors.primary[300],
  },
  reopenButtonText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.primary[700] },
  cancelPendingButton: {
    paddingHorizontal: Space.sm + 2, paddingVertical: 8, borderRadius: Radius.md,
    backgroundColor: Colors.neutral[0], borderWidth: 1, borderColor: Colors.neutral[200],
  },
  cancelPendingText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.semantic.error },
  devSimulateButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6,
    paddingHorizontal: Space.sm, borderRadius: Radius.sm, backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start', marginTop: Space.xs, borderWidth: 1, borderColor: '#FCD34D',
  },
  devSimulateText: { fontFamily: FontFamily.medium, fontSize: 10, color: '#92400E' },
});
