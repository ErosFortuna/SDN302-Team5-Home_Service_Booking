import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatVND } from '../../utils/formatters';

const CATEGORY_ITEMS: {
  name: ServiceCategory;
  vietnameseTitle: string;
  iconName: 'cleaning' | 'electrical' | 'plumbing' | 'appliance' | 'wrench';
  color: string;
  bgColor: string;
}[] = [
  { name: 'Cleaning', vietnameseTitle: 'Vệ sinh nhà', iconName: 'cleaning', color: '#00B4A6', bgColor: '#E6F7F5' },
  { name: 'Electrical', vietnameseTitle: 'Điện dân dụng', iconName: 'electrical', color: '#F59E0B', bgColor: '#FFFBEB' },
  { name: 'Plumbing', vietnameseTitle: 'Sửa ống nước', iconName: 'plumbing', color: '#0284C7', bgColor: '#E0F2FE' },
  { name: 'Appliance', vietnameseTitle: 'Điều hoà & Điện lạnh', iconName: 'appliance', color: '#8B5CF6', bgColor: '#F3EEFF' },
  { name: 'Painting', vietnameseTitle: 'Sơn & Trang trí', iconName: 'wrench', color: '#F43F5E', bgColor: '#FFE4E6' },
];
import { ServiceCategory } from '../../types';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/form/Input';
import { Button, Icon } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { uploadRequestImage } from '../../services/serviceRequestService';
import { searchAddressViaApi, fetchVietmapPlaceDetail, type MobileAddressSuggestion } from '../../services/vietmapService';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

const STEPS = ['Dịch vụ', 'Thời gian', 'Ngân sách', 'Xác nhận'];
const TIME_SLOTS = ['08:00', '10:00', '13:00', '15:00', '17:00'];
function getDynamicBookingDates() {
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return Array.from({ length: 4 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : dayNames[d.getDay()];
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return {
      label,
      sub: `${day}/${month}`,
      year: d.getFullYear(),
    };
  });
}

const DATES = getDynamicBookingDates();

