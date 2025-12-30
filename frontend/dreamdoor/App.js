import { Text, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';

export default function App() {
  const [house, setHouse] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/houses/')
      .then(response => response.json())
      .then(data => {
        setHouse(data[0]);
      })
      .catch(error => {
        console.error('API error:', error);
      });
  }, []);

  if (!house) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 👇 THIS IS WHERE <Image /> GOES */}
      <Image
        // source={house.image_urls[0]}
        source="https://picsum.photos/800/600"
        style={styles.image}
        contentFit="cover"
      />

      <Text style={styles.price}>
        ${house.price.toLocaleString()}
      </Text>

      <Text style={styles.address}>
        {house.address}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
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
});
