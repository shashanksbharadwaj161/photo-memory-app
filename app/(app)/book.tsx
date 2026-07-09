import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
  Alert,
  Modal,
  TextInput,
  ViewToken,
  LayoutChangeEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/hooks/useAuth';
import { useBook } from '@/hooks/useBook';
import {
  BookPhoto,
  updateCaption,
  toggleFavorite,
  deletePhoto,
} from '@/lib/book';
import { savePhotoToDevice } from '@/lib/storage';
import { registerMemoryTask } from '@/lib/memories';
import { BookPage } from '@/components/BookPage';
import { PageFlip } from '@/components/PageFlip';
import { PartnerAvatar } from '@/components/PartnerAvatar';
import { BreathingDot } from '@/components/BreathingDot';
import { ErrorBar } from '@/components/ErrorBar';
import { PhotoViewer } from '@/components/PhotoViewer';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { Logo } from '@/components/Logo';

export default function BookScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, bookId } = useAuth();
  const { photos, book, partner, partnerOnline, loading, error, retry } = useBook(
    bookId,
    user?.uid
  );
  const params = useLocalSearchParams<{ focus?: string }>();

  const listRef = useRef<FlatList<BookPhoto>>(null);
  const [index, setIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const [viewer, setViewer] = useState<BookPhoto | null>(null);
  const [sheetPhoto, setSheetPhoto] = useState<BookPhoto | null>(null);
  const [captionPhoto, setCaptionPhoto] = useState<BookPhoto | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [revealIndex, setRevealIndex] = useState<number | null>(null);

  // Keep the on-device "on this day" task pointed at the current book.
  useEffect(() => {
    if (bookId) registerMemoryTask(bookId, partner?.name ?? 'your partner');
  }, [bookId, partner?.name]);

  // Deep-link: a tapped postcard notification passes ?focus=<photoId>.
  useEffect(() => {
    if (!params.focus || photos.length === 0) return;
    const target = photos.findIndex((p) => p.id === params.focus);
    if (target >= 0) {
      setRevealIndex(target);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: target, animated: true });
      });
    }
  }, [params.focus, photos]);

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setIndex(viewableItems[0].index);
    }
  });
  const viewConfigRef = useRef({ itemVisiblePercentThreshold: 60 });

  const onListLayout = (e: LayoutChangeEvent) => setListHeight(e.nativeEvent.layout.height);

  const saveCaption = useCallback(
    (photo: BookPhoto, caption: string) => {
      if (bookId) updateCaption(bookId, photo.id, caption).catch(() => {});
    },
    [bookId]
  );

  const onToggleFavorite = useCallback(
    (photo: BookPhoto) => {
      if (bookId) toggleFavorite(bookId, photo.id, !photo.isFavorite).catch(() => {});
    },
    [bookId]
  );

  const confirmDelete = (photo: BookPhoto) => {
    setSheetPhoto(null);
    Alert.alert('Delete this memory?', 'This removes it from your book for both of you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (bookId) deletePhoto(bookId, photo).catch(() => {});
        },
      },
    ]);
  };

  const exportOne = async (photo: BookPhoto) => {
    setSheetPhoto(null);
    const ok = await savePhotoToDevice(photo.url, `locket_${photo.id}.jpg`);
    Alert.alert(
      ok ? 'Saved' : 'Permission needed',
      ok ? 'The photo is now in your gallery.' : 'Allow photo access to save memories to your phone.'
    );
  };

  const pageWidth = width - 44;
  const pageHeight = Math.max(320, listHeight - 44);

  // ── Header ─────────────────────────────────────────────────
  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.push('/settings' as any)} hitSlop={8} style={styles.headerBtn}>
        <Ionicons name="ellipsis-horizontal" size={24} color={Colors.gold} />
      </Pressable>

      <View style={styles.titleWrap}>
        <Text style={styles.title}>{book?.name ?? 'Locket'}</Text>
        {partner && (
          <View style={styles.partnerRow}>
            <PartnerAvatar name={partner.name} color={partner.color} size={18} online={partnerOnline} />
            <Text style={styles.partnerText}>
              {partnerOnline ? `${partner.name} is here` : partner.name}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={() => router.push('/(app)/camera' as any)}
        hitSlop={8}
        style={styles.headerBtn}
      >
        <Ionicons name="camera" size={26} color={Colors.gold} />
      </Pressable>
    </View>
  );

  // ── Loading ────────────────────────────────────────────────
  if (loading && photos.length === 0) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <BreathingDot />
          <Text style={styles.loadingText}>Opening your book…</Text>
        </View>
      </View>
    );
  }

  // ── Empty ──────────────────────────────────────────────────
  if (photos.length === 0) {
    return (
      <View style={styles.root}>
        {header}
        <Animated.View entering={FadeIn} style={styles.empty}>
          <Logo size={92} />
          <Text style={styles.emptyTitle}>Your story starts here</Text>
          <Text style={styles.emptySub}>Take your first photo together ↓</Text>
          <Pressable
            onPress={() => router.push('/(app)/camera' as any)}
            style={styles.emptyArrow}
          >
            <BreathingDot size={54} color={Colors.gold} />
            <Ionicons name="camera" size={26} color={Colors.ink} style={styles.emptyArrowIcon} />
          </Pressable>
        </Animated.View>
        {error && <ErrorBar message={error} onRetry={retry} bottomInset={insets.bottom + 20} />}
      </View>
    );
  }

  // ── Book ───────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {header}

      <View style={styles.listArea} onLayout={onListLayout}>
        {listHeight > 0 && (
          <FlatList
            ref={listRef}
            data={photos}
            keyExtractor={(p) => p.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewRef.current}
            viewabilityConfig={viewConfigRef.current}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onScrollToIndexFailed={({ index: i }) => {
              setTimeout(() => listRef.current?.scrollToIndex({ index: i, animated: false }), 120);
            }}
            renderItem={({ item, index: i }) => (
              <View style={[styles.pageSlot, { width }]}>
                {/* page-thickness edge */}
                <View style={styles.pageStack} pointerEvents="none">
                  <View style={[styles.pageEdge, { opacity: 0.5 }]} />
                  <View style={[styles.pageEdge, { opacity: 0.3 }]} />
                  <View style={[styles.pageEdge, { opacity: 0.15 }]} />
                </View>
                <PageFlip play={revealIndex === i} style={styles.pageFlip}>
                  <BookPage
                    photo={item}
                    width={pageWidth}
                    height={pageHeight}
                    onPressPhoto={() => setViewer(item)}
                    onLongPress={() => setSheetPhoto(item)}
                    onSaveCaption={(c) => saveCaption(item, c)}
                  />
                </PageFlip>
              </View>
            )}
          />
        )}

        <View style={[styles.indicator, { bottom: 10 }]}>
          <Text style={styles.indicatorText}>
            {index + 1} / {photos.length}
          </Text>
        </View>
      </View>

      {error && <ErrorBar message={error} onRetry={retry} bottomInset={insets.bottom + 20} />}

      {/* Full-screen viewer */}
      <PhotoViewer
        photo={viewer}
        visible={!!viewer}
        onClose={() => setViewer(null)}
        onToggleFavorite={onToggleFavorite}
      />

      {/* Long-press actions */}
      <BottomSheet
        visible={!!sheetPhoto}
        onClose={() => setSheetPhoto(null)}
        title={sheetPhoto?.caption || 'This memory'}
      >
        {sheetPhoto && (
          <>
            <SheetAction
              icon="create-outline"
              label="Edit caption"
              onPress={() => {
                setCaptionDraft(sheetPhoto.caption);
                setCaptionPhoto(sheetPhoto);
                setSheetPhoto(null);
              }}
            />
            <SheetAction
              icon="mail-outline"
              label="Send as postcard"
              onPress={() => {
                const id = sheetPhoto.id;
                setSheetPhoto(null);
                router.push(`/postcard?photoId=${id}` as any);
              }}
            />
            <SheetAction
              icon={sheetPhoto.isFavorite ? 'heart' : 'heart-outline'}
              label={sheetPhoto.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              onPress={() => {
                onToggleFavorite(sheetPhoto);
                setSheetPhoto(null);
              }}
            />
            <SheetAction
              icon="download-outline"
              label="Save to phone"
              onPress={() => exportOne(sheetPhoto)}
            />
            <SheetAction
              icon="trash-outline"
              label="Delete"
              danger
              onPress={() => confirmDelete(sheetPhoto)}
            />
          </>
        )}
      </BottomSheet>

      {/* Caption editor */}
      <Modal
        visible={!!captionPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setCaptionPhoto(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.captionBackdrop} onPress={() => setCaptionPhoto(null)} />
        <View style={styles.captionCard}>
          <Text style={styles.captionTitle}>Caption</Text>
          <TextInput
            value={captionDraft}
            onChangeText={setCaptionDraft}
            placeholder="Say something…"
            placeholderTextColor={Colors.textMuted}
            style={styles.captionInput}
            multiline
            maxLength={140}
            autoFocus
          />
          <View style={styles.captionActions}>
            <Pressable onPress={() => setCaptionPhoto(null)} hitSlop={8}>
              <Text style={styles.captionCancel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (captionPhoto) saveCaption(captionPhoto, captionDraft.trim());
                setCaptionPhoto(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.captionSave}>Save</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 24,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  partnerText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 12,
    color: Colors.textMuted,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: Colors.textMuted,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 26,
    color: Colors.textOnInk,
    marginTop: 24,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.hand,
    fontSize: 22,
    color: Colors.textMuted,
    marginTop: 10,
  },
  emptyArrow: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyArrowIcon: {
    position: 'absolute',
  },
  listArea: {
    flex: 1,
  },
  pageSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageFlip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageStack: {
    position: 'absolute',
    right: 12,
    top: '10%',
    bottom: '10%',
    flexDirection: 'row',
  },
  pageEdge: {
    width: 3,
    marginLeft: 2,
    borderRadius: 2,
    backgroundColor: Colors.paperDark,
  },
  indicator: {
    position: 'absolute',
    alignSelf: 'center',
  },
  indicatorText: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 1,
  },
  captionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  captionCard: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '32%',
    backgroundColor: Colors.inkLight,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  captionTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 18,
    color: Colors.textOnInk,
    marginBottom: 12,
  },
  captionInput: {
    fontFamily: Fonts.hand,
    fontSize: 22,
    color: Colors.textOnInk,
    minHeight: 60,
    maxHeight: 140,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
    textAlignVertical: 'top',
  },
  captionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 26,
    marginTop: 18,
  },
  captionCancel: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.textMuted,
  },
  captionSave: {
    fontFamily: Fonts.serifBold,
    fontSize: 16,
    color: Colors.gold,
  },
});
