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
  createMembershipCheckout,
  formatMembershipDate,
  formatMembershipPrice,
  getMembershipPlans,
  getMyMembershipPayments,
  getMySubscription,
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

  const handleCheckout = async (plan: MembershipPlan) => {
    setCheckoutPlanId(plan.id);
    setError('');
    try {
      const checkout = await createMembershipCheckout(plan.id);
      await WebBrowser.openBrowserAsync(checkout.checkoutUrl);
      await loadData(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể khởi tạo thanh toán PayOS.';
      setError(message);
      Alert.alert('Không thể thanh toán', message);
    } finally {
      setCheckoutPlanId(null);
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
                  disabled={checkoutPlanId !== null}
                  onPress={() => void handleCheckout(plan)}
                  style={[styles.checkoutButton, checkoutPlanId !== null && styles.disabledButton]}
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
                  <Text style={[styles.paymentStatus, payment.status === 'PAID' && styles.paidStatus]}>
                    {PAYMENT_STATUS[payment.status]}
                  </Text>
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
  paymentAmount: { alignItems: 'flex-end', gap: 3 },
  paymentPrice: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral[900] },
  paymentStatus: { fontFamily: FontFamily.medium, fontSize: 10, color: Colors.neutral[500] },
  paidStatus: { color: Colors.primary[700] },
  disclaimer: { marginTop: Space.xs, fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 17, color: Colors.neutral[500] },
});
