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
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';

const INITIAL_MESSAGES = [
  { id: '1', text: 'Chào anh, cho em hỏi chi phí sửa ống nước rò rỉ là bao nhiêu ạ?', sender: 'me', time: '10:00' },
  { id: '2', text: 'Chào bạn, thông thường là 150k - 200k tuỳ tình trạng nhé.', sender: 'other', time: '10:05' },
  { id: '3', text: 'Vâng, vậy anh qua xem giúp em nhé.', sender: 'me', time: '10:06' },
  { id: '4', text: 'Ok bạn, khoảng 14:00 chiều nay em ghé.', sender: 'other', time: '10:30' },
];

export default function ChatScreen({ route }: any) {
  const chatName = route?.params?.name || 'Nguyễn Văn An';
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages([
      ...messages,
      { id: Date.now().toString(), text: message, sender: 'me', time: 'Bây giờ' },
    ]);
    setMessage('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title={chatName} showBack rightIcon="phone" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isMe = item.sender === 'me';
            return (
              <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
                <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
                  {item.text}
                </Text>
                <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeOther]}>
                  {item.time}
                </Text>
              </View>
            );
          }}
        />

        {/* Input area */}
        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.attachBtn} accessibilityLabel="Đính kèm tệp">
            <Icon name="add" size={24} color={Colors.neutral[500]} />
          </TouchableOpacity>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>
          <TouchableOpacity 
            style={[styles.sendBtn, message.trim() ? styles.sendBtnActive : {}]}
            onPress={handleSend}
            disabled={!message.trim()}
            accessibilityLabel="Gửi tin nhắn"
          >
            <Icon name="share" size={20} color={message.trim() ? Colors.neutral[0] : Colors.neutral[400]} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  messageList: {
    padding: Space.lg,
    gap: Space.md,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Space.md,
    borderRadius: Radius.lg,
  },
  messageBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary[500],
    borderBottomRightRadius: 0,
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.neutral[0],
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  messageText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  messageTextMe: {
    color: Colors.neutral[0],
  },
  messageTextOther: {
    color: Colors.neutral[800],
  },
  messageTime: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeOther: {
    color: Colors.neutral[400],
  },
  
  inputArea: {
    flexDirection: 'row',
    padding: Space.md,
    backgroundColor: Colors.neutral[0],
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    gap: Space.sm,
  },
  attachBtn: {
    padding: Space.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    borderRadius: Radius.full,
    paddingHorizontal: Space.lg,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 44,
    maxHeight: 100,
  },
  input: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    maxHeight: 80,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: Colors.primary[500],
  },
});
