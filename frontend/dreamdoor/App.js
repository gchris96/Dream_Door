import {
  Text,
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';

export default function App() {
  const [houses, setHouses] = useState([]);
  const [index, setIndex] = useState(0);

  const position = useRef(new Animated.ValueXY()).current;
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    fetch('http://127.0.0.1:8000/houses/')
      .then(res => res.json())
      .then(data => setHouses(data))
      .catch(err => console.error('API error:', err));
  }, []);

  const swipeOffScreen = (direction) => {
    Animated.timing(position, {
      toValue: {
        x: direction === 'right' ? screenWidth : -screenWidth,
        y: 0,
      },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setIndex(prev => prev + 1);
    });
  };

const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,

    onPanResponderMove: Animated.event(
      [null, { dx: position.x, dy: position.y }],
      { useNativeDriver: false }
    ),

    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 120) {
        swipeOffScreen('right');
      } else if (gesture.dx < -120) {
        swipeOffScreen('left');
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      }
    },
  })
).current;


  if (!houses.length || index >= houses.length) {
    return (
      <View style={[styles.container, styles.center]}>
      <Text style={styles.endText}>
        you've reached the end
        </Text>
      </View>
    );
  }

  const house = houses[index];

  return (
    <View style={styles.container}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
            ],
          },
        ]}
      >
        <Image
          source={{ uri: house.image_url}}
          style={styles.image}
          contentFit="cover"
        />

        <Text style={styles.price}>
          ${house.price.toLocaleString()}
        </Text>

        <Text style={styles.address}>
          {house.address}
        </Text>
        <Text style={styles.description}>
          {house.description}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 150,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: '#eee',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  address: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  description: {
  fontSize: 14,
  color: '#666',
  textAlign: 'center',
  marginTop: 8,
},
center: {
  justifyContent: 'center',
  alignItems: 'center',
},
endText: {
  textAlign: 'center',
  color: '#666',
  fontSize: 16,
}
});
