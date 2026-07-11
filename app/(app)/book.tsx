import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  setQuietPage,
  fetchUserPushToken,
} from '@/lib/book';
import { savePhotoToDevice } from '@/lib/storage';
import { registerMemoryTask } from '@/lib/memories';
import {
  TimeLock,
  subscribeToTimeLocks,
  checkAndUnlockTimeLocks,
} from '@/lib/timelocks';
import { FutureLetter, subscribeToLetters, checkAndUnlockLetters } from '@/lib/letters';
import { sendTimeLockNotification, sendLetterNotification } from '@/lib/notifications';
import { recordInteraction, shouldActivateAmbient } from '@/lib/ambient';
import { getCurrentSeason, SeasonalTheme } from '@/lib/seasons';
import { playQuietSound, stopQuietSound } from '@/lib/quietSound';
import { BookPage } from '@/components/BookPage';
import { QuietPage } from '@/components/QuietPage';
import { TimeLockPage } from '@/components/TimeLockPage';
import { LetterPage } from '@/components/LetterPage';
import { PageFlip } from '@/components/PageFlip';
import { PartnerAvatar } from '@/components/PartnerAvatar';
import { BreathingDot } from '@/components/BreathingDot';
import { ErrorBar } from '@/components/ErrorBar';
import { PhotoViewer } from '@/components/PhotoViewer';
import { BottomSheet, SheetAction } from '@/components/BottomSheet';
import { Logo } from '@/components/Logo';
import { RadialBackdrop } from '@/components/RadialBackdrop';
import { AmbientMode } from '@/components/AmbientMode';

type PageItem =
  | { kind: 'quiet'; key: string; date: number; photo: BookPhoto }
  | { kind: 'photo'; key: string; date: number; photo: BookPhoto }
  | { kind: 'timelock'; key: string; date: number; lock: TimeLock }
  | { kind: 'letter'; key: string; date: number; letter: FutureLetter };

function tsMillis(ts: { toMillis?: () => number } | null | undefined): number {
  try {
    return ts?.toMillis ? ts.toMillis() : 0;
  } catch {
    return 0;
  }
}

