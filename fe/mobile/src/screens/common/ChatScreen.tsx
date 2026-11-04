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
import { ChatMessage } from '../../types';
import { Icon } from '../../components/ui';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';

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

  const isCustomer = role === 'customer';
  const partnerName = route?.params?.name || (isCustomer ? 'Thợ dịch vụ' : 'Khách hàng');
  const partnerInitials = partnerName.slice(0, 2).toUpperCase();
  const partnerSub = isCustomer ? 'Thường phản hồi sau 5 phút' : 'Khách hàng';

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
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Partner Header Bar */}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Bắt đầu cuộc trò chuyện với {partnerName}</Text>
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
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    gap: Space.sm,
    flexGrow: 1,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: Space.sm,
  },
  dateDividerText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
    backgroundColor: Colors.neutral[200],
    paddingHorizontal: Space.sm + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space['3xl'],
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[400],
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowThem: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.xl,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm + 2,
    gap: 4,
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
  },
  timeText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
  },
  timeTextMe: {
    color: Colors.transparent.white85,
  },
  timeTextThem: {
    color: Colors.neutral[400],
  },
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
