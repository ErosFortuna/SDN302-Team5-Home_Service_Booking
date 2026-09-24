import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { formatVND } from '../../constants/mockData';
import { ChatMessage } from '../../types';
import { Icon } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Shadow, Space } from '../../constants/spacing';

type Props = Partial<NativeStackScreenProps<RootStackParamList, 'Chat'>>;

const QUICK_REPLIES = [
  'Đồng ý mức giá này!',
  'Bao lâu thì anh tới được?',
  'Có thương lượng bớt được không ạ?',
  'Anh mang sẵn đồ nghề nhé.',
];

export default function ChatScreen({ route }: Props) {
  const { role } = useAuthStore();
  const { chatMessages, sendMessage } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [accepted, setAccepted] = useState(false);

  const isCustomer = role === 'customer';
  const partnerName = route?.params?.name || (isCustomer ? 'AquaFix Plumbing' : 'Alex Trần');
  const partnerInitials = isCustomer ? 'AF' : 'AT';
  const partnerSub = isCustomer ? 'Thường phản hồi sau 5 phút' : 'Khách hàng · Quận 1';

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.from === 'me';

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
        {item.quote ? (
          /* Embedded Quote Card in Chat matching ai-fe */
          <View style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <Icon name="quote" size={15} color={Colors.primary[700]} />
              <Text style={styles.quoteTag}>BÁO GIÁ DỊCH VỤ</Text>
            </View>
            <View style={styles.quoteBody}>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Tiền công thợ</Text>
                <Text style={styles.quoteVal}>{formatVND(item.quote.laborFee)}</Text>
              </View>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Vật tư / phụ tùng</Text>
                <Text style={styles.quoteVal}>{formatVND(item.quote.materialFee)}</Text>
              </View>

              <View style={styles.quoteDivider} />

              <View style={styles.quoteTotalRow}>
                <Text style={styles.quoteTotalLabel}>Tổng cộng</Text>
                <Text style={styles.quoteTotalVal}>
                  {formatVND(item.quote.laborFee + item.quote.materialFee)}
                </Text>
              </View>

              <View style={styles.quoteArrivalRow}>
                <Icon name="clock" size={12} color={Colors.primary[600]} />
                <Text style={styles.quoteArrivalText}>
                  Có mặt lúc: <Text style={styles.quoteArrivalBold}>{item.quote.arrival}</Text>
                </Text>
              </View>

              {isCustomer && (
                accepted ? (
                  <View style={styles.quoteAcceptedBadge}>
                    <Icon name="check" size={14} color={Colors.primary[600]} />
                    <Text style={styles.quoteAcceptedText}>Đã chấp nhận báo giá</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.quoteAcceptBtn}
                    onPress={() => {
                      setAccepted(true);
                      Alert.alert('Đã chốt giá', 'Bạn đã đồng ý với mức giá trong báo giá này.');
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.quoteAcceptBtnText}>Chấp nhận báo giá</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
              {item.text}
            </Text>
            <View style={styles.timeRow}>
              <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextThem]}>
                {item.time}
              </Text>
              {isMe && <Icon name="check" size={11} color={Colors.neutral[200]} />}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Partner Header Bar matching ai-fe */}
      <View style={styles.partnerHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{partnerInitials}</Text>
        </View>
        <View style={styles.partnerInfo}>
          <Text style={styles.partnerName} numberOfLines={1}>
            {partnerName}
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>{partnerSub}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => Alert.alert('Gọi điện', `Đang gọi cho ${partnerName}...`)}
        >
          <Icon name="phone" size={18} color={Colors.neutral[600]} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={chatMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.dateDivider}>
              <Text style={styles.dateDividerText}>Hôm nay</Text>
            </View>
          }
        />

        {/* Quick replies */}
        <View style={styles.quickRepliesContainer}>
          <FlatList
            horizontal
            data={QUICK_REPLIES}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRepliesList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.quickReplyChip}
                onPress={() => handleQuickReply(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickReplyText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Composer Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={Colors.neutral[400]}
            value={inputText}
            onChangeText={setInputText}
            style={styles.textInput}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <Icon name="send" size={16} color={Colors.neutral[0]} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  // Partner Header
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.primary[700],
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[500],
  },
  statusText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.primary[600],
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  listContent: {
    padding: Space.md,
    paddingBottom: Space.sm,
    gap: Space.md,
  },
  dateDivider: {
    alignSelf: 'center',
    backgroundColor: Colors.neutral[200],
    paddingHorizontal: Space.md,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginBottom: Space.sm,
  },
  dateDividerText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.neutral[600],
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.xl,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
    ...Shadow.sm,
  },
  bubbleMe: {
    backgroundColor: Colors.primary[500],
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.neutral[0],
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  bubbleText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: Colors.neutral[0],
  },
  bubbleTextThem: {
    color: Colors.neutral[900],
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 4,
  },
  timeText: {
    fontFamily: FontFamily.regular,
    fontSize: 9,
  },
  timeTextMe: {
    color: Colors.transparent.white85,
  },
  timeTextThem: {
    color: Colors.neutral[400],
  },
  // Quote Card matching ai-fe
  quoteCard: {
    width: '82%',
    borderRadius: Radius.xl,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    overflow: 'hidden',
    ...Shadow.sm,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Space.md,
    paddingVertical: 8,
  },
  quoteTag: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.neutral[700],
    letterSpacing: 0.5,
  },
  quoteBody: {
    padding: Space.md,
    gap: 4,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quoteLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
  },
  quoteVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.neutral[800],
  },
  quoteDivider: {
    height: 1,
    backgroundColor: Colors.neutral[200],
    marginVertical: 4,
  },
  quoteTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteTotalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
  },
  quoteTotalVal: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.primary[600],
  },
  quoteArrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  quoteArrivalText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.neutral[500],
  },
  quoteArrivalBold: {
    fontFamily: FontFamily.semiBold,
    color: Colors.neutral[800],
  },
  quoteAcceptBtn: {
    backgroundColor: Colors.accent[500],
    borderRadius: Radius.lg,
    paddingVertical: Space.sm,
    alignItems: 'center',
    marginTop: Space.sm,
  },
  quoteAcceptBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.neutral[900],
  },
  quoteAcceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.primary[50],
    paddingVertical: Space.sm - 2,
    borderRadius: Radius.lg,
    marginTop: Space.sm,
  },
  quoteAcceptedText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary[700],
  },
  // Quick replies
  quickRepliesContainer: {
    backgroundColor: Colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingVertical: 8,
  },
  quickRepliesList: {
    paddingHorizontal: Space.md,
    gap: Space.sm,
  },
  quickReplyChip: {
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    paddingHorizontal: Space.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  quickReplyText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[700],
  },
  // Input bar
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    gap: Space.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    borderRadius: Radius.full,
    paddingHorizontal: Space.lg,
    paddingVertical: Platform.OS === 'ios' ? Space.sm : 6,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[900],
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