export default function BookingScreen({ route, navigation }: Props) {
  const { submitBooking } = useAppStore();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const currentUser = useAuthStore((state) => state.currentUser);

  useEffect(() => {
    if (!isLoggedIn) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập tài khoản để đặt thợ và dịch vụ.',
        [
          {
            text: 'Đăng nhập ngay',
            onPress: () => navigation.navigate('Login'),
          },
          {
            text: 'Quay lại',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [isLoggedIn, navigation]);

  const [step, setStep] = useState<number>(0);
  const [category, setCategory] = useState<ServiceCategory>('Cleaning');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dateIdx, setDateIdx] = useState<number>(0);
  const [time, setTime] = useState<string>(TIME_SLOTS[1]);
  const [address, setAddress] = useState<string>(currentUser?.address || '');
  const [addressSource, setAddressSource] = useState<'profile' | 'custom'>('profile');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [addressSuggestions, setAddressSuggestions] = useState<MobileAddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const effectiveAddress =
    addressSource === 'profile' && currentUser?.address
      ? currentUser.address
      : (customAddress.trim() || address.trim() || 'TP.HCM');
  const [photos, setPhotos] = useState<number>(0);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [budget, setBudget] = useState<number>(500000);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canNext =
    step === 0 ? title.trim().length > 0 : step === 1 ? !!time && !!effectiveAddress.trim() : true;

  const handlePickImage = async () => {
    if (attachments.length >= 5) {
      Alert.alert('Giới hạn ảnh', 'Bạn chỉ có thể đính kèm tối đa 5 hình ảnh.');
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Quyền truy cập',
          'Vui lòng cấp quyền truy cập thư viện ảnh để đính kèm hình sự cố.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        setUploadingImage(true);
        const uploadedUrl = await uploadRequestImage(localUri);
        if (uploadedUrl) {
          setAttachments((prev) => [...prev, uploadedUrl]);
          setPhotos((p) => p + 1);
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi tải ảnh', err.message || 'Không thể tải ảnh lên Cloudinary.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
    setPhotos((p) => Math.max(0, p - 1));
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập tài khoản để đặt thợ và dịch vụ.',
        [
          {
            text: 'Đăng nhập ngay',
            onPress: () => navigation.navigate('Login'),
          },
          { text: 'Hủy', style: 'cancel' },
        ]
      );
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    const finalTitle = title.trim() || `Dịch vụ ${category}`;

    try {
      await submitBooking({
        category,
        title: finalTitle,
        description: description.trim(),
        date: `${DATES[dateIdx].sub}/${DATES[dateIdx].year}`,
        time,
        address: effectiveAddress,
        budget,
        photos: attachments.length,
        attachments,
      });

      Alert.alert(
        'Gửi yêu cầu thành công!',
        'Yêu cầu của bạn đã được gửi đến các thợ uy tín trong khu vực. Bạn có thể theo dõi tiến độ trong mục Lịch đặt.',
        [
          {
            text: 'Xem lịch đặt',
            onPress: () => navigation.navigate('MainTabs'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Lỗi gửi yêu cầu',
        err?.message || 'Không thể kết nối đến máy chủ. Yêu cầu đã được lưu tạm.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Đặt dịch vụ mới"
        subtitle={`Bước ${step + 1} / 4: ${STEPS[step]}`}
        showBack
      />

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {STEPS.map((s, idx) => {
          const isDone = idx <= step;
          return (
            <View key={s} style={styles.progressItem}>
              <View
                style={[
                  styles.progressBar,
                  isDone ? styles.progressBarDone : styles.progressBarPending,
                ]}
              />
              <Text
                style={[
                  styles.progressLabel,
                  isDone ? styles.progressLabelDone : styles.progressLabelPending,
                ]}
              >
                {s}
              </Text>
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 0: Chọn dịch vụ & mô tả */}
          {step === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Chọn loại dịch vụ</Text>
              <View style={styles.categoryGrid}>
                {CATEGORY_ITEMS.map((c) => {
                  const isSelected = category === c.name;
                  return (
                    <TouchableOpacity
                      key={c.name}
                      style={[
                        styles.catCard,
                        isSelected && styles.catCardSelected,
                      ]}
                      onPress={() => setCategory(c.name)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.catIconWrapper,
                          { backgroundColor: isSelected ? c.color : c.bgColor },
                        ]}
                      >
                        <Icon
                          name={c.iconName}
                          size={24}
                          color={isSelected ? Colors.neutral[0] : c.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.catTitle,
                          isSelected && styles.catTitleSelected,
                        ]}
                      >
                        {c.vietnameseTitle}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: Space.xl }]}>
                2. Bạn đang gặp sự cố gì?
              </Text>
              <Input
                placeholder="VD: Rò rỉ nước bồn rửa chén, máy lạnh kêu to..."
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.sectionTitle, { marginTop: Space.lg }]}>
                3. Mô tả chi tiết công việc cần hỗ trợ
              </Text>
              <Input
                placeholder="Thêm mô tả về tình trạng, thời gian xuất hiện sự cố..."
                multiline
                numberOfLines={4}
                style={{ height: 96, textAlignVertical: 'top' }}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          )}

          {/* STEP 1: Lịch hẹn & Địa điểm */}
          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chọn ngày phục vụ</Text>
              <View style={styles.dateGrid}>
                {DATES.map((d, idx) => {
                  const isSelected = dateIdx === idx;
                  return (
                    <TouchableOpacity
                      key={d.sub}
                      style={[
                        styles.dateChip,
                        isSelected && styles.dateChipSelected,
                      ]}
                      onPress={() => setDateIdx(idx)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dateLabel,
                          isSelected && styles.dateLabelSelected,
                        ]}
                      >
                        {d.label}
                      </Text>
                      <Text
                        style={[
                          styles.dateSub,
                          isSelected && styles.dateSubSelected,
                        ]}
                      >
                        {d.sub}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: Space.xl }]}>
                Chọn khung giờ mong muốn
              </Text>
              <View style={styles.timeSlotsRow}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = time === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.timeChip,
                        isSelected && styles.timeChipSelected,
                      ]}
                      onPress={() => setTime(slot)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          isSelected && styles.timeChipTextSelected,
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ marginTop: Space.xl }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Space.xs }}>
                  <Text style={styles.sectionTitle}>
                    Địa chỉ thực hiện dịch vụ
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveAddress)}`)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Icon name="location" size={13} color={Colors.primary[600]} />
                    <Text style={{ fontSize: 12, color: Colors.primary[600], fontWeight: 'bold' }}>Google Maps</Text>
                  </TouchableOpacity>
                </View>

                {/* Switch between Profile and Custom */}
                <View style={{ flexDirection: 'row', backgroundColor: Colors.neutral[100], borderRadius: Radius.lg, padding: 3, marginBottom: Space.sm }}>
                  <TouchableOpacity
                    onPress={() => setAddressSource('profile')}
                    style={[
                      { flex: 1, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center' },
                      addressSource === 'profile' && { backgroundColor: Colors.neutral[0], elevation: 1 }
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: addressSource === 'profile' ? Colors.neutral[900] : Colors.neutral[500] }}>
                      Địa chỉ hồ sơ
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setAddressSource('custom');
                      if (!customAddress) setCustomAddress(address || '');
                    }}
                    style={[
                      { flex: 1, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center' },
                      addressSource === 'custom' && { backgroundColor: Colors.primary[600] }
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: addressSource === 'custom' ? Colors.neutral[0] : Colors.neutral[500] }}>
                      Nhập địa chỉ khác
                    </Text>
                  </TouchableOpacity>
                </View>

                {addressSource === 'profile' ? (
                  <View style={{ backgroundColor: Colors.neutral[0], padding: Space.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.neutral[200], marginBottom: Space.sm }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: Colors.neutral[900] }}>
                      {currentUser?.address || 'Chưa có địa chỉ trong hồ sơ'}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.neutral[500], marginTop: 2 }}>
                      {currentUser?.address ? 'Địa chỉ mặc định của bạn' : 'Vui lòng chọn "Nhập địa chỉ khác" để định vị.'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ marginBottom: Space.sm }}>
                    <Input
                      placeholder="Nhập địa chỉ (tìm kiếm qua VietMap API v4)..."
                      value={customAddress}
                      onChangeText={async (val) => {
                        setCustomAddress(val);
                        setAddress(val);
                        if (val.trim().length >= 2) {
                          const results = await searchAddressViaApi(val);
                          setAddressSuggestions(results);
                          setShowSuggestions(results.length > 0);
                        } else {
                          setAddressSuggestions([]);
                          setShowSuggestions(false);
                        }
                      }}
                      leftIcon="location"
                    />

                    {/* Suggestions Dropdown (100% API-driven) */}
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <View style={{ backgroundColor: Colors.neutral[0], borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: Radius.lg, marginTop: 4, padding: 4, elevation: 3 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: Colors.neutral[500], paddingHorizontal: 8, paddingVertical: 4 }}>
                          GỢI Ý TỪ VIETMAP API ({addressSuggestions.length})
                        </Text>
                        {addressSuggestions.map((item, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={async () => {
                              setCustomAddress(item.label);
                              setAddress(item.label);
                              setShowSuggestions(false);
                              if (item.refId && !item.refId.startsWith('osm_')) {
                                const details = await fetchVietmapPlaceDetail(item.refId);
                                if (details) {
                                  setCustomAddress(details.address || item.label);
                                  setAddress(details.address || item.label);
                                }
                              }
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 8,
                              paddingHorizontal: 8,
                              borderTopWidth: idx > 0 ? 0.5 : 0,
                              borderTopColor: Colors.neutral[100],
                            }}
                          >
                            <Icon name="location" size={14} color={Colors.primary[600]} style={{ marginRight: 6 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.neutral[900] }} numberOfLines={1}>
                                {item.label}
                              </Text>
                              {item.secondary ? (
                                <Text style={{ fontSize: 10, color: Colors.neutral[500] }}>{item.secondary}</Text>
                              ) : null}
                            </View>
                            <View style={{ backgroundColor: Colors.primary[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm }}>
                              <Text style={{ fontSize: 9, fontWeight: 'bold', color: Colors.primary[600] }}>
                                {item.source === 'vietmap' ? 'VietMap' : 'API'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(effectiveAddress)}`)}
                  activeOpacity={0.8}
                  style={styles.mapPreview}
                >
                  <Icon name="map" size={20} color={Colors.primary[500]} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.mapPreviewText} numberOfLines={1}>{effectiveAddress}</Text>
                    <Text style={{ fontSize: 10, color: Colors.primary[600], fontWeight: '600' }}>Nhấn để mở định vị Google Maps ↗</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 2: Ảnh & Ngân sách */}
          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Đính kèm hình ảnh sự cố (Tối đa 5 ảnh qua Cloudinary)
              </Text>
              <View style={styles.photoRow}>
                {attachments.map((url, i) => (
                  <View key={i} style={styles.photoThumbnail}>
                    <Image source={{ uri: url }} style={styles.photoImg} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => handleRemovePhoto(i)}
                    >
                      <Icon name="close" size={12} color={Colors.neutral[0]} />
                    </TouchableOpacity>
                  </View>
                ))}
                {attachments.length < 5 && (
                  <TouchableOpacity
                    style={styles.addPhotoBtn}
                    disabled={uploadingImage}
                    onPress={handlePickImage}
                    activeOpacity={0.7}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color={Colors.primary[600]} />
                    ) : (
                      <>
                        <Icon name="camera" size={24} color={Colors.neutral[400]} />
                        <Text style={styles.addPhotoText}>Thêm ảnh</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: Space.xl }]}>
                Dự trù ngân sách của bạn
              </Text>
              <View style={styles.budgetCard}>
                <Text style={styles.budgetValueDisplay}>{formatVND(budget)}</Text>
                <View style={styles.stepperControl}>
                  <TouchableOpacity
                    style={styles.budgetStepBtn}
                    onPress={() => setBudget(Math.max(100000, budget - 50000))}
                  >
                    <Text style={styles.budgetStepText}>− 50k</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.budgetStepBtn}
                    onPress={() => setBudget(budget + 50000)}
                  >
                    <Text style={styles.budgetStepText}>+ 50k</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.budgetChips}>
                  {[300000, 500000, 800000, 1200000].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetChip,
                        budget === preset && styles.presetChipActive,
                      ]}
                      onPress={() => setBudget(preset)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          budget === preset && styles.presetChipTextActive,
                        ]}
                      >
                        {preset / 1000}k
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: Xem lại & Xác nhận */}
          {step === 3 && (
            <View style={styles.section}>
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewIconBg}>
                    <Icon name="wrench" size={24} color={Colors.primary[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewTitle}>
                      {title || `Dịch vụ ${category}`}
                    </Text>
                    <Text style={styles.reviewCat}>{category}</Text>
                  </View>
                </View>

                <View style={styles.reviewDivider} />

                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Thời gian</Text>
                  <Text style={styles.reviewVal}>
                    {DATES[dateIdx].sub} · Lúc {time}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Địa điểm</Text>
                  <Text style={styles.reviewVal} numberOfLines={2}>
                    {effectiveAddress}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Ảnh đính kèm</Text>
                  <Text style={styles.reviewVal}>{attachments.length} hình ảnh</Text>
                </View>
                {attachments.length > 0 && (
                  <View style={styles.reviewPhotoRow}>
                    {attachments.map((url, i) => (
                      <Image key={i} source={{ uri: url }} style={styles.reviewPhotoThumb} />
                    ))}
                  </View>
                )}
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Ngân sách dự kiến</Text>
                  <Text style={[styles.reviewVal, { color: Colors.primary[600] }]}>
                    {formatVND(budget)}
                  </Text>
                </View>

                {description ? (
                  <View style={styles.reviewDescBox}>
                    <Text style={styles.reviewDescText}>&ldquo;{description}&rdquo;</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Navigation Buttons */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {step > 0 && (
            <Button
              label="Quay lại"
              variant="outline"
              size="lg"
              style={{ flex: 1 }}
              onPress={() => setStep(step - 1)}
            />
          )}
          <Button
            label={
              step < 3
                ? 'Tiếp tục'
                : isSubmitting
                ? 'Đang gửi...'
                : 'Xác nhận gửi yêu cầu'
            }
            variant="primary"
            size="lg"
            gradient
            loading={isSubmitting}
            disabled={!canNext || isSubmitting}
            style={{ flex: step > 0 ? 1.8 : 1 }}
            onPress={() => {
              if (step < 3) {
                setStep(step + 1);
              } else {
                handleSubmit();
              }
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: Space.xl,
    paddingVertical: Space.sm,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    gap: Space.sm,
  },
  progressItem: {
    flex: 1,
    gap: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: Radius.full,
  },
  progressBarDone: {
    backgroundColor: Colors.primary[500],
  },
  progressBarPending: {
    backgroundColor: Colors.neutral[200],
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
  },
  progressLabelDone: {
    color: Colors.primary[600],
    fontFamily: FontFamily.bold,
  },
  progressLabelPending: {
    color: Colors.neutral[400],
  },
  scroll: {
    padding: Space.xl,
    paddingBottom: 60,
  },
  section: {
    gap: Space.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    marginBottom: Space.xs,
  },
  // Categories
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  catCard: {
    width: '48%',
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.md,
    alignItems: 'center',
    gap: Space.sm,
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  catCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  catIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
    textAlign: 'center',
  },
  catTitleSelected: {
    color: Colors.primary[700],
    fontFamily: FontFamily.bold,
  },
  // Dates
  dateGrid: {
    flexDirection: 'row',
    gap: Space.sm,
  },
  dateChip: {
    flex: 1,
    paddingVertical: Space.sm + 2,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    alignItems: 'center',
  },
  dateChipSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  dateLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  dateLabelSelected: {
    color: Colors.primary[600],
  },
  dateSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.neutral[400],
    marginTop: 2,
  },
  dateSubSelected: {
    color: Colors.primary[500],
  },
  // Time slots
  timeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  timeChip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  timeChipSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  timeChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  timeChipTextSelected: {
    color: Colors.primary[700],
    fontFamily: FontFamily.bold,
  },
  mapPreview: {
    height: 80,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary[300],
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Space.md,
  },
  mapPreviewText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  // Photos
  photoRow: {
    flexDirection: 'row',
    gap: Space.md,
  },
  photoThumbnail: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.xl,
  },
  reviewPhotoRow: {
    flexDirection: 'row',
    gap: Space.xs,
    marginTop: Space.xs,
  },
  reviewPhotoThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.neutral[500],
  },
  // Budget
  budgetCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
  },
  budgetValueDisplay: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.primary[600],
    marginVertical: Space.sm,
  },
  stepperControl: {
    flexDirection: 'row',
    gap: Space.md,
    marginTop: Space.sm,
  },
  budgetStepBtn: {
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
  },
  budgetStepText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  budgetChips: {
    flexDirection: 'row',
    gap: Space.sm,
    marginTop: Space.lg,
  },
  presetChip: {
    paddingHorizontal: Space.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
  },
  presetChipActive: {
    backgroundColor: Colors.primary[500],
  },
  presetChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[600],
  },
  presetChipTextActive: {
    color: Colors.neutral[0],
  },
  // Review
  reviewCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Radius.xl,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    ...Shadow.sm,
    gap: Space.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  reviewIconBg: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  reviewCat: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: Colors.neutral[100],
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  reviewVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
    maxWidth: '65%',
    textAlign: 'right',
  },
  reviewDescBox: {
    backgroundColor: Colors.neutral[50],
    padding: Space.md,
    borderRadius: Radius.md,
    marginTop: Space.xs,
  },
  reviewDescText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    ...Shadow.md,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Space.md,
  },
});
