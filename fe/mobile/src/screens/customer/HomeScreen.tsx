import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { CATEGORIES, PROVIDERS } from '../../constants/mockData';
import { ServiceCategory } from '../../types';
import { CategoryIcon, Icon } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const topRated = [...PROVIDERS].sort((a, b) => b.rating - a.rating);

  const handleOpenBooking = (category?: ServiceCategory) => {
    navigation.navigate('Booking', { presetCategory: category });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting & Location */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingSub}>Chào buổi sáng,</Text>
            <Text style={styles.greetingName}>Alex Trần</Text>
          </View>
          <View style={styles.locationBadge}>
            <Icon name="location" size={13} color={Colors.primary[600]} />
            <Text style={styles.locationText}>Quận 1, TP.HCM</Text>
          </View>
        </View>

        {/* Search Bar Button */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => handleOpenBooking()}
          activeOpacity={0.85}
        >
          <Icon name="search" size={18} color={Colors.neutral[400]} />
          <Text style={styles.searchPlaceholder}>
            Tìm dịch vụ dọn dẹp, sửa ống nước, điện...
          </Text>
        </TouchableOpacity>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục dịch vụ</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          >
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={styles.categoryCard}
                onPress={() => handleOpenBooking(c.name)}
                activeOpacity={0.8}
              >
                <CategoryIcon category={c.name} size={48} />
                <Text style={styles.categoryLabel}>{c.vietnameseTitle}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Promo Banner */}
        <View style={styles.promoWrapper}>
          <LinearGradient
            colors={['#00B4A6', '#0E7490']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            {/* Soft decorative blur circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>ƯU ĐÃI ĐẶC BIỆT</Text>
            </View>
            <Text style={styles.promoTitle}>
              Giảm 30% cho lần đầu{'\n'}dọn dẹp nhà cửa
            </Text>
            <Text style={styles.promoSub}>
              Thợ tận tâm, bảng giá niêm yết rõ ràng
            </Text>

            <TouchableOpacity
              style={styles.promoCtaBtn}
              onPress={() => handleOpenBooking('Cleaning')}
              activeOpacity={0.85}
            >
              <Text style={styles.promoCtaText}>Đặt dịch vụ ngay</Text>
              <Icon name="forward" size={14} color={Colors.neutral[900]} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Top-Rated Providers */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Thợ hàng đầu gần bạn</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ServiceList', { title: 'Tất cả thợ' })}
            >
              <Text style={styles.seeAllText}>Xem tất cả &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.providersList}>
            {topRated.map((p) => (
              <View key={p.id} style={styles.providerCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{p.avatar}</Text>
                </View>

                <View style={styles.providerInfo}>
                  <View style={styles.providerNameRow}>
                    <Text style={styles.providerName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    {p.verified && (
                      <Icon name="shieldCheck" size={15} color={Colors.primary[600]} />
                    )}
                  </View>
                  <Text style={styles.providerTagline} numberOfLines={1}>
                    {p.tagline}
                  </Text>
                  <View style={styles.metaRow}>
                    <Icon name="star" size={12} color={Colors.accent[500]} />
                    <Text style={styles.ratingText}>
                      {p.rating} ({p.reviews})
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Icon name="location" size={12} color={Colors.neutral[400]} />
                    <Text style={styles.distanceText}>{p.distanceKm} km</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => handleOpenBooking(p.category)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bookBtnText}>Đặt</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
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
    flex: 1,
  },
  content: {
    paddingHorizontal: Space.md + 2,
    paddingTop: Space.md,
    paddingBottom: 40,
    gap: Space.lg,
  },
  // Greeting
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  greetingName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.neutral[900],
    letterSpacing: -0.3,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  locationText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 4,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  searchPlaceholder: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
    flex: 1,
  },
  // Section
  section: {
    gap: Space.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  seeAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary[600],
  },
  // Categories
  categoriesList: {
    gap: Space.sm,
    paddingVertical: 2,
  },
  categoryCard: {
    width: 82,
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    paddingVertical: Space.md,
    paddingHorizontal: Space.xs,
    alignItems: 'center',
    gap: Space.xs + 2,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  categoryLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[800],
    textAlign: 'center',
  },
  // Promo Banner
  promoWrapper: {
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    ...Shadow.md,
  },
  promoCard: {
    padding: Space.lg,
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent[500],
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginBottom: Space.sm,
  },
  promoBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.neutral[900],
  },
  promoTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[0],
    lineHeight: 22,
  },
  promoSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.transparent.white85,
    marginTop: 4,
  },
  promoCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent[500],
    alignSelf: 'flex-start',
    paddingHorizontal: Space.md,
    paddingVertical: Space.xs + 3,
    borderRadius: Radius.lg,
    marginTop: Space.md,
  },
  promoCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
  },
  // Providers
  providersList: {
    gap: Space.sm,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Space.md,
    ...Shadow.sm,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary[700],
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
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  providerTagline: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[700],
  },
  metaDot: {
    color: Colors.neutral[300],
    fontSize: 10,
  },
  distanceText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
  },
  bookBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Space.md,
    paddingVertical: 7,
    borderRadius: Radius.lg,
  },
  bookBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[0],
  },
});
