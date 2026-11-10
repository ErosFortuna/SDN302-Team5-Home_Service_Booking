import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Space } from '../../constants/spacing';
import { Icon } from '../../components/ui';

export default function ChatScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Icon name="chat" size={36} color={Colors.neutral[400]} />
        <Text style={styles.title}>Tin nhắn chưa khả dụng</Text>
        <Text style={styles.description}>
          Backend hiện chưa cung cấp API trò chuyện. Tin nhắn sẽ hiển thị tại đây khi tính năng được hỗ trợ.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.neutral[50] },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.xl, gap: Space.md },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.neutral[800] },
  description: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 21, color: Colors.neutral[500], textAlign: 'center' },
});
