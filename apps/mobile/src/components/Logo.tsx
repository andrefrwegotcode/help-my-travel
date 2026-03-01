import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs, LinearGradient, Stop, Filter,
  FeGaussianBlur, FeComposite,
  Path, Circle, Rect, G, Line, Text as SvgText,
} from 'react-native-svg';
import { colors } from '../theme/colors';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  showTagline?: boolean;
  dark?: boolean;
}

const SIZES = {
  small: { icon: 48, fontSize: 16, tagline: 10 },
  medium: { icon: 80, fontSize: 22, tagline: 12 },
  large: { icon: 110, fontSize: 28, tagline: 13 },
};

function LogoIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 110 100" fill="none">
      <Defs>
        <LinearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FF6B35" />
          <Stop offset="100%" stopColor="#F7567C" />
        </LinearGradient>
        <LinearGradient id="bubbleGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#667EEA" />
          <Stop offset="100%" stopColor="#764BA2" />
        </LinearGradient>
      </Defs>

      {/* Map pin body */}
      <Path
        d="M55 10 C38 10 24 24 24 41 C24 62 55 95 55 95 C55 95 86 62 86 41 C86 24 72 10 55 10Z"
        fill="url(#pinGrad)"
      />

      {/* Pin inner circle */}
      <Circle cx="55" cy="40" r="18" fill="#0F0E17" opacity={0.85} />

      {/* Fork & knife inside pin */}
      <G transform="translate(44, 29)">
        <Rect x="2" y="0" width="2" height="9" rx="1" fill="white" />
        <Rect x="5.5" y="0" width="2" height="9" rx="1" fill="white" />
        <Rect x="9" y="0" width="2" height="9" rx="1" fill="white" />
        <Rect x="5" y="9" width="3" height="13" rx="1.5" fill="white" />
        <Path
          d="M15 0 C15 0 19 2 19 8 L19 22 L17 22 L17 8 C17 4 15 2 15 0Z"
          fill="rgba(255,255,255,0.7)"
        />
      </G>

      {/* Translation bubble */}
      <G transform="translate(69, 5)">
        <Rect x="0" y="0" width="22" height="16" rx="8" fill="url(#bubbleGrad)" />
        <Path d="M6 16 L3 20 L12 16Z" fill="url(#bubbleGrad)" />
        <SvgText
          x="11" y="12"
          fontFamily="Georgia, serif"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          fill="white"
        >
          文
        </SvgText>
      </G>
    </Svg>
  );
}

export function Logo({ size = 'medium', showText = true, showTagline = false, dark = false }: LogoProps) {
  const s = SIZES[size];

  return (
    <View style={styles.container}>
      <LogoIcon size={s.icon} />
      {showText && (
        <View style={styles.textRow}>
          <Text style={[dark ? styles.appNameDark : styles.appNameWhite, { fontSize: s.fontSize }]}>Help My </Text>
          <Text style={[styles.appNameOrange, { fontSize: s.fontSize }]}>Travel</Text>
        </View>
      )}
      {showTagline && (
        <Text style={[dark ? styles.taglineDark : styles.tagline, { fontSize: s.tagline }]}>MENUS TRANSLATED. EVERYWHERE.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  appNameWhite: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  appNameDark: {
    color: '#222222',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  appNameOrange: {
    color: '#FF6B35',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5,
    marginTop: 6,
    fontWeight: '400',
  },
  taglineDark: {
    color: '#717171',
    letterSpacing: 1.5,
    marginTop: 6,
    fontWeight: '400',
  },
});
