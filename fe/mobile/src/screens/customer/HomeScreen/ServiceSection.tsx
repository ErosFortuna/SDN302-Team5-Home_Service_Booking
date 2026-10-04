import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../../constants/colors';
import { FontFamily, FontSize } from '../../../constants/typography';
import { Space } from '../../../constants/spacing';
import { ServiceCategoryCard } from '../../../components/ui';
import { Icon } from '../../../components/ui/Icon';
import { CATEGORIES } from './mockData';
import { MainTabNavigationProp } from '../../../types/navigation';

export function ServiceSection({ navigation }: { navigation: MainTabNavigationProp<'Home'> }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Danh mục dịch vụ</Text>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center" }}
          onPress={() =>
            navigation.navigate("ServiceList", { title: "Tất cả dịch vụ" })
          }
        >
          <Text style={styles.seeAll}>Xem tất cả</Text>
          <Icon name="chevronRight" size={16} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.hScroll}
        contentContainerStyle={styles.hScrollContent}
      >
        {CATEGORIES.map((cat) => (
          <ServiceCategoryCard
            key={cat.key}
            categoryKey={cat.key as any}
            title={cat.title}
            subtitle={cat.subtitle}
            style={{ marginRight: Space.lg }}
            onPress={() =>
              navigation.navigate("ServiceList", {
                title: cat.title,
                categoryKey: cat.key,
              })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.neutral[50],
    paddingTop: Space.xl,
    paddingBottom: Space.lg,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Space.xl,
    marginBottom: Space.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary[500],
    paddingLeft: Space.lg,
    marginLeft: Space.md,
    marginRight: Space.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.neutral[900],
  },
  seeAll: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary[500],
  },
  hScroll: {
    paddingLeft: Space.lg,
    backgroundColor: "transparent",
  },
  hScrollContent: {
    paddingRight: Space.xl,
    paddingBottom: Space.sm,
    paddingTop: Space.lg,
  },
});
