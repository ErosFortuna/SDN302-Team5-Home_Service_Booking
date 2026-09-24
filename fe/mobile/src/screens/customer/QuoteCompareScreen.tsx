import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { formatVND, getProvider } from '../../constants/mockData';
import { Header } from '../../components/layout/Header';
import { Button, Icon } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';

type Props = NativeStackScreenProps<RootStackParamList, 'QuoteCompare'>;

export default function QuoteCompareScreen({ route, navigation }: Props) {
  const { bookingId } = route.params;
  const { bookings, acceptQuote, declineQuote } = useAppStore();

  const booking = bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="So sánh báo giá" showBack />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy thông tin đơn đặt này.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sortedQuotes = [...booking.quotes].sort(
    (a, b) => a.laborFee + a.materialFee - (b.laborFee + b.materialFee)
  );
  const cheapestId = sortedQuotes[0]?.id;

  const handleAccept = (quoteId: string, providerName: string) => {
    Alert.alert(
      'Xác nhận chọn thợ',
      `Bạn đồng ý nhận báo giá từ "${providerName}"?`,
      [
        { text: 'Suy nghĩ thêm', style: 'cancel' },
        {
          text: 'Đồng ý',
          style: 'default',
          onPress: () => {
            acceptQuote(booking.id, quoteId);
            Alert.alert('Thành công', 'Đã chốt báo giá! Thợ đang chuẩn bị đến.');
            navigation.navigate('MainTabs');
          },
        },
      ]
    );
  };

  const handleDecline = (quoteId: string) => {
    declineQuote(booking.id, quoteId);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="So sánh báo giá" subtitle={booking.title} showBack />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Có {booking.quotes.length} thợ đã gửi báo giá · Sắp xếp theo giá tốt nhất
          </Text>
        </View>

        {sortedQuotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Icon name="quote" size={36} color={Colors.primary[500]} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có báo giá nào</Text>
            <Text style={styles.emptyText}>
              Yêu cầu của bạn đang được gửi tới các thợ trong khu vực. Vui lòng quay lại sau!
            </Text>
          </View>
        ) : (
          sortedQuotes.map((q) => {
            const provider = getProvider(q.providerId);
            if (!provider) return null;
            const total = q.laborFee + q.materialFee;
            const isBest = q.id === cheapestId;

            return (
              <View key={q.id} style={[styles.card, isBest && styles.bestCard]}>
                {isBest && (
                  <View style={styles.bestBadge}>
                    <Text style={styles.bestBadgeText}>GIÁ TIẾT KIỆM NHẤT</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{provider.avatar}</Text>
                  </View>
                  <View style={styles.providerInfo}>
                    <View style={styles.providerNameRow}>
                      <Text style={styles.providerName}>{provider.name}</Text>
                      {provider.verified && (
                        <Icon name="shieldCheck" size={16} color={Colors.primary[500]} />
                      )}
                    </View>
                    <View style={styles.subInfoRow}>
                      <Icon name="star" size={13} color={Colors.accent[500]} />
                      <Text style={styles.ratingText}>
                        {provider.rating} ({provider.reviews})
                      </Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Icon name="location" size={13} color={Colors.neutral[400]} />
                      <Text style={styles.distanceText}>{provider.distanceKm} km</Text>
                    </View>
                  </View>
                  <View style={styles.totalPriceContainer}>
                    <Text style={styles.totalPrice}>{formatVND(total)}</Text>
                    <Text style={styles.totalPriceLabel}>Trọn gói</Text>
                  </View>
                </View>

                {/* Fee Breakdown */}
                <View style={styles.breakdown}>
                  <View style={styles.feeItem}>
                    <Text style={styles.feeLabel}>Tiền công thợ</Text>
                    <Text style={styles.feeValue}>{formatVND(q.laborFee)}</Text>
                  </View>
                  <View style={styles.feeItem}>
                    <Text style={styles.feeLabel}>Vật tư / phụ tùng</Text>
                    <Text style={styles.feeValue}>{formatVND(q.materialFee)}</Text>
                  </View>
                  <View style={styles.arrivalRow}>
                    <Icon name="clock" size={14} color={Colors.primary[500]} />
                    <Text style={styles.arrivalText}>
                      Có mặt lúc: <Text style={styles.arrivalBold}>{q.arrival}</Text>
                    </Text>
                  </View>
                </View>

                {q.note ? (
                  <Text style={styles.noteText}>&ldquo;{q.note}&rdquo;</Text>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => handleDecline(q.id)}
                    activeOpacity={0.7}
                  >
                    <Icon name="cancel" size={16} color={Colors.neutral[500]} />
                    <Text style={styles.declineText}>Từ chối</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAccept(q.id, provider.name)}
                    activeOpacity={0.8}
                  >
                    <Icon name="check" size={16} color={Colors.neutral[900]} />
                    <Text style={styles.acceptText}>Chấp nhận báo giá</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  scroll: {
    padding: Space.lg,
    paddingBottom: 40,
    gap: Space.md,
  },
  metaRow: {
    marginBottom: Space.xs,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  bestCard: {
    borderColor: Colors.accent[400],
    borderWidth: 1.5,
  },
  bestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent[500],
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginBottom: Space.sm,
  },
  bestBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.neutral[900],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary[600],
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  dotSeparator: {
    color: Colors.neutral[300],
    fontSize: 10,
  },
  distanceText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  totalPriceContainer: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary[500],
  },
  totalPriceLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[400],
  },
  breakdown: {
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.md,
    padding: Space.md,
    marginTop: Space.md,
    gap: Space.xs,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  feeValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingTop: Space.xs + 2,
    marginTop: Space.xs,
  },
  arrivalText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  arrivalBold: {
    fontFamily: FontFamily.semiBold,
    color: Colors.neutral[900],
  },
  noteText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    color: Colors.neutral[500],
    marginTop: Space.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.md,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Space.sm + 2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    backgroundColor: Colors.neutral[0],
  },
  declineText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  acceptBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Space.sm + 2,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accent[500],
  },
  acceptText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Space.xl,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
    marginBottom: Space.xs,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});
