import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

const CustomMapMarker = () => (
  <View style={styles.container}>
    {/* Shadow */}
    <Ellipse
      cx={20}
      cy={38}
      rx={10}
      ry={4}
      fill="#000"
      opacity={0.18}
      style={{ position: 'absolute', zIndex: 0 }}
    />
    {/* Pin */}
    <Svg width={40} height={40} viewBox="0 0 40 40">
      <Path
        d="M20 4C13.373 4 8 9.373 8 16c0 7.732 10.25 18.25 11.25 19.25a1 1 0 0 0 1.5 0C21.75 34.25 32 23.732 32 16c0-6.627-5.373-12-12-12zm0 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
        fill="#2563eb"
        stroke="#1e40af"
        strokeWidth={1.2}
      />
      <Circle cx={20} cy={16} r={3} fill="#fff" />
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 44,
  },
});

export default CustomMapMarker; 