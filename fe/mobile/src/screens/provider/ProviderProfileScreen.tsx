import React from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';
import { Icon } from '../../components/ui/Icon';
import {
  createMyProviderProfile,
  deleteMyProviderProfile,
  getMyProviderProfile,
  updateMyProviderProfile,
  type ProviderProfile,
  type ProviderProfileInput,
} from '../../services/providerProfileService';

interface ProfileForm {
  businessName: string;
  bio: string;
  yearsOfExperience: string;
  serviceAreas: string;
  city: string;
  latitude: string;
  longitude: string;
}

const EMPTY_FORM: ProfileForm = {
  businessName: '',
  bio: '',
  yearsOfExperience: '0',
  serviceAreas: '',
  city: '',
  latitude: '',
  longitude: '',
};

const VERIFICATION_LABELS: Record<ProviderProfile['verificationStatus'], string> = {
  PENDING: 'Chờ xác minh',
  VERIFIED: 'Đã xác minh',
  REJECTED: 'Bị từ chối',
};

function profileToForm(profile: ProviderProfile): ProfileForm {
  return {
    businessName: profile.businessName,
    bio: profile.bio,
    yearsOfExperience: String(profile.yearsOfExperience),
    serviceAreas: profile.serviceAreas.join(', '),
    city: profile.city,
    latitude: profile.location ? String(profile.location.coordinates[1]) : '',
    longitude: profile.location ? String(profile.location.coordinates[0]) : '',
  };
}

function formToInput(form: ProfileForm): ProviderProfileInput {
  const hasLatitude = form.latitude.trim() !== '';
  const hasLongitude = form.longitude.trim() !== '';
  if (hasLatitude !== hasLongitude) {
    throw new Error('Vui lòng nhập cả vĩ độ và kinh độ, hoặc để trống cả hai.');
  }
  const location = hasLatitude
    ? {
        type: 'Point' as const,
        coordinates: [Number(form.longitude), Number(form.latitude)] as [number, number],
      }
    : null;
  if (location && (!Number.isFinite(location.coordinates[0]) || !Number.isFinite(location.coordinates[1]))) {
    throw new Error('Vĩ độ và kinh độ phải là số hợp lệ.');
  }
  const years = Number(form.yearsOfExperience);
  if (!Number.isInteger(years) || years < 0 || years > 80) {
    throw new Error('Số năm kinh nghiệm phải là số nguyên từ 0 đến 80.');
  }
  return {
    businessName: form.businessName.trim(),
    bio: form.bio.trim(),
    yearsOfExperience: years,
    serviceAreas: [...new Set(form.serviceAreas.split(',').map((area) => area.trim()).filter(Boolean))],
    city: form.city.trim(),
    location,
  };
}

