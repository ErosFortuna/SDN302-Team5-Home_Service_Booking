import React from 'react';
import { View, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { Colors } from '../../constants/colors';
import { Space } from '../../constants/spacing';
import { ServiceCategoryCard, ProviderCard } from '../../components/ui';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/form/Input';

const PROVIDERS = [
  { id: '1', name: 'Nguyễn Văn An', rating: 4.9, reviewCount: 128, distance: '1.8 km', verified: true },
  { id: '2', name: 'Trần Minh Tuấn', rating: 4.7, reviewCount: 84,  distance: '2.3 km', verified: true },
  { id: '3', name: 'Lê Thị Hoa',     rating: 4.8, reviewCount: 210, distance: '3.1 km', verified: false },
  { id: '4', name: 'Phạm Đức Vinh',  rating: 4.5, reviewCount: 56,  distance: '4.5 km', verified: true },
  { id: '5', name: 'Hoàng Văn Thái', rating: 4.2, reviewCount: 12,  distance: '5.2 km', verified: false },
];

export default function ServiceListScreen({ route }: any) {
  // In a real app, route.params.categoryKey would fetch specific providers
  const categoryTitle = route?.params?.title || 'Danh sách Thợ';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={categoryTitle} showBack rightIcon="filter" />
      
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Input 
            placeholder="Tìm kiếm dịch vụ, thợ..." 
            leftIcon="search" 
          />
        </View>

        <FlatList
          data={PROVIDERS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProviderCard
              name={item.name}
              rating={item.rating}
              reviewCount={item.reviewCount}
              distance={item.distance}
              verified={item.verified}
              style={styles.providerCard}
            />
          )}
        />
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
  providerCard: {
    width: '100%',
  },
});
