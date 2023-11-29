import React, { useState, useEffect } from 'react';
import {
  View, Text, Button, FlatList, StyleSheet,
  Alert, TextInput, TouchableOpacity
} from 'react-native';
import { Card } from '@rneui/themed';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStop, faMicrophone, faPlay, faPause, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function AudioRecorder() {
  const [recordings, setRecordings] = useState([]);
  const [recording, setRecording] = useState(null);
  const [audioTitle, setAudioTitle] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    getSavedAudios();
  }, []);

  const getSavedAudios = async () => {
    try {
      const savedRecordings = await AsyncStorage.getItem('recordings');
      if (savedRecordings !== null) {
        setRecordings(JSON.parse(savedRecordings));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();

      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
        );
        setRecording(recording);
      } else {
        setMessage("Please grant permission to app to access microphone");
        setErrorMessage(message);
      }

    } catch (error) {
      console.log("Failed to start recording", error);
    }
  };

  async function stopRecording() {
    try {
      await recording.stopAndUnloadAsync();

      await Audio.setAudioModeAsync(
        {
          allowsRecordingIOS: false,
        }
      )

      let recordingsArray = [...recordings];
      const { sound, status } = await recording.createNewLoadedSoundAsync();

      const newRecording = {
        id: Date.now().toString(),
        title: audioTitle,
        sound: sound,
        file: recording.getURI(),
        duration: getDurationFormatted(status.durationMillis)
      };
      recordingsArray.push(newRecording);
      setRecordings(recordingsArray);
      setRecording(undefined);
      setAudioTitle('');

      await saveRecordings([...recordings, {
        sound: recording.getURI(),
        duration: getDurationFormatted(status.durationMillis),
        file: recording.getURI(),
      }]);

    } catch (error) {
      console.log(error);
      setErrorMessage("Failed to save. Record audio first!");
    }
  };

  async function saveRecordings(recordings) {
    try {
      await AsyncStorage.setItem('recordings', JSON.stringify(recordings));
      Alert.alert('Success', 'Audio Saved.', [{ text: 'OK' }]);
    } catch (err) {
      console.log('Error saving recordings', err)
      Alert.alert('Error', 'Failed to save audio!, Stop Recording First!', [{ text: 'OK' }]);
    }
  }

  function getDurationFormatted(millis) {
    const minutes = millis / 1000 / 60;
    const minutesDisplay = Math.floor(minutes);
    const seconds = Math.round((minutes - minutesDisplay) * 60);
    const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutesDisplay}:${secondsDisplay}`;
  }

  const updateAudioTitle = async (id, newTitle) => {
    try {
      const savedRecordings = await AsyncStorage.getItem('recordings');
      if (savedRecordings !== null) {
        const recordingsArray = JSON.parse(savedRecordings);
        const updatedRecordings = recordingsArray.map((recording) => {
          if (recording.id === id) {
            return { ...recording, title: newTitle };
          }
          return recording;
        });
        await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));
        setRecordings(updatedRecordings);
      }
      Alert.alert('Success', 'Audio Title Updated.', [{ text: 'OK' }]);

    } catch (error) {
      console.log(error);
    }
  };

  const deleteRecording = async (id) => {
    try {
      const savedRecordings = await AsyncStorage.getItem('recordings');
      if (savedRecordings !== null) {
        const recordingsArray = JSON.parse(savedRecordings);
        const updatedRecordings = recordingsArray.filter((recording) => recording.id !== id);
        await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));
        setRecordings(updatedRecordings);
      }
      Alert.alert('Success', 'Audio Deleted...', [{ text: 'OK' }]);
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to delete audio!', [{ text: 'OK' }]);
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.recordingItem}>
      <TouchableOpacity onPress={() => {
        if (item.isPlaying) {
          item.sound.pauseAsync();
        } else {
          item.sound.replayAsync();
        }
      }}>
        <FontAwesomeIcon icon={item.isPlaying ? faPause : faPlay} size={30} color="#000080" />
      </TouchableOpacity>

      {editId === item.id ? (
        <>
          <TextInput
            style={styles.inputEdit}
            value={editTitle}
            onChangeText={setEditTitle}
            onBlur={() => updateAudioTitle(item.id, editTitle)}
          />
          <Button
            style={styles.button}
            title="Save Changes"
            onPress={() => updateAudioTitle(item.id, editTitle)}
          />
        </>
      ) : (
        <>
          <Text style={styles.recordingText}>Audio {index + 1} - </Text>
          <Text style={styles.recordingText}>{item.title} - {item.duration}</Text>
          <FontAwesomeIcon
            icon={faEdit}
            size={30}
            color='#000080'
            onPress={() => {
              setEditId(item.id);
              setEditTitle(item.title);
            }}
          />
          <FontAwesomeIcon
            icon={faTrash}
            size={30}
            color='#000080'
            onPress={() => deleteRecording(item.id)}
          />
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Audio Recorder</Text>

      <Card containerStyle={styles.card}>
        <Card.Title>RECORD AUDIO</Card.Title>
        <Card.Divider />
        <Text>{errorMessage}</Text>
        {recording ? (
          <TouchableOpacity onPress={stopRecording}>
            <FontAwesomeIcon icon={faStop} size={30} color="red" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={startRecording}>
            <FontAwesomeIcon icon={faMicrophone} size={30} color="black" />
          </TouchableOpacity>
        )}
        {recording && <Text>Recording...</Text>}
        <TextInput
          style={styles.inputs}
          placeholder="Enter Audio Title"
          value={audioTitle}
          onChangeText={(text) => setAudioTitle(text)}
        />
        <Button
          style={styles.button}
          title="Save Recording"
          onPress={stopRecording}
        />
      </Card>

      <Card containerStyle={styles.card}>
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#191970',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#ffffff',
  },
  card: {
    marginTop: 15,
    marginBottom: 15,
    height: 280,
    width: 300,
    backgroundColor: '#87ceeb',
    borderRadius: 10,
  },
  inputs: {
    width: 250,
    height: 30,
    backgroundColor: '#fffafa',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 20,
    marginBottom: 20,
  },
  inputEdit: {
    width: 100,
    height: 30,
    backgroundColor: '#fffafa',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 20,
    marginBottom: 20,
  },
  recordingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  recordingText: {
    color: '#000080',
  },
});

