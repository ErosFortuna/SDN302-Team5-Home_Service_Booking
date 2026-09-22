import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Colors, category } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { StatusBadge } from '../../components/ui/Badge';

import { RouteProp } from '@react-navigation/native';
import { RootStackNavigationProp, RootStackParamList } from '../../types/navigation';

type Props = {
  navigation: RootStackNavigationProp<'JobDetail'>;
  route: RouteProp<RootStackParamList, 'JobDetail'>;
};

export default function JobDetailScreen({ route, navigation }: Props) {
  // In a real app, use route.params.jobId to fetch job details
  const job = {
    id: 'REQ-1234',
    serviceName: 'Sửa ống nước rò rỉ',
    categoryKey: 'plumbing' as const,
    customerName: 'Nguyễn Văn Minh',
    phone: '0901234567',
    address: '123 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM',
    distance: '2.5 km',
    time: 'Hôm nay – 14:00',
    description: 'Ống nước bồn rửa chén bị rỉ nước liên tục từ tối qua, cần thợ đến kiểm tra và thay ống nếu cần thiết.',
    status: 'requested' as const,
    images: [
      'https://via.placeholder.com/150/E0F2FE/0284C7?text=Water+Leak',
    ],
  };

  const cat = category[job.categoryKey];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Chi tiết yêu cầu" showBack />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Service Overview */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.iconBox, { backgroundColor: cat.bg }]}>
              <Icon name="plumbing" size={24} color={cat.icon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>{job.serviceName}</Text>
              <Text style={styles.jobId}>Mã YC: {job.id}</Text>
            </View>
            <StatusBadge bookingStatus={job.status} />
          </View>
          
          <Text style={styles.sectionTitle}>Mô tả chi tiết</Text>
          <Text style={styles.description}>{job.description}</Text>

          {job.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {job.images.map((img, i) => (
                <Image key={i} source={{ uri: img }} style={styles.attachedImage} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Time & Location */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thời gian & Địa điểm</Text>
          
          <View style={styles.infoRow}>
            <Icon name="calendar" size={20} color={Colors.neutral[400]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoValue}>{job.time}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Icon name="location" size={20} color={Colors.neutral[400]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoValue}>{job.address}</Text>
              <Text style={styles.infoSubtext}>Cách bạn {job.distance}</Text>
            </View>
            <View style={styles.mapBtn}>
              <Icon name="map" size={16} color={Colors.primary[500]} />
              <Text style={styles.mapBtnText}>Bản đồ</Text>
            </View>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{job.customerName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{job.customerName}</Text>
              <Text style={styles.customerPhone}>{job.phone}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Icon name="phone" size={20} color={Colors.primary[500]} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chatBtn}
              onPress={() => navigation.navigate('Chat', { name: job.customerName })}
            >
              <Icon name="messages" size={20} color={Colors.primary[500]} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Button 
          label="Từ chối" 
          variant="outline" 
          style={{ flex: 1 }} 
        />
        <Button 
          label="Nhận việc ngay" 
          variant="primary" 
          gradient 
          style={{ flex: 2 }} 
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
  content: {
    padding: Space.lg,
    gap: Space.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.lg,
    padding: Space.lg,
    ...Shadow.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginBottom: Space.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
    paddingBottom: Space.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.neutral[900],
  },
  jobId: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[400],
  },
  sectionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.neutral[800],
    marginBottom: Space.sm,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[600],
    lineHeight: 22,
  },
  imageScroll: {
    marginTop: Space.md,
    flexDirection: 'row',
  },
  attachedImage: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    marginRight: Space.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.md,
    marginTop: Space.sm,
    paddingBottom: Space.sm,
  },
  infoValue: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.neutral[800],
    lineHeight: 22,
  },
  infoSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  mapBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary[600],
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary[700],
  },
  customerName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  customerPhone: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[500],
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Space.md,
    padding: Space.lg,
    backgroundColor: Colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
});