export default function BookScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, bookId } = useAuth();
  const { photos, book, partner, partnerOnline, loading, error, retry } = useBook(
    bookId,
    user?.uid
  );
  const params = useLocalSearchParams<{ focus?: string }>();

  const listRef = useRef<FlatList<PageItem>>(null);
  const [index, setIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const [viewer, setViewer] = useState<BookPhoto | null>(null);
  const [sheetPhoto, setSheetPhoto] = useState<BookPhoto | null>(null);
  const [captionPhoto, setCaptionPhoto] = useState<BookPhoto | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<Set<string>>(new Set());
  const [timeLocks, setTimeLocks] = useState<TimeLock[]>([]);
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [ambientVisible, setAmbientVisible] = useState(false);

  const season = useMemo(() => getCurrentSeason(), []);
  const seasonTheme = SeasonalTheme[season];

  // Keep the on-device "on this day" task pointed at the current book.
  useEffect(() => {
    if (bookId) registerMemoryTask(bookId, partner?.name ?? 'your partner');
  }, [bookId, partner?.name]);

  // Time-locked capsules and letters, streamed live.
  useEffect(() => {
    if (!bookId) return;
    return subscribeToTimeLocks(bookId, setTimeLocks);
  }, [bookId]);
  useEffect(() => {
    if (!bookId) return;
    return subscribeToLetters(bookId, setLetters);
  }, [bookId]);

  // On mount, flip any due capsules/letters open and celebrate the first one.
  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const [unlockedLocks, unlockedLetters] = await Promise.all([
        checkAndUnlockTimeLocks(bookId),
        checkAndUnlockLetters(bookId),
      ]);
      const ids = new Set<string>();
      unlockedLocks.forEach((l) => ids.add(`lock-${l.id}`));
      unlockedLetters.forEach((l) => ids.add(`letter-${l.id}`));
      if (ids.size === 0) return;
      setJustUnlocked(ids);

      if (partner) {
        const token = await fetchUserPushToken(partner.uid).catch(() => null);
        if (token) {
          if (unlockedLocks.length > 0) sendTimeLockNotification(token).catch(() => {});
          if (unlockedLetters.length > 0) sendLetterNotification(token).catch(() => {});
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // Deep-link: a tapped postcard notification passes ?focus=<photoId>.
  useEffect(() => {
    if (!params.focus) return;
    setRevealKey(params.focus);
  }, [params.focus]);

  // Ambient mode: check idle state every 5s.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (await shouldActivateAmbient()) setAmbientVisible(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const pageItems = useMemo<PageItem[]>(() => {
    const items: PageItem[] = [];
    if (book?.quietPagePhotoId) {
      const qp = photos.find((p) => p.id === book.quietPagePhotoId);
      if (qp) items.push({ kind: 'quiet', key: `quiet-${qp.id}`, date: -1, photo: qp });
    }
    const regular: PageItem[] = photos.map((p) => ({
      kind: 'photo',
      key: p.id,
      date: tsMillis(p.createdAt),
      photo: p,
    }));
    const locks: PageItem[] = timeLocks.map((l) => ({
      kind: 'timelock',
      key: `lock-${l.id}`,
      date: tsMillis(l.createdAt),
      lock: l,
    }));
    const letterItems: PageItem[] = letters.map((l) => ({
      kind: 'letter',
      key: `letter-${l.id}`,
      date: tsMillis(l.createdAt),
      letter: l,
    }));
    const merged = [...regular, ...locks, ...letterItems].sort((a, b) => a.date - b.date);
    return [...items, ...merged];
  }, [photos, timeLocks, letters, book?.quietPagePhotoId]);

  // Scroll to a revealed item once the list knows about it.
  useEffect(() => {
    if (!revealKey) return;
    const target = pageItems.findIndex((p) => p.key === revealKey || p.key.endsWith(revealKey));
    if (target >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: target, animated: true });
      });
    }
  }, [revealKey, pageItems]);

  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const i = viewableItems[0].index;
      setIndex(i);
      const item = pageItems[i];
      if (item?.kind === 'quiet') {
        playQuietSound().catch(() => {});
      } else {
        stopQuietSound().catch(() => {});
      }
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

  const lockInTime = (photo: BookPhoto) => {
    setSheetPhoto(null);
    router.push(`/timelock?source=existing&photoId=${photo.id}` as any);
  };

  const setAsQuietPage = (photo: BookPhoto) => {
    setSheetPhoto(null);
    Alert.alert(
      'Set as the Quiet Page?',
      'This will become your single quiet page. Your other favorites stay in the book.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set',
          onPress: () => {
            if (bookId) setQuietPage(bookId, photo.id).catch(() => {});
          },
        },
      ]
    );
  };

  const writeALetter = () => {
    setSheetPhoto(null);
    router.push('/future-letter' as any);
  };

  const pageWidth = width - 44;
  const pageHeight = Math.max(320, listHeight - 44);
  const partnerForHeader = partner ?? null;

  // ── Header ─────────────────────────────────────────────────
  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerBrand}>
        <Logo size={24} />
      </View>
      <Pressable onPress={() => router.push('/settings' as any)} hitSlop={10}>
        {partnerForHeader ? (
          <PartnerAvatar
            name={partnerForHeader.name}
            color={partnerForHeader.color}
            size={30}
            online={partnerOnline}
          />
        ) : (
          <View style={styles.selfAvatarFallback}>
            <Ionicons name="person-outline" size={16} color={Colors.gold} />
          </View>
        )}
      </Pressable>
    </View>
  );

  // ── Loading ────────────────────────────────────────────────
  if (loading && pageItems.length === 0) {
    return (
      <View style={styles.root} onTouchStart={() => recordInteraction()}>
        <RadialBackdrop seasonTint={seasonTheme.tint} />
        {header}
        <View style={styles.center}>
          <BreathingDot />
          <Text style={styles.loadingText}>Opening your book…</Text>
        </View>
      </View>
    );
  }

  // ── Empty ──────────────────────────────────────────────────
  if (pageItems.length === 0) {
    return (
      <View style={styles.root} onTouchStart={() => recordInteraction()}>
        <RadialBackdrop seasonTint={seasonTheme.tint} />
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
    <View style={styles.root} onTouchStart={() => recordInteraction()}>
      <RadialBackdrop seasonTint={seasonTheme.tint} />
      {header}

      <View style={styles.listArea} onLayout={onListLayout}>
        {listHeight > 0 && (
          <FlatList
            ref={listRef}
            data={pageItems}
            keyExtractor={(p) => p.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewRef.current}
            viewabilityConfig={viewConfigRef.current}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            windowSize={3}
            maxToRenderPerBatch={3}
            removeClippedSubviews
            onScrollToIndexFailed={({ index: i }) => {
              setTimeout(() => listRef.current?.scrollToIndex({ index: i, animated: false }), 120);
            }}
            renderItem={({ item }) => {
              const unlocked = justUnlocked.has(item.key);
              return (
                <View style={[styles.pageSlot, { width }]}>
                  <View style={styles.pageStackLeft} pointerEvents="none">
                    {[0.5, 0.35, 0.22, 0.12].map((op, i) => (
                      <View
                        key={i}
                        style={[styles.spineLine, { backgroundColor: seasonTheme.accent, opacity: op }]}
                      />
                    ))}
                  </View>
                  <View style={styles.pageStackRight} pointerEvents="none">
                    {[0.5, 0.3, 0.15].map((op, i) => (
                      <View key={i} style={[styles.pageEdgeLine, { opacity: op }]} />
                    ))}
                  </View>

                  <PageFlip play={item.kind === 'photo' && revealKey === item.photo.id} style={styles.pageFlip}>
                    {item.kind === 'quiet' && (
                      <QuietPage photo={item.photo} width={pageWidth} height={pageHeight} onPress={() => setViewer(item.photo)} />
                    )}
                    {item.kind === 'photo' && (
                      <BookPage
                        photo={item.photo}
                        width={pageWidth}
                        height={pageHeight}
                        onPressPhoto={() => setViewer(item.photo)}
                        onLongPress={() => setSheetPhoto(item.photo)}
                        onLongPressBackground={writeALetter}
                        onSaveCaption={(c) => saveCaption(item.photo, c)}
                      />
                    )}
                    {item.kind === 'timelock' && (
                      <TimeLockPage lock={item.lock} width={pageWidth} height={pageHeight} justUnlocked={unlocked} />
                    )}
                    {item.kind === 'letter' && (
                      <LetterPage letter={item.letter} width={pageWidth} height={pageHeight} justUnlocked={unlocked} />
                    )}
                  </PageFlip>
                </View>
              );
            }}
          />
        )}

        <View style={[styles.indicator, { bottom: 10 }]}>
          <Text style={styles.indicatorText}>
            {index + 1} · {pageItems.length}
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

      {/* Ambient mode */}
      <AmbientMode
        visible={ambientVisible}
        photos={photos}
        partnerOnline={partnerOnline}
        onDismiss={() => {
          setAmbientVisible(false);
          recordInteraction();
        }}
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
              icon="lock-closed-outline"
              label="Lock in time"
              onPress={() => lockInTime(sheetPhoto)}
            />
            <SheetAction
              icon="star-outline"
              label="Set as the Quiet Page"
              onPress={() => setAsQuietPage(sheetPhoto)}
            />
            <SheetAction icon="document-text-outline" label="Write a letter" onPress={writeALetter} />
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
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerBrand: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  selfAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
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
  pageStackLeft: {
    position: 'absolute',
    left: 10,
    top: '10%',
    bottom: '10%',
    flexDirection: 'row',
    gap: 2,
  },
  spineLine: {
    width: 1,
  },
  pageStackRight: {
    position: 'absolute',
    right: 10,
    top: '10%',
    bottom: '10%',
    flexDirection: 'row',
    gap: 2,
  },
  pageEdgeLine: {
    width: 0.5,
    backgroundColor: Colors.paperDark,
  },
  indicator: {
    position: 'absolute',
    alignSelf: 'center',
  },
  indicatorText: {
    fontFamily: 'Courier New',
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgba(201,169,110,0.8)',
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
