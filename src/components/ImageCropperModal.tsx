import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RotateCw, Check, X, RefreshCw, Crop as CropIcon, Image as ImageIcon } from 'lucide-react-native';
import * as ImageManipulator from 'expo-image-manipulator';

interface CropBox {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
}

type Mode = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'move' | null;

export interface ImageCropperModalProps {
  imageUri: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedUri: string) => void;
  onChangeImage?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ImageCropperModal({
  imageUri,
  isOpen,
  onClose,
  onCropComplete,
  onChangeImage,
}: ImageCropperModalProps) {
  const [rotation, setRotation] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [crop, setCrop] = useState<CropBox>({ x: 5, y: 10, width: 90, height: 80 });

  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({ width: 800, height: 1200 });
  const [containerLayout, setContainerLayout] = useState<{ width: number; height: number }>({
    width: SCREEN_WIDTH - 24,
    height: SCREEN_HEIGHT * 0.68,
  });

  const cropRef = useRef<CropBox>(crop);
  cropRef.current = crop;

  const startCropRef = useRef<CropBox>(crop);
  const activeModeRef = useRef<Mode>(null);

  // Load native dimensions using ImageManipulator on imageUri change
  useEffect(() => {
    if (imageUri) {
      setRotation(0);
      setCrop({ x: 5, y: 10, width: 90, height: 80 });

      ImageManipulator.manipulateAsync(imageUri, [], {})
        .then((info) => {
          if (info.width && info.height) {
            setImageSize({ width: info.width, height: info.height });
          }
        })
        .catch(() => {
          Image.getSize(
            imageUri,
            (w, h) => setImageSize({ width: w, height: h }),
            () => {}
          );
        });
    }
  }, [imageUri]);

  // Compute displayed image bounding box inside the preview container
  const isRotated = rotation === 90 || rotation === 270;
  const naturalW = isRotated ? imageSize.height : imageSize.width;
  const naturalH = isRotated ? imageSize.width : imageSize.height;

  const containerW = containerLayout.width || SCREEN_WIDTH - 24;
  const containerH = containerLayout.height || SCREEN_HEIGHT * 0.68;

  const scale = Math.min(containerW / (naturalW || 1), containerH / (naturalH || 1)) || 1;
  const displayW = Math.max(100, Math.round((naturalW || 1) * scale));
  const displayH = Math.max(100, Math.round((naturalH || 1) * scale));

  const displayWRef = useRef(displayW);
  displayWRef.current = displayW;
  const displayHRef = useRef(displayH);
  displayHRef.current = displayH;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setCrop({ x: 5, y: 10, width: 90, height: 80 });
  };

  const handleReset = () => {
    setCrop({ x: 5, y: 10, width: 90, height: 80 });
  };

  // Master PanResponder created ONCE via useRef so it is never re-instantiated or cancelled mid-gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        const curW = displayWRef.current || 1;
        const curH = displayHRef.current || 1;
        const curCrop = cropRef.current;

        const touchX = evt.nativeEvent.locationX;
        const touchY = evt.nativeEvent.locationY;

        const boxL = (curCrop.x / 100) * curW;
        const boxT = (curCrop.y / 100) * curH;
        const boxW = (curCrop.width / 100) * curW;
        const boxH = (curCrop.height / 100) * curH;
        const boxR = boxL + boxW;
        const boxB = boxT + boxH;

        const R = 38; // 38px touch radius for effortless corner and edge detection

        let mode: Mode = null;

        // 1. Check 4 Corners
        if (Math.abs(touchX - boxL) <= R && Math.abs(touchY - boxT) <= R) {
          mode = 'nw';
        } else if (Math.abs(touchX - boxR) <= R && Math.abs(touchY - boxT) <= R) {
          mode = 'ne';
        } else if (Math.abs(touchX - boxL) <= R && Math.abs(touchY - boxB) <= R) {
          mode = 'sw';
        } else if (Math.abs(touchX - boxR) <= R && Math.abs(touchY - boxB) <= R) {
          mode = 'se';
        }
        // 2. Check 4 Edges
        else if (Math.abs(touchY - boxT) <= R && touchX >= boxL - R && touchX <= boxR + R) {
          mode = 'n';
        } else if (Math.abs(touchY - boxB) <= R && touchX >= boxL - R && touchX <= boxR + R) {
          mode = 's';
        } else if (Math.abs(touchX - boxL) <= R && touchY >= boxT - R && touchY <= boxB + R) {
          mode = 'w';
        } else if (Math.abs(touchX - boxR) <= R && touchY >= boxT - R && touchY <= boxB + R) {
          mode = 'e';
        }
        // 3. Check Inside Box (Move)
        else if (touchX >= boxL && touchX <= boxR && touchY >= boxT && touchY <= boxB) {
          mode = 'move';
        }

        activeModeRef.current = mode;
        startCropRef.current = { ...curCrop };
      },
      onPanResponderMove: (_evt, gestureState) => {
        const mode = activeModeRef.current;
        if (!mode) return;

        const curW = displayWRef.current || 1;
        const curH = displayHRef.current || 1;
        const start = startCropRef.current;

        const dxPercent = (gestureState.dx / curW) * 100;
        const dyPercent = (gestureState.dy / curH) * 100;
        const minSize = 6; // minimum 6% size

        let nextX = start.x;
        let nextY = start.y;
        let nextW = start.width;
        let nextH = start.height;

        if (mode === 'move') {
          nextX = Math.max(0, Math.min(100 - start.width, start.x + dxPercent));
          nextY = Math.max(0, Math.min(100 - start.height, start.y + dyPercent));
        } else if (mode === 'nw') {
          // Top-Left: adjusts top & left
          const targetX = Math.max(0, Math.min(start.x + start.width - minSize, start.x + dxPercent));
          nextW = start.width - (targetX - start.x);
          nextX = targetX;

          const targetY = Math.max(0, Math.min(start.y + start.height - minSize, start.y + dyPercent));
          nextH = start.height - (targetY - start.y);
          nextY = targetY;
        } else if (mode === 'ne') {
          // Top-Right: adjusts top & right
          const targetY = Math.max(0, Math.min(start.y + start.height - minSize, start.y + dyPercent));
          nextH = start.height - (targetY - start.y);
          nextY = targetY;

          nextW = Math.max(minSize, Math.min(100 - start.x, start.width + dxPercent));
        } else if (mode === 'sw') {
          // Bottom-Left: adjusts bottom & left
          const targetX = Math.max(0, Math.min(start.x + start.width - minSize, start.x + dxPercent));
          nextW = start.width - (targetX - start.x);
          nextX = targetX;

          nextH = Math.max(minSize, Math.min(100 - start.y, start.height + dyPercent));
        } else if (mode === 'se') {
          // Bottom-Right: adjusts bottom & right
          nextW = Math.max(minSize, Math.min(100 - start.x, start.width + dxPercent));
          nextH = Math.max(minSize, Math.min(100 - start.y, start.height + dyPercent));
        } else if (mode === 'n') {
          // Top edge
          const targetY = Math.max(0, Math.min(start.y + start.height - minSize, start.y + dyPercent));
          nextH = start.height - (targetY - start.y);
          nextY = targetY;
        } else if (mode === 's') {
          // Bottom edge
          nextH = Math.max(minSize, Math.min(100 - start.y, start.height + dyPercent));
        } else if (mode === 'w') {
          // Left edge
          const targetX = Math.max(0, Math.min(start.x + start.width - minSize, start.x + dxPercent));
          nextW = start.width - (targetX - start.x);
          nextX = targetX;
        } else if (mode === 'e') {
          // Right edge
          nextW = Math.max(minSize, Math.min(100 - start.x, start.width + dxPercent));
        }

        const updated: CropBox = {
          x: Math.round(nextX * 10) / 10,
          y: Math.round(nextY * 10) / 10,
          width: Math.round(nextW * 10) / 10,
          height: Math.round(nextH * 10) / 10,
        };

        cropRef.current = updated;
        setCrop(updated);
      },
      onPanResponderRelease: () => {
        activeModeRef.current = null;
      },
      onPanResponderTerminate: () => {
        activeModeRef.current = null;
      },
    })
  ).current;

  const handleApplyCrop = async () => {
    if (!imageUri) return;
    try {
      setIsProcessing(true);

      // Rotate image first if needed to get true post-rotation pixel width/height
      const imageInfo = await ImageManipulator.manipulateAsync(
        imageUri,
        rotation !== 0 ? [{ rotate: rotation }] : [],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      const effectiveW = imageInfo.width;
      const effectiveH = imageInfo.height;

      // Map percentage coordinates to exact pixel values
      const currentCrop = cropRef.current;
      const originX = Math.max(0, Math.round((currentCrop.x / 100) * effectiveW));
      const originY = Math.max(0, Math.round((currentCrop.y / 100) * effectiveH));
      const cropW = Math.max(40, Math.min(effectiveW - originX, Math.round((currentCrop.width / 100) * effectiveW)));
      const cropH = Math.max(40, Math.min(effectiveH - originY, Math.round((currentCrop.height / 100) * effectiveH)));

      console.log('[ImageCropper] Final pixel crop:', {
        effectiveW,
        effectiveH,
        originX,
        originY,
        cropW,
        cropH,
      });

      const cropped = await ImageManipulator.manipulateAsync(
        imageInfo.uri,
        [
          {
            crop: {
              originX,
              originY,
              width: cropW,
              height: cropH,
            },
          },
        ],
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
      );

      setIsProcessing(false);
      onCropComplete(cropped.uri);
    } catch (err) {
      console.error('[ImageCropperModal] Cropping failed:', err);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageUri) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A1D16" />

        {/* Header (Dhruva Parity) */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <CropIcon size={18} color="#10B981" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Crop Aadhaar Card</Text>
              <Text style={styles.headerSubtitle}>Adjust corners & edges around card</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={20} color="#E0E0E0" />
          </TouchableOpacity>
        </View>

        {/* Cropper Workspace */}
        <View
          style={styles.workspace}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setContainerLayout({ width, height });
            }
          }}
        >
          <View style={[styles.imageWrapper, { width: displayW, height: displayH }]}>
            {/* Displayed Image */}
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.previewImage,
                {
                  transform: [{ rotate: `${rotation}deg` }],
                  width: displayW,
                  height: displayH,
                },
              ]}
              resizeMode="contain"
            />

            {/* Interactive Crop Frame Visual */}
            <View
              style={[
                styles.cropBox,
                {
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.width}%`,
                  height: `${crop.height}%`,
                },
              ]}
              pointerEvents="none"
            >
              {/* 3x3 Grid Overlay */}
              <View style={styles.gridOverlay}>
                <View style={styles.gridRow}>
                  <View style={[styles.gridCell, styles.borderR, styles.borderB]} />
                  <View style={[styles.gridCell, styles.borderR, styles.borderB]} />
                  <View style={[styles.gridCell, styles.borderB]} />
                </View>
                <View style={styles.gridRow}>
                  <View style={[styles.gridCell, styles.borderR, styles.borderB]} />
                  <View style={[styles.gridCell, styles.borderR, styles.borderB]} />
                  <View style={[styles.gridCell, styles.borderB]} />
                </View>
                <View style={styles.gridRow}>
                  <View style={[styles.gridCell, styles.borderR]} />
                  <View style={[styles.gridCell, styles.borderR]} />
                  <View style={styles.gridCell} />
                </View>
              </View>

              {/* 4 Corner Dots */}
              <View style={[styles.cornerHandle, styles.cornerNW]}>
                <View style={styles.cornerDot} />
              </View>
              <View style={[styles.cornerHandle, styles.cornerNE]}>
                <View style={styles.cornerDot} />
              </View>
              <View style={[styles.cornerHandle, styles.cornerSW]}>
                <View style={styles.cornerDot} />
              </View>
              <View style={[styles.cornerHandle, styles.cornerSE]}>
                <View style={styles.cornerDot} />
              </View>

              {/* 4 Edge Bars */}
              <View style={[styles.edgeHandle, styles.edgeN]}>
                <View style={styles.edgeBarH} />
              </View>
              <View style={[styles.edgeHandle, styles.edgeS]}>
                <View style={styles.edgeBarH} />
              </View>
              <View style={[styles.edgeHandle, styles.edgeW]}>
                <View style={styles.edgeBarV} />
              </View>
              <View style={[styles.edgeHandle, styles.edgeE]}>
                <View style={styles.edgeBarV} />
              </View>
            </View>

            {/* Master Touch Surface Overlay: Handles all corner, edge, and move drags smoothly */}
            <View
              style={StyleSheet.absoluteFill}
              {...panResponder.panHandlers}
            />
          </View>
        </View>

        {/* Toolbar Controls */}
        <View style={styles.toolbar}>
          <View style={styles.toolRow}>
            {onChangeImage && (
              <TouchableOpacity onPress={onChangeImage} style={styles.toolBtn} activeOpacity={0.8}>
                <ImageIcon size={14} color="#FFF" />
                <Text style={styles.toolBtnText}>Change</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleRotate} style={styles.toolBtn} activeOpacity={0.8}>
              <RotateCw size={14} color="#FFF" />
              <Text style={styles.toolBtnText}>Rotate</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReset} style={styles.toolBtn} activeOpacity={0.8}>
              <RefreshCw size={13} color="#D0D0D0" />
              <Text style={styles.toolBtnText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApplyCrop}
              disabled={isProcessing}
              style={styles.applyBtn}
              activeOpacity={0.85}
            >
              {isProcessing ? (
                <>
                  <ActivityIndicator size="small" color="#0A1D16" />
                  <Text style={styles.applyBtnText}>Cropping...</Text>
                </>
              ) : (
                <>
                  <Check size={16} color="#0A1D16" strokeWidth={3} />
                  <Text style={styles.applyBtnText}>Crop & Scan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050D0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0A1D16',
    borderBottomWidth: 1,
    borderBottomColor: '#123D2E',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#112C22',
    borderWidth: 1,
    borderColor: '#C5A88050',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#9FE1C7',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050D0A',
    padding: 12,
  },
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  previewImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cropBox: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#10B981', // Vibrant green 4 lines box
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#10B981',
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
  },
  borderR: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.3)',
  },
  borderB: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  cornerHandle: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  cornerDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981', // Matching green corner dots
    borderWidth: 2.5,
    borderColor: '#FFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  cornerNW: { top: -18, left: -18 },
  cornerNE: { top: -18, right: -18 },
  cornerSW: { bottom: -18, left: -18 },
  cornerSE: { bottom: -18, right: -18 },

  edgeHandle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  edgeN: {
    top: -15,
    left: '50%',
    marginLeft: -25,
    width: 50,
    height: 30,
  },
  edgeS: {
    bottom: -15,
    left: '50%',
    marginLeft: -25,
    width: 50,
    height: 30,
  },
  edgeW: {
    left: -15,
    top: '50%',
    marginTop: -25,
    width: 30,
    height: 50,
  },
  edgeE: {
    right: -15,
    top: '50%',
    marginTop: -25,
    width: 30,
    height: 50,
  },
  edgeBarH: {
    width: 30,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#0A1D16',
    elevation: 3,
  },
  edgeBarV: {
    width: 6,
    height: 30,
    borderRadius: 3,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#0A1D16',
    elevation: 3,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0A1D16',
    borderTopWidth: 1,
    borderTopColor: '#123D2E',
    gap: 10,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toolBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  applyBtnText: {
    color: '#050D0A',
    fontSize: 12,
    fontWeight: '800',
  },
});