export default function ProviderProfileScreen() {
  const [profile, setProfile] = React.useState<ProviderProfile | null>(null);
  const [form, setForm] = React.useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const current = await getMyProviderProfile();
      setProfile(current);
      setForm(current ? profileToForm(current) : EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ thợ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void load();
    }, [load]),
  );

  const setField = (field: keyof ProfileForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = formToInput(form);
      const saved = profile
        ? await updateMyProviderProfile(payload)
        : await createMyProviderProfile(payload);
      setProfile(saved);
      setForm(profileToForm(saved));
      Alert.alert('Đã lưu', profile ? 'Thông tin hồ sơ đã được cập nhật.' : 'Hồ sơ đã tạo và đang chờ xác minh.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Ẩn hồ sơ thợ?',
      'Hồ sơ sẽ không còn xuất hiện trong tìm kiếm và bạn không thể nhận yêu cầu mới. Lịch sử vẫn được giữ lại.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Ẩn hồ sơ',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            setError('');
            deleteMyProviderProfile()
              .then(setProfile)
              .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Không thể ẩn hồ sơ.'))
              .finally(() => setDeleting(false));
          },
        },
      ],
    );
  };

  const isDeleted = profile?.isDeleted === true;

  const renderInput = (
    label: string,
    field: keyof ProfileForm,
    options: { multiline?: boolean; keyboardType?: 'default' | 'numeric' | 'decimal-pad'; placeholder?: string } = {},
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={form[field]}
        onChangeText={(value) => setField(field, value)}
        editable={!isDeleted && !saving && !deleting}
        multiline={options.multiline}
        keyboardType={options.keyboardType || 'default'}
        placeholder={options.placeholder}
        placeholderTextColor={Colors.neutral[400]}
        textAlignVertical={options.multiline ? 'top' : 'center'}
        style={[styles.input, options.multiline && styles.multiline]}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Hồ sơ thợ</Text>
          <Text style={styles.subtitle}>Quản lý thông tin kinh doanh và khu vực nhận việc.</Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void load(true)}><Text style={styles.retry}>Thử lại</Text></TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary[600]} style={styles.loader} />
        ) : isDeleted ? (
          <View style={styles.deletedCard}>
            <Icon name="warning" size={22} color={Colors.semantic.warning} />
            <View style={styles.statusInfo}>
              <Text style={styles.cardTitle}>Hồ sơ đã được ẩn</Text>
              <Text style={styles.bodyText}>Lịch sử công việc và thanh toán vẫn được lưu. Liên hệ quản trị viên nếu cần khôi phục.</Text>
            </View>
          </View>
        ) : (
          <>
            {profile && (
              <View style={styles.statusCard}>
                <Icon name="shieldCheck" size={22} color={Colors.primary[600]} />
                <View style={styles.statusInfo}>
                  <Text style={styles.cardTitle}>Trạng thái: {VERIFICATION_LABELS[profile.verificationStatus]}</Text>
                  <Text style={styles.bodyText}>
                    {profile.averageRating.toFixed(1)} sao · {profile.reviewCount} đánh giá · {profile.completedJobCount} công việc hoàn thành
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.formCard}>
              {renderInput('Tên cửa hàng / tên kinh doanh', 'businessName', { placeholder: 'Ví dụ: Aqua Fix' })}
              {renderInput('Giới thiệu', 'bio', { multiline: true, placeholder: 'Mô tả kinh nghiệm và dịch vụ của bạn' })}
              {renderInput('Số năm kinh nghiệm', 'yearsOfExperience', { keyboardType: 'numeric' })}
              {renderInput('Thành phố', 'city', { placeholder: 'Ví dụ: Đà Nẵng' })}
              {renderInput('Khu vực nhận việc', 'serviceAreas', { placeholder: 'Các khu vực, cách nhau bằng dấu phẩy' })}
              <View style={styles.locationHeader}>
                <Icon name="location" size={17} color={Colors.primary[600]} />
                <Text style={styles.label}>Vị trí (không bắt buộc)</Text>
              </View>
              <View style={styles.coordinates}>
                <View style={styles.coordinateField}>
                  {renderInput('Vĩ độ', 'latitude', { keyboardType: 'decimal-pad' })}
                </View>
                <View style={styles.coordinateField}>
                  {renderInput('Kinh độ', 'longitude', { keyboardType: 'decimal-pad' })}
                </View>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                disabled={saving || deleting}
                onPress={() => void save()}
                style={[styles.saveButton, (saving || deleting) && styles.disabled]}
              >
                {saving ? <ActivityIndicator color={Colors.neutral[0]} /> : <Icon name="check" size={18} color={Colors.neutral[0]} />}
                <Text style={styles.saveText}>{profile ? 'Lưu thay đổi' : 'Tạo hồ sơ'}</Text>
              </TouchableOpacity>
              {profile && (
                <TouchableOpacity
                  disabled={saving || deleting}
                  onPress={confirmDelete}
                  style={[styles.deleteButton, (saving || deleting) && styles.disabled]}
                >
                  {deleting ? <ActivityIndicator color={Colors.semantic.error} /> : <Icon name="delete" size={17} color={Colors.semantic.error} />}
                  <Text style={styles.deleteText}>Ẩn hồ sơ</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.disclaimer}>
              Trạng thái xác minh, đánh giá và số công việc do hệ thống quản lý. Không thể ẩn hồ sơ khi còn công việc đang thực hiện hoặc checkout membership chưa hoàn tất.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  content: { padding: Space.md, paddingBottom: 48, gap: Space.md },
  heading: { marginBottom: Space.xs },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.neutral[900] },
  subtitle: { marginTop: 4, fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral[500] },
  loader: { marginTop: 48 },
  errorCard: { padding: Space.md, borderRadius: Radius.lg, backgroundColor: Colors.semantic.errorBg, gap: Space.sm },
  errorText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.semantic.error },
  retry: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.semantic.error },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md, borderRadius: Radius.xl,
    backgroundColor: Colors.neutral[0], borderWidth: 1, borderColor: Colors.neutral[200], ...Shadow.sm,
  },
  statusInfo: { flex: 1, gap: 3 },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral[900] },
  bodyText: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 16, color: Colors.neutral[600] },
  deletedCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Space.md, padding: Space.md, borderRadius: Radius.xl,
    backgroundColor: Colors.semantic.warningBg, borderWidth: 1, borderColor: Colors.semantic.warning,
  },
  formCard: {
    padding: Space.md, borderRadius: Radius.xl, backgroundColor: Colors.neutral[0],
    borderWidth: 1, borderColor: Colors.neutral[200], ...Shadow.sm,
  },
  field: { marginBottom: Space.md },
  label: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.neutral[800] },
  input: {
    minHeight: 44, marginTop: 6, paddingHorizontal: Space.md, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.neutral[200], backgroundColor: Colors.neutral[0],
    fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.neutral[900],
  },
  multiline: { minHeight: 100, paddingTop: Space.sm },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Space.sm },
  coordinates: { flexDirection: 'row', gap: Space.sm },
  coordinateField: { flex: 1 },
  saveButton: {
    minHeight: 46, marginTop: Space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm,
    borderRadius: Radius.lg, backgroundColor: Colors.primary[600],
  },
  saveText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.neutral[0] },
  deleteButton: {
    minHeight: 44, marginTop: Space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.semantic.error,
  },
  deleteText: { fontFamily: FontFamily.bold, fontSize: FontSize.xs, color: Colors.semantic.error },
  disabled: { opacity: 0.6 },
  disclaimer: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 17, color: Colors.neutral[500] },
});
