import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Modal,
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
import {
  getEstimatedServiceDurationMinutes,
  resolveServiceId,
  uploadRequestImage,
  selectProvider,
} from '../../services/serviceRequestService';
import { searchAddressViaApi, fetchVietmapPlaceDetail, type MobileAddressSuggestion } from '../../services/vietmapService';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

const STEPS = ['Dịch vụ', 'Thời gian', 'Ngân sách', 'Xác nhận'];
function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMaxBookingDate() {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 13);
  return maxDate;
}

function isBookingDateAllowed(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return false;
  }
  const today = getLocalDateKey(new Date());
  return date >= today && date <= getLocalDateKey(getMaxBookingDate());
}

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];
}

function getAvailableTimeSlots(date: string, durationMinutes: number) {
  if (!isBookingDateAllowed(date) || durationMinutes <= 0) return [];
  const slots: string[] = [];
  const latestStart = 17 * 60 - durationMinutes;
  const now = new Date();
  for (let minutes = 8 * 60; minutes <= latestStart; minutes += 15) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    const value = `${hour}:${minute}`;
    const slotDate = new Date(`${date}T${value}:00`);
    if (date !== getLocalDateKey(now) || slotDate.getTime() > now.getTime() + 15 * 60_000) {
      slots.push(value);
    }
  }
  return slots;
}

function formatBookingDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BookingScreen({ route, navigation }: Props) {
  const { submitBooking } = useAppStore();
  const backendServices = useAppStore((state) => state.backendServices);
  const fetchServices = useAppStore((state) => state.fetchServices);
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

  const presetCategory = route.params?.presetCategory;
  const presetProvider = route.params?.presetProvider;

  const [step, setStep] = useState<number>(0);
  const [category, setCategory] = useState<ServiceCategory>((presetCategory as any) || 'Cleaning');
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateKey(new Date()));
  const [time, setTime] = useState<string>('09:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [address, setAddress] = useState<string>(currentUser?.address || '');
  const [addressSource, setAddressSource] = useState<'profile' | 'custom'>('profile');
  const [customAddress, setCustomAddress] = useState<string>('');
  const [addressCoordinates, setAddressCoordinates] = useState<[number, number] | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<MobileAddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const effectiveAddress =
    addressSource === 'profile' && currentUser?.address
      ? currentUser.address
      : (customAddress.trim() || address.trim());
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [budget, setBudget] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const maxDate = getMaxBookingDate();
  const serviceDurationMinutes = backendServices.length
    ? getEstimatedServiceDurationMinutes(category, backendServices)
    : 0;
  const availableCategories = useMemo(
    () => CATEGORY_ITEMS.filter((item) => Boolean(resolveServiceId(item.name, backendServices))),
    [backendServices],
  );
  const timeSlots = getAvailableTimeSlots(selectedDate, serviceDurationMinutes);
  const availableHours = Array.from(new Set(timeSlots.map((slot) => slot.split(':')[0])));
  const selectedHour = availableHours.includes(time.split(':')[0])
    ? time.split(':')[0]
    : availableHours[0] || '';
  const availableMinutes = timeSlots
    .filter((slot) => slot.startsWith(`${selectedHour}:`))
    .map((slot) => slot.split(':')[1]);
  const calendarDays = getCalendarDays(calendarMonth);
  const canGoToPreviousMonth =
    calendarMonth.getFullYear() > new Date().getFullYear() ||
    (calendarMonth.getFullYear() === new Date().getFullYear() &&
      calendarMonth.getMonth() > new Date().getMonth());
  const canGoToNextMonth =
    calendarMonth.getFullYear() < maxDate.getFullYear() ||
    (calendarMonth.getFullYear() === maxDate.getFullYear() &&
      calendarMonth.getMonth() < maxDate.getMonth());

  useEffect(() => {
    let active = true;
    setServicesLoading(true);
    setServicesError('');
    void fetchServices()
      .catch((error) => {
        if (active) setServicesError(error instanceof Error ? error.message : 'Không thể tải dịch vụ.');
      })
      .finally(() => { if (active) setServicesLoading(false); });
    return () => { active = false; };
  }, [fetchServices]);

  useEffect(() => {
    if (availableCategories.length && !availableCategories.some((item) => item.name === category)) {
      setCategory(availableCategories[0].name);
    }
  }, [availableCategories, category]);

  useEffect(() => {
    setTime(timeSlots[0] || '');
  }, [selectedDate, serviceDurationMinutes]);

  const canNext =
    step === 0
      ? title.trim().length > 0
      : step === 1
      ? isBookingDateAllowed(selectedDate) && timeSlots.includes(time) && !!effectiveAddress.trim()
        : true;

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
  };

  const handleSubmit = async () => {
    if (!isBookingDateAllowed(selectedDate)) {
      Alert.alert('Ngày không hợp lệ', 'Ngày đặt lịch phải nằm trong 14 ngày kể từ hôm nay.');
      return;
    }
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
      const createdBooking = await submitBooking({
        category,
        title: finalTitle,
        description: description.trim(),
        date: selectedDate,
        time,
        address: effectiveAddress,
        budget,
        coordinates: addressCoordinates,
        photos: attachments.length,
        attachments,
      });

      if (presetProvider && createdBooking?.id) {
        try {
          await selectProvider(createdBooking.id, presetProvider.id);
          Alert.alert(
            'Đặt thợ thành công!',
            `Đã gửi yêu cầu trực tiếp đến thợ ${presetProvider.name}. Vui lòng chờ thợ xác nhận trong 12h.`,
            [
              {
                text: 'Xem lịch đặt',
                onPress: () => navigation.navigate('MainTabs'),
              },
            ]
          );
          return;
        } catch (selErr: any) {
          console.warn('Auto select provider error:', selErr);
        }
      }

      navigation.navigate('RecommendedProviders', {
        requestId: createdBooking.id,
        title: createdBooking.title,
      });
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
                {availableCategories.map((c) => {
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
              {servicesLoading ? <ActivityIndicator color={Colors.primary[500]} /> : null}
              {servicesError ? <Text style={styles.validationError}>{servicesError}</Text> : null}
              {!servicesLoading && !servicesError && availableCategories.length === 0 ? (
                <Text style={styles.validationError}>Backend chưa có dịch vụ đang hoạt động phù hợp.</Text>
              ) : null}

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
              <TouchableOpacity
                style={styles.pickerField}
                onPress={() => {
                  setCalendarMonth(new Date(`${selectedDate}T12:00:00`));
                  setShowDatePicker(true);
                }}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size={18} color={Colors.primary[600]} />
                <Text style={styles.pickerFieldText}>{formatBookingDate(selectedDate)}</Text>
                <Text style={styles.pickerFieldAction}>Chọn</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionTitle, { marginTop: Space.xl }]}>
                Chọn giờ bắt đầu
              </Text>
              <Text style={styles.scheduleHint}>
                Thời lượng dự kiến: {serviceDurationMinutes} phút. Đây là giờ ưu tiên; hệ thống chỉ gợi ý thợ có thể nhận khung giờ này.
              </Text>
              <TouchableOpacity
                style={[styles.pickerField, timeSlots.length === 0 && styles.pickerFieldDisabled]}
                onPress={() => setShowTimePicker(true)}
                disabled={timeSlots.length === 0}
                activeOpacity={0.7}
              >
                <Icon name="clock" size={18} color={Colors.primary[600]} />
                <Text style={styles.pickerFieldText}>{time || 'Không có giờ khả dụng'}</Text>
                <Text style={styles.pickerFieldAction}>Chọn</Text>
              </TouchableOpacity>
              {timeSlots.length === 0 && (
                <Text style={styles.scheduleHint}>
                  Không còn khung giờ phù hợp trong ngày này. Vui lòng chọn ngày khác.
                </Text>
              )}

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
                    onPress={() => {
                      setAddressSource('profile');
                      setAddressCoordinates(null);
                    }}
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
                      setAddressCoordinates(null);
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
                        setAddressCoordinates(null);
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
                              setAddressCoordinates(item.coords);
                              setShowSuggestions(false);
                              if (item.refId && !item.refId.startsWith('osm_')) {
                                const details = await fetchVietmapPlaceDetail(item.refId);
                                if (details) {
                                  setCustomAddress(details.address || item.label);
                                  setAddress(details.address || item.label);
                                  setAddressCoordinates(details.coords);
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
                Hình thức chi phí
              </Text>
              <View style={styles.budgetCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Space.xs }}>
                  <View style={{ backgroundColor: Colors.semantic.success + '20', paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.full }}>
                    <Text style={{ fontSize: FontSize.xs, fontFamily: FontFamily.bold, color: Colors.semantic.success }}>
                      Thỏa thuận trực tiếp tại nhà
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: FontSize.xs, fontFamily: FontFamily.regular, color: Colors.neutral[600], lineHeight: 18, marginTop: Space.xs }}>
                  Thợ sẽ đến khảo sát tình trạng thực tế, tư vấn phương án xử lý và thống nhất chi phí trực tiếp với bạn trước khi bắt đầu.
                </Text>
                <Text style={{ fontSize: 11, fontFamily: FontFamily.regular, color: Colors.neutral[400], fontStyle: 'italic', marginTop: Space.xs }}>
                  * Thanh toán trực tiếp cho thợ (tiền mặt / chuyển khoản) sau khi nghiệm thu.
                </Text>
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
                    {formatBookingDate(selectedDate)} · Lúc {time}
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
                  <Text style={styles.reviewLabel}>Hình thức chi phí</Text>
                  <Text style={[styles.reviewVal, { color: Colors.primary[600] }]}>
                    Thỏa thuận khi khảo sát
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

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Chọn ngày phục vụ</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Icon name="close" size={22} color={Colors.neutral[600]} />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarMonthRow}>
              <TouchableOpacity
                disabled={!canGoToPreviousMonth}
                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                style={styles.monthArrow}
              >
                <Icon name="chevronLeft" size={20} color={canGoToPreviousMonth ? Colors.neutral[700] : Colors.neutral[300]} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                disabled={!canGoToNextMonth}
                onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                style={styles.monthArrow}
              >
                <Icon name="chevronRight" size={20} color={canGoToNextMonth ? Colors.neutral[700] : Colors.neutral[300]} />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarGrid}>
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
                <Text key={day} style={styles.calendarWeekday}>{day}</Text>
              ))}
              {calendarDays.map((day, index) => {
                if (!day) return <View key={`empty-${index}`} style={styles.calendarDayCell} />;
                const dateValue = getLocalDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
                const todayValue = getLocalDateKey(new Date());
                const disabled = dateValue < todayValue || dateValue > getLocalDateKey(maxDate);
                const selected = dateValue === selectedDate;
                return (
                  <TouchableOpacity
                    key={dateValue}
                    disabled={disabled}
                    onPress={() => {
                      setSelectedDate(dateValue);
                      setShowDatePicker(false);
                    }}
                    style={[styles.calendarDayCell, selected && styles.calendarDaySelected]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        disabled && styles.calendarDayDisabled,
                        selected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.pickerNote}>Có thể đặt trước tối đa 14 ngày.</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Chọn giờ bắt đầu</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Icon name="close" size={22} color={Colors.neutral[600]} />
              </TouchableOpacity>
            </View>
            <Text style={styles.pickerNote}>Chọn giờ và phút theo mốc 00, 15, 30 hoặc 45.</Text>
            <View style={styles.timePickerColumns}>
              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerLabel}>Giờ</Text>
                <ScrollView style={styles.timePickerOptions} nestedScrollEnabled>
                  {availableHours.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[styles.timePickerOption, selectedHour === hour && styles.timePickerOptionSelected]}
                      onPress={() => {
                        const nextTime = timeSlots.find((slot) => slot.startsWith(`${hour}:`));
                        if (nextTime) setTime(nextTime);
                      }}
                    >
                      <Text style={[styles.timePickerOptionText, selectedHour === hour && styles.timePickerOptionTextSelected]}>
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.timePickerColumn}>
                <Text style={styles.timePickerLabel}>Phút</Text>
                <ScrollView style={styles.timePickerOptions} nestedScrollEnabled>
                  {availableMinutes.map((minute) => {
                    const selected = time === `${selectedHour}:${minute}`;
                    return (
                      <TouchableOpacity
                        key={minute}
                        style={[styles.timePickerOption, selected && styles.timePickerOptionSelected]}
                        onPress={() => setTime(`${selectedHour}:${minute}`)}
                      >
                        <Text style={[styles.timePickerOptionText, selected && styles.timePickerOptionTextSelected]}>
                          {minute}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
            <Button label="Xác nhận giờ" variant="primary" size="lg" onPress={() => setShowTimePicker(false)} />
          </View>
        </View>
      </Modal>
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
  validationError: { color: Colors.semantic.error, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
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
  pickerField: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  pickerFieldDisabled: {
    opacity: 0.55,
  },
  pickerFieldText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.neutral[800],
  },
  pickerFieldAction: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary[600],
  },
  scheduleHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Space.xl,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pickerModal: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: Space.md,
    padding: Space.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.neutral[0],
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerModalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
  },
  calendarMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[800],
    textTransform: 'capitalize',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarWeekday: {
    width: '14.285%',
    paddingVertical: Space.sm,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[500],
  },
  calendarDayCell: {
    width: '14.285%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  calendarDaySelected: {
    backgroundColor: Colors.primary[500],
  },
  calendarDayText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.neutral[800],
  },
  calendarDayDisabled: {
    color: Colors.neutral[300],
  },
  calendarDayTextSelected: {
    color: Colors.neutral[0],
    fontFamily: FontFamily.bold,
  },
  pickerNote: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  timePickerColumns: {
    flexDirection: 'row',
    gap: Space.md,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerLabel: {
    marginBottom: Space.xs,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[600],
  },
  timePickerOptions: {
    maxHeight: 220,
    borderRadius: Radius.lg,
    backgroundColor: Colors.neutral[50],
  },
  timePickerOption: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerOptionSelected: {
    backgroundColor: Colors.primary[50],
  },
  timePickerOptionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.neutral[700],
  },
  timePickerOptionTextSelected: {
    fontFamily: FontFamily.bold,
    color: Colors.primary[700],
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
