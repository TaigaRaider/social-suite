import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import api from '../api';

export default function SearchScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('posts');
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    try {
      const data = await api.getTrending();
      setTrending(data.posts || data.data || data || []);
    } catch (e) {}
  };

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      if (tab === 'posts') {
        const data = await api.searchPosts(query.trim());
        setResults(data.posts || data.data || data || []);
      } else {
        const data = await api.searchUsers(query.trim());
        setResults(data.users || data.data || data || []);
      }
    } catch (e) {}
    setLoading(false);
  }, [query, tab]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (searched) {
      doSearch();
    }
  };

  const goToProfile = (username) => {
    navigation.navigate('Profile', { username });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={doSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'posts' && styles.tabActive]}
          onPress={() => handleTabChange('posts')}
        >
          <Text style={[styles.tabText, tab === 'posts' && styles.tabTextActive]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'users' && styles.tabActive]}
          onPress={() => handleTabChange('users')}
        >
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>
            People
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#777" style={{ marginTop: 40 }} />
      ) : searched ? (
        tab === 'users' ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => goToProfile(item.username)}
              >
                <Avatar name={item.name || item.displayName} size={44} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.name || item.displayName}
                  </Text>
                  <Text style={styles.userUsername}>@{item.username}</Text>
                  {item.bio ? (
                    <Text style={styles.userBio} numberOfLines={2}>
                      {item.bio}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <PostCard post={item} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results</Text>
              </View>
            }
          />
        )
      ) : (
        <FlatList
          data={trending}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <PostCard post={item} />}
          ListHeaderComponent={
            trending.length > 0 ? (
              <Text style={styles.sectionTitle}>Trending</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Search for posts or people</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  searchBar: {
    padding: 12,
  },
  searchInput: {
    height: 44,
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#363636',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  tabText: {
    color: '#777',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  userUsername: {
    color: '#777',
    fontSize: 14,
  },
  userBio: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 15,
  },
});
