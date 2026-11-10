import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Radius, Space } from '../../constants/spacing';
import { Header } from '../../components/layout/Header';
import { Icon } from '../../components/ui/Icon';
import { MainTabNavigationProp } from '../../types/navigation';

type Props = {
  navigation: MainTabNavigationProp<'Messages'>;
};

interface ChatSummary {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

export default function MessageListScreen({ navigation }: Props) {
  const chats: ChatSummary[] = [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Tin nhắn" rightIcon="search" />
      
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, chats.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <View style={styles.emptyIconCircle}>
              <Icon name="chat" size={32} color={Colors.neutral[400]} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện nào</Text>
            <Text style={styles.emptySub}>
              Backend hiện chưa hỗ trợ API trò chuyện.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Chat', { name: item.name })}
          >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              {item.online && <View style={styles.onlineBadge} />}
            </View>

            {/* Info */}
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.chatTime}>{item.time}</Text>
              </View>
              <View style={styles.chatMessageRow}>
                <Text 
                  style={[styles.chatMessage, item.unread > 0 && styles.chatMessageUnread]} 
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Space.xl,
  },
  emptyWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.xl,
    gap: Space.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.neutral[800],
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
  },
  chatItem: {
    flexDirection: 'row',
    padding: Space.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
    alignItems: 'center',
    gap: Space.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
  },
  avatarFallback: {
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.primary[700],
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    backgroundColor: Colors.semantic.success,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.neutral[0],
  },
  chatInfo: {
    flex: 1,
    gap: 4,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.neutral[900],
    flex: 1,
  },
  chatTime: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.neutral[400],
  },
  chatMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Space.sm,
  },
  chatMessage: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.neutral[500],
    flex: 1,
  },
  chatMessageUnread: {
    fontFamily: FontFamily.medium,
    color: Colors.neutral[900],
  },
  unreadBadge: {
    backgroundColor: Colors.primary[500],
    borderRadius: Radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.neutral[0],
  },
});
