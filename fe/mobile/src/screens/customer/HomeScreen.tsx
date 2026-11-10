import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ServiceCategory } from '../../types';
import { CategoryIcon, Icon } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { useAuthStore } from '../../store/useAuthStore';
import { getStoredToken } from '../../services/apiClient';
import { getActiveCategories, BackendCategory } from '../../services/serviceRequestService';
import { searchProviders } from '../../services/providerService';

interface DisplayCategory {
  id: string;
  name: ServiceCategory;
  vietnameseTitle: string;
  slug: string;
}

interface DisplayProvider {
  id: string;
  name: string;
  avatar: string;
  rating: number | null;
  reviews: number;
  distanceKm: number | null;
  tagline: string;
  experienceYears: number;
  verified: boolean;
  category?: ServiceCategory;
}

function mapSlugToCategory(slug: string, name: string): ServiceCategory {
  const s = (slug || name || '').toLowerCase();
  if (s.includes('sua-khoa') || s.includes('lock')) return 'Locksmith';
  if (s.includes('do-gia-dung') || s.includes('appliance')) return 'HomeAppliance';
  if (s.includes('diet-con-trung') || s.includes('pest')) return 'PestControl';
  if (s.includes('son') || s.includes('paint')) return 'Painting';
  if (s.includes('dien-nuoc') || s.includes('nuoc') || s.includes('plumb')) return 'Plumbing';
  if (s.includes('dien-lanh') || s.includes('lanh')) return 'Appliance';
  if (s.includes('dien') || s.includes('electric')) return 'Electrical';
  return 'Cleaning';
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.currentUser);

  const [categories, setCategories] = useState<DisplayCategory[]>([]);
  const [providers, setProviders] = useState<DisplayProvider[]>([]);
  const [providerLoadError, setProviderLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadHomeData = async () => {
        setProviderLoadError(false);
        try {
          const backendCats = await getActiveCategories();
          if (isMounted && backendCats.length > 0) {
            setCategories(
              backendCats.map((c) => ({
                id: c._id || c.id || c.slug,
                name: mapSlugToCategory(c.slug, c.name),
                vietnameseTitle: c.name,
                slug: c.slug,
              }))
            );
          }

          if (!isLoggedIn) return;

          const token = await getStoredToken();
          if (!token) {
            logout();
            if (isMounted) navigation.navigate('Login');
            return;
          }

          const providerRes = await searchProviders({ page: 1, limit: 5 });
          if (isMounted && providerRes.data) {
            setProviders(
              providerRes.data.map((p) => ({
                id: p.providerId,
                name: p.businessName || p.fullName,
                avatar: (p.businessName || p.fullName).slice(0, 2).toUpperCase(),
                rating: Number.isFinite(p.averageRating) ? p.averageRating : null,
                reviews: p.reviewCount || 0,
                distanceKm:
                  p.distanceKm != null ? Math.round(p.distanceKm * 10) / 10 : null,
                tagline: p.city || 'Khu vực phục vụ chưa được cập nhật',
                experienceYears: p.yearsOfExperience,
                verified: true,
              }))
            );
          }
        } catch (err) {
          if (isMounted) setProviderLoadError(true);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      loadHomeData();
      return () => {
        isMounted = false;
      };
    }, [isLoggedIn, logout, navigation])
  );

  const handleOpenBooking = (category?: ServiceCategory) => {
    if (!isLoggedIn) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập tài khoản để đặt thợ và dịch vụ.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đăng nhập ngay',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }
    navigation.navigate('Booking', { presetCategory: category });
  };

  const displayName = currentUser?.name || 'Quý khách';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting & Location */}
        <View style={styles.greetingRow}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => (navigation as any).navigate('Profile')} activeOpacity={0.8}>
            <View style={{ width: 42, height: 42, borderRadius: Radius.full, backgroundColor: Colors.primary[100], justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary[300] }}>
              <Text style={{ fontFamily: FontFamily.bold, fontSize: 15, color: Colors.primary[700] }}>{displayName.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.greetingSub}>Xin chào,</Text>
              <Text style={styles.greetingName}>{displayName}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.locationBadge}>
            <Icon name="location" size={13} color={Colors.primary[600]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {currentUser?.address || 'Chưa có địa chỉ'}
            </Text>
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
            Tìm dịch vụ dọn dẹp, sửa ống nước, điện lạnh...
          </Text>
        </TouchableOpacity>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh mục dịch vụ</Text>
          {loading && categories.length === 0 ? (
            <ActivityIndicator size="small" color={Colors.primary[600]} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            >
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.categoryCard}
                  onPress={() => handleOpenBooking(c.name)}
                  activeOpacity={0.8}
                >
                  <CategoryIcon category={c.name} size={48} />
                  <Text style={styles.categoryLabel}>{c.vietnameseTitle}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Promo Banner */}
        <View style={styles.promoWrapper}>
          <LinearGradient
            colors={[Colors.primary[500], Colors.primary[800]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            <View style={styles.promoBadge}>
              <Text style={styles.promoBadgeText}>ĐẶT DỊCH VỤ TẠI NHÀ</Text>
            </View>
            <Text style={styles.promoTitle}>
              Tìm dịch vụ phù hợp{'\n'}Chọn lịch theo nhu cầu
            </Text>
            <Text style={styles.promoSub}>
              Gửi yêu cầu và theo dõi lịch hẹn ngay trong ứng dụng.
            </Text>

            <TouchableOpacity
              style={styles.promoCtaBtn}
              onPress={() => handleOpenBooking()}
              activeOpacity={0.85}
            >
              <Text style={styles.promoCtaText}>Đặt dịch vụ ngay</Text>
              <Icon name="forward" size={14} color={Colors.neutral[900]} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Verified Providers */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Thợ đã xác minh</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ServiceList', { title: 'Tất cả thợ' })}
            >
              <Text style={styles.seeAllText}>Xem tất cả &gt;</Text>
            </TouchableOpacity>
          </View>

          {loading && providers.length === 0 ? (
            <ActivityIndicator size="small" color={Colors.primary[600]} style={{ marginVertical: 20 }} />
          ) : providerLoadError ? (
            <View style={styles.emptyProviders}>
              <Text style={styles.emptyProvidersText}>
                Chưa thể tải danh sách thợ. Vui lòng thử lại sau.
              </Text>
            </View>
          ) : providers.length === 0 ? (
            <View style={styles.emptyProviders}>
              <Text style={styles.emptyProvidersText}>
                Hiện chưa có hồ sơ thợ đã xác minh để hiển thị.
              </Text>
            </View>
          ) : (
            <View style={styles.providersList}>
              {providers.map((p) => (
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
                      {p.reviews > 0 && p.rating !== null ? (
                        <>
                          <Icon name="star" size={12} color={Colors.accent[500]} />
                          <Text style={styles.ratingText}>
                            {p.rating.toFixed(1)} ({p.reviews} đánh giá)
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.distanceText}>Chưa có đánh giá</Text>
                      )}
                      {p.experienceYears > 0 && (
                        <Text style={styles.distanceText}>
                          {p.experienceYears} năm kinh nghiệm
                        </Text>
                      )}
                      {p.distanceKm !== null && (
                        <>
                          <Icon name="location" size={12} color={Colors.neutral[400]} />
                          <Text style={styles.distanceText}>{p.distanceKm} km</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.bookDirectBtn}
                    onPress={() => {
                      if (!isLoggedIn) {
                        Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để đặt thợ.');
                        navigation.navigate('Login');
                        return;
                      }
                      navigation.navigate('Booking', {
                        presetCategory: p.category,
                        presetProvider: { id: p.id, name: p.name },
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bookDirectBtnText}>Đặt thợ</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
  providersList: {
    gap: Space.sm,
  },
  emptyProviders: {
    padding: Space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  emptyProvidersText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    textAlign: 'center',
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
  bookDirectBtn: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.lg,
  },
  bookDirectBtnText: {
    color: '#fff',
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
});
