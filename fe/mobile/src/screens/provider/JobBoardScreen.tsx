import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { formatVND } from '../../constants/mockData';
import { CategoryIcon, Icon } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';

export default function JobBoardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { jobRequests, quotedRequestIds } = useAppStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* In-page Screen Header matching ai-fe */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Yêu cầu công việc</Text>
          <Text style={styles.screenSub}>
            Các yêu cầu gần bạn đang chờ báo giá · {jobRequests.length} việc mới
          </Text>
        </View>

        <FlatList
          data={jobRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isQuoted = quotedRequestIds.includes(item.id);

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <CategoryIcon category={item.category} size={44} />

                  <View style={styles.headerInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.distanceBadge}>
                        <Text style={styles.distanceText}>{item.distanceKm} km</Text>
                      </View>
                    </View>
                    <Text style={styles.desc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                </View>

                {/* 3-Column Info Grid matching ai-fe */}
                <View style={styles.statsStrip}>
                  <View style={styles.statCol}>
                    <View style={styles.statLabelRow}>
                      <Icon name="earnings" size={11} color={Colors.neutral[400]} />
                      <Text style={styles.statLabel}>Ngân sách</Text>
                    </View>
                    <Text style={styles.statVal}>{formatVND(item.budget)}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCol}>
                    <View style={styles.statLabelRow}>
                      <Icon name="clock" size={11} color={Colors.neutral[400]} />
                      <Text style={styles.statLabel}>Thời gian</Text>
                    </View>
                    <Text style={styles.statVal}>{item.time}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statCol}>
                    <View style={styles.statLabelRow}>
                      <Icon name="image" size={11} color={Colors.neutral[400]} />
                      <Text style={styles.statLabel}>Ảnh sự cố</Text>
                    </View>
                    <Text style={styles.statVal}>{item.photos} ảnh</Text>
                  </View>
                </View>

                {/* Footer info & CTA matching ai-fe */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    <Icon name="location" size={12} color={Colors.neutral[400]} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {item.address} · {item.createdAt}
                    </Text>
                  </View>

                  {isQuoted ? (
                    <View style={styles.quotedBadge}>
                      <Icon name="check" size={13} color={Colors.primary[600]} />
                      <Text style={styles.quotedText}>Đã gửi báo giá</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.quoteBtn}
                      onPress={() => navigation.navigate('QuoteSubmit', { requestId: item.id })}
                      activeOpacity={0.8}
                    >
                      <Icon name="send" size={12} color={Colors.neutral[900]} />
                      <Text style={styles.quoteBtnText}>Báo giá ngay</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Space.md + 2,
    paddingTop: Space.md,
    paddingBottom: Space.xs,
  },
  screenTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.neutral[900],
    letterSpacing: -0.3,
  },
  screenSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  list: {
    paddingHorizontal: Space.md + 2,
    paddingTop: Space.sm,
    paddingBottom: 40,
    gap: Space.md,
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.xs,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
    flex: 1,
  },
  distanceBadge: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  distanceText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.neutral[600],
  },
  desc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 4,
    lineHeight: 18,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[50],
    borderRadius: Radius.lg,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.md,
    marginTop: Space.md,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[400],
  },
  statVal: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.neutral[200],
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Space.md,
    paddingTop: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  footerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: Space.sm,
  },
  addressText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
    flex: 1,
  },
  quotedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs + 2,
    borderRadius: Radius.lg,
  },
  quotedText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  quoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent[500],
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs + 3,
    borderRadius: Radius.lg,
  },
  quoteBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
  },
});
