import { useInfiniteQuery } from '@tanstack/react-query';
import { NPool, NRelay1 } from '@nostrify/nostrify';
import type { NostrEvent } from '@nostrify/nostrify';

// Validator function for NIP-68 image events (more lenient)
function validateImageEvent(event: NostrEvent): boolean {
  // Check if it's a picture event kind
  if (event.kind !== 20) return false;

  // Check for required tags according to NIP-68 (be more lenient)
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  const imeta = event.tags.find(([name]) => name === 'imeta');

  // Picture events should have 'title' and 'imeta' tag, but be more forgiving
  if (!title && !imeta) {
    // If neither title nor imeta, reject
    return false;
  }

  // If we have imeta, do basic validation
  if (imeta && imeta[1] && !imeta[1].includes('url')) {
    return false;
  }

  return true;
}

// Shared discovery pool to avoid creating multiple connections
let sharedDiscoveryPool: NPool | null = null;

function getDiscoveryPool(): NPool {
  if (!sharedDiscoveryPool) {
    const discoveryRelays = [
      'wss://relay.nostr.band',
      'wss://relay.primal.net', 
      'wss://relay.olas.app',
      'wss://nos.lol',
      'wss://relay.snort.social',
      'wss://purplepag.es'
    ];
    
    sharedDiscoveryPool = new NPool({
      open(url: string) {
        console.log('Discovery pool connecting to relay:', url);
        return new NRelay1(url);
      },
      reqRouter: (filters) => {
        const relayMap = new Map<string, typeof filters>();
        // Use fewer relays to reduce connection load
        for (const url of discoveryRelays) {
          relayMap.set(url, filters);
        }
        console.log('User image posts using shared discovery pool with relays:', [...relayMap.keys()]);
        return relayMap;
      },
      eventRouter: () => discoveryRelays.slice(0, 3),
    });
  }
  return sharedDiscoveryPool;
}

export function useUserImagePosts(pubkey: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['user-image-posts', pubkey],
    queryFn: async ({ pageParam, signal }) => {
      if (!pubkey) {
        return { events: [], nextCursor: undefined };
      }

      const querySignal = AbortSignal.any([signal, AbortSignal.timeout(10000)]);
      
      const discoveryPool = getDiscoveryPool();
      
      console.log('Querying user image posts for pubkey:', pubkey.slice(0, 8), pageParam ? `until ${pageParam}` : 'initial');
      
      try {
        const filter: { kinds: number[]; authors: string[]; limit: number; until?: number } = { 
          kinds: [20], 
          authors: [pubkey],
          limit: 15 // Smaller initial page size for faster loading
        };

        // Add pagination using 'until' timestamp
        if (pageParam) {
          filter.until = pageParam;
        }

        const events = await discoveryPool.query([filter], { signal: querySignal });
        
        console.log('User image posts raw events received:', events.length);
        
        const validEvents = events.filter(validateImageEvent);
        console.log('User image posts valid events:', validEvents.length);
        
        // Deduplicate by event ID to prevent duplicates from multiple relays
        const uniqueEvents = validEvents.reduce((acc, event) => {
          if (!acc.find(e => e.id === event.id)) {
            acc.push(event);
          }
          return acc;
        }, [] as NostrEvent[]);
        
        console.log('User image posts unique events:', uniqueEvents.length);
        
        const sortedEvents = uniqueEvents.sort((a, b) => b.created_at - a.created_at);
        
        return {
          events: sortedEvents,
          // Stop only when we get fewer raw events than the limit we requested
          nextCursor: events.length < filter.limit ? undefined : sortedEvents[sortedEvents.length - 1]?.created_at,
        };
      } catch (error) {
        console.error('Error querying user image posts:', error);
        throw error;
      }
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!pubkey,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}