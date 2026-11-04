import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors } from '../../constants/colors';
import { Space } from '../../constants/spacing';
import { ProviderCard } from '../../components/ui';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/form/Input';
import { searchProviders } from '../../services/providerService';

interface DisplayProvider {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  distance: string;
  verified: boolean;
}

export default function ServiceListScreen({ route }: any) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const categoryTitle = route?.params?.title || 'Danh sách Thợ';

  const [providers, setProviders] = useState<DisplayProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const loadProviders = useCallback(async (query = '') => {
    try {
      setLoading(true);
      const res = await searchProviders({
        page: 1,
        limit: 20,
              });
      if (res && Array.isArray(res.data)) {
        let list = res.data;
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          list = list.filter((p) => (p.businessName || p.fullName || '').toLowerCase().includes(q));
        }
        setProviders(
          list.map((p) => ({
            id: p.providerId,
            name: p.businessName || p.fullName || 'Thợ đối tác',
            rating: p.averageRating || 5.0,
            reviewCount: p.reviewCount || 0,
            distance: p.distanceKm != null ? `${Math.round(p.distanceKm * 10) / 10} km` : '1.5 km',
            verified: true,
          }))
        );
      } else {
        setProviders([]);
      }
    } catch (err) {
      console.warn('Could not load providers:', err);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders(keyword);
  }, [loadProviders, keyword]);

  const handleBookProvider = () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập tài khoản để đặt thợ.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng nhập ngay', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }
    navigation.navigate('Booking');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={categoryTitle} showBack rightIcon="filter" />

      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Input
            placeholder="Tìm kiếm dịch vụ, thợ..."
            leftIcon="search"
            value={keyword}
            onChangeText={setKeyword}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[600]} />
          </View>
        ) : (
          <FlatList
            data={providers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Không tìm thấy thợ phù hợp.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <ProviderCard
                name={item.name}
                rating={item.rating}
                reviewCount={item.reviewCount}
                distance={item.distance}
                verified={item.verified}
                style={styles.providerCard}
                onPress={handleBookProvider}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: Space.lg,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  listContent: {
    padding: Space.lg,
    gap: Space.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: Space.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.neutral[500],
    fontSize: 14,
  },
  providerCard: {
    width: '100%',
  },
});
